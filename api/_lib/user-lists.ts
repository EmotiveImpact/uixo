import { db } from './db.js';
import { defaultLists, normalizeLists } from '../../src/lib/lists.js';
import type { List } from '../../src/types.js';

/** Copy the Neon Auth row into public.users so lists can keep a real foreign key. */
export async function ensureAppUser(userId: string): Promise<boolean> {
  const sql = db();
  const [authUser] = await sql`
    select id, email, name, role from neon_auth."user" where id = ${userId}::uuid limit 1`;
  if (!authUser) return false;

  const role = authUser.role === 'admin' || authUser.role === 'curator' ? 'curator' : 'member';
  await sql`
    insert into users (id, email, name, role)
    values (
      ${authUser.id}::uuid,
      ${String(authUser.email)},
      ${String(authUser.name)},
      ${role}::user_role
    )
    on conflict (id) do update
    set email = excluded.email, name = excluded.name, role = excluded.role`;
  return true;
}

export async function readUserLists(userId: string): Promise<List[]> {
  const sql = db();
  const [row] = await sql`
    select payload from user_lists where user_id = ${userId}::uuid limit 1`;
  if (!row) return defaultLists();
  return normalizeLists(row.payload) ?? defaultLists();
}

export async function writeUserLists(userId: string, input: unknown): Promise<List[] | null> {
  const lists = normalizeLists(input);
  if (!lists) return null;

  const sql = db();
  const wanted = [...new Set(lists.flatMap((list) => list.resourceIds))];
  const known = wanted.length
    ? await sql`select id from resources where id = any(${wanted}::text[])`
    : [];
  const allowed = new Set(known.map((row) => String(row.id)));
  const stored = lists.map((list) => ({
    ...list,
    resourceIds: list.resourceIds.filter((id) => allowed.has(id)),
  }));

  await sql`
    insert into user_lists (user_id, payload, updated_at)
    values (${userId}::uuid, ${JSON.stringify(stored)}::jsonb, now())
    on conflict (user_id) do update
    set payload = excluded.payload, updated_at = excluded.updated_at`;

  return stored;
}
