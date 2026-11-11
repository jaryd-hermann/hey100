import { createClient } from '@/lib/supabase/server';
import type { Counters, Me } from '@/lib/loop';
import { publicAvatarUrl } from '@/lib/site';

export async function loadMe(): Promise<Me | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: apps }, { data: counters }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, photo_url, plan, real_name, job, is_admin, github_commits')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('apps').select('id, name, is_primary').eq('owner_id', user.id).order('created_at'),
    supabase.rpc('my_counters'),
  ]);

  const owned = apps ?? [];
  const primary = owned.find((row) => row.is_primary) ?? owned[0] ?? null;
  const counts = (counters as Counters | null) ?? null;
  const isAdmin = Boolean(profile?.is_admin);
  const karma =
    (counts?.matches ?? 0) * 8 +
    owned.length * 22 +
    (profile?.github_commits && profile.github_commits >= 20 ? 20 : 0) +
    (isAdmin ? 100 : 0);

  return {
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? null,
    realName: profile?.real_name ?? null,
    photoUrl: publicAvatarUrl(profile?.photo_url ?? null),
    job: profile?.job ?? null,
    plan: profile?.plan === 'pro' ? 'pro' : 'free',
    primaryAppId: primary?.id ?? null,
    primaryAppName: primary?.name ?? null,
    counters: counts,
    karma,
    verified: isAdmin || karma >= 100,
    isAdmin,
  };
}
