import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, isConfigured } from './_lib/db.js';
import { httpUrl, json, methodNotAllowed, requireCurator, text } from './_lib/http.js';

const STATUSES = new Set(['pending', 'approved', 'declined']);

/**
 * POST is public: anyone may suggest a website. GET and PATCH are the moderation side and
 * need the curator token.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isConfigured()) {
    return json(res, 503, { error: 'The database is not configured for this deployment.' });
  }

  const sql = db();

  if (req.method === 'POST') {
    const name = text(req.body?.name, 120);
    const url = httpUrl(req.body?.url);
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';

    if (!name || !url) {
      return json(res, 400, {
        error: 'A name and a valid http(s) URL are required.',
        fields: { name: !name, url: !url },
      });
    }

    // Quietly succeed on a resubmission rather than telling a stranger what we already hold.
    const [existing] = await sql`
      select id from submissions
      where lower(url) = lower(${url}) and status = 'pending' limit 1`;
    if (existing) return json(res, 202, { status: 'pending', duplicate: true });

    const [row] = await sql`
      insert into submissions (name, url, note)
      values (${name}, ${url}, ${note})
      returning id, status, submitted_at`;

    return json(res, 201, { id: row.id, status: row.status, submittedAt: row.submitted_at });
  }

  if (req.method === 'GET') {
    if (!requireCurator(req, res)) return;
    const status = typeof req.query.status === 'string' ? req.query.status : null;

    const rows =
      status && STATUSES.has(status)
        ? await sql`
            select id, name, url, note, status, submitted_at, reviewed_at
            from submissions where status = ${status}
            order by submitted_at desc limit 200`
        : await sql`
            select id, name, url, note, status, submitted_at, reviewed_at
            from submissions order by submitted_at desc limit 200`;

    return json(res, 200, { submissions: rows });
  }

  if (req.method === 'PATCH') {
    if (!requireCurator(req, res)) return;
    const id = text(req.body?.id, 64);
    const status = text(req.body?.status, 16);

    if (!id || !status || !STATUSES.has(status)) {
      return json(res, 400, { error: 'An id and a status of pending, approved or declined.' });
    }

    const [row] = await sql`
      update submissions
      set status = ${status}, reviewed_at = now()
      where id = ${id}::uuid
      returning id, status, reviewed_at`;

    if (!row) return json(res, 404, { error: 'No submission with that id.' });
    return json(res, 200, row);
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
}
