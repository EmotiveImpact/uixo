import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isConfigured } from './_lib/db.js';
import { json, methodNotAllowed, requireUser } from './_lib/http.js';
import { readUserAssetSaves, writeUserAssetSaves } from './_lib/user-asset-saves.js';
import { ensureAppUser } from './_lib/user-lists.js';

/** Account-owned asset favourites, kept separate from website lists by type. */
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
    return json(res, 200, await readUserAssetSaves(userId));
  }

  if (req.method === 'PUT') {
    const revision = req.body?.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) {
      return json(res, 400, { error: 'A non-negative revision is required.' });
    }
    const result = await writeUserAssetSaves(userId, req.body?.assetIds, revision);
    if (!result) return json(res, 400, { error: 'An assetIds array is required.' });
    if (!result.ok) {
      return json(res, 409, {
        error: 'Saved assets changed on another device. Refreshing the latest version.',
        ...result.snapshot,
      });
    }
    return json(res, 200, result.snapshot);
  }

  return methodNotAllowed(res, ['GET', 'PUT']);
}
