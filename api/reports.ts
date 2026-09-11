import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, isConfigured } from './_lib/db.js';
import { json, methodNotAllowed, requireCurator, text } from './_lib/http.js';

/**
 * A visitor reporting a dead or changed link is the cheapest maintenance signal a
 * directory gets, so POST stays public. Reading and resolving them is curator work.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isConfigured()) {
    return json(res, 503, { error: 'The database is not configured for this deployment.' });
  }

  const sql = db();

  if (req.method === 'POST') {
    const resourceId = text(req.body?.resourceId, 200);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
    if (!resourceId) return json(res, 400, { error: 'A resourceId is required.' });

    const [listing] = await sql`select id from resources where id = ${resourceId}`;
    if (!listing) return json(res, 404, { error: 'No listing with that id.' });

    // A partial unique index keeps one open report per listing; a repeat is not an error.
    const [row] = await sql`
      insert into link_reports (resource_id, reason)
      values (${resourceId}, ${reason})
      on conflict do nothing
      returning id`;

    return json(res, row ? 201 : 202, { recorded: true, duplicate: !row });
  }

  if (req.method === 'GET') {
    if (!(await requireCurator(req, res))) return;
    const rows = await sql`
      select r.id, r.resource_id, r.reason, r.reported_at, r.resolved, res.name, res.url
      from link_reports r
      join resources res on res.id = r.resource_id
      where not r.resolved
      order by r.reported_at desc limit 200`;
    return json(res, 200, { reports: rows });
  }

  if (req.method === 'PATCH') {
    if (!(await requireCurator(req, res))) return;
    const resourceId = text(req.body?.resourceId, 200);
    if (!resourceId) return json(res, 400, { error: 'A resourceId is required.' });

    const [row] = await sql`
      update link_reports set resolved = true, resolved_at = now()
      where resource_id = ${resourceId} and not resolved
      returning id`;

    if (!row) return json(res, 404, { error: 'No open report for that listing.' });
    return json(res, 200, { resolved: true });
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
}
