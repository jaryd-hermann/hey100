/**
 * In-app account deletion (Apple 5.1.1(v)). Reachable from Settings, the
 * paywall menu and onboarding, so nobody has to pay to leave.
 *
 * Order matters: storage SQL can't delete objects, so collect media paths
 * while the rows still point at them, wipe message bodies, remove files,
 * then delete the auth user (every other row cascades or goes null).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { CORS, admin, env, json } from '../_shared/push.ts';

const PUBLIC_FOLDERS = ['avatars', 'product-icons'] as const;

async function removeFolder(db: ReturnType<typeof admin>, bucket: string, folder: string) {
  const { data } = await db.storage.from(bucket).list(folder, { limit: 1000 });
  const paths = (data ?? []).map((item) => `${folder}/${item.name}`);
  if (paths.length) await db.storage.from(bucket).remove(paths);
}

async function removePaths(db: ReturnType<typeof admin>, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    await db.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'auth' }, 401);

  const userClient = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: who, error: whoError } = await userClient.auth.getUser(jwt);
  if (whoError || !who.user) return json({ error: 'auth' }, 401);
  const userId = who.user.id;

  const db = admin();

  try {
    const { data: scrubbed, error: scrubError } = await db.rpc('admin_scrub_user_content', { p_user: userId });
    if (scrubError) throw scrubError;
    const paths = (scrubbed ?? {}) as { message_media?: string[]; dm_media?: string[] };

    await removePaths(db, 'message-media', paths.message_media ?? []);
    await removePaths(db, 'dm-media', paths.dm_media ?? []);
    for (const bucket of PUBLIC_FOLDERS) await removeFolder(db, bucket, userId);

    const { error: deleteError } = await db.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return json({ status: 'deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'delete_failed';
    console.error('[delete-account]', userId, message);
    return json({ error: message }, 500);
  }
});
