import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isConfigured } from './_lib/db.js';
import { json, methodNotAllowed, requireUser } from './_lib/http.js';
import { ensureAppUser, readUserLists, writeUserLists } from './_lib/user-lists.js';

/**
 * The signed-in member’s own lists. GET returns them; PUT replaces the snapshot.
 * Nothing here is curator work — every account has Favourites.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isConfigured()) {
    return json(res, 503, { error: 'The database is not configured for this deployment.' });
  }

  const userId = await requireUser(req, res);
  if (!userId) return;

  if (!(await ensureAppUser(userId))) {
    return json(res, 401, { error: 'You need to sign in to do that.' });
  }

  if (req.method === 'GET') {
    return json(res, 200, { lists: await readUserLists(userId) });
  }

  if (req.method === 'PUT') {
    const lists = await writeUserLists(userId, req.body?.lists);
    if (!lists) return json(res, 400, { error: 'A lists array is required.' });
    return json(res, 200, { lists });
  }

  return methodNotAllowed(res, ['GET', 'PUT']);
}
