/**
 * Signed-in client → RevenueCat REST → profiles.plan.
 *
 * The webhook is the normal path, but a purchase must not depend on it
 * arriving. The phone calls this after a purchase or restore; the answer comes
 * from RevenueCat, never from the request, so a client cannot grant itself Pro.
 *
 * Needs REVENUECAT_SECRET_KEY: a v1 secret API key (sk_…) from the Hey100
 * RevenueCat project.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PRO_PRODUCT_ID = 'hey100_pro_monthly';

type Grant = { expires_date?: string | null; grace_period_expires_date?: string | null };

type Subscriber = {
  entitlements?: Record<string, Grant>;
  subscriptions?: Record<string, Grant & { refunded_at?: string | null }>;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

/** Null expiry is a lifetime grant; otherwise the later of expiry and grace. */
function activeUntil(grant: Grant, now: number): { active: boolean; until: string | null } {
  const ends = [grant.expires_date, grant.grace_period_expires_date]
    .filter((value): value is string => !!value)
    .map((value) => Date.parse(value))
    .filter((ms) => Number.isFinite(ms));
  if (!grant.expires_date) return { active: true, until: null };
  const last = Math.max(...ends);
  return { active: last > now, until: new Date(last).toISOString() };
}

/** Hey100 sells one thing, so any live entitlement or the Pro product is Pro. */
function readPro(subscriber: Subscriber): { pro: boolean; until: string | null } {
  const now = Date.now();
  const grants = [
    ...Object.values(subscriber.entitlements ?? {}),
    ...Object.entries(subscriber.subscriptions ?? {})
      .filter(([id, sub]) => id.startsWith(PRO_PRODUCT_ID) && !sub.refunded_at)
      .map(([, sub]) => sub),
  ];

  let pro = false;
  let until: string | null = null;
  let lifetime = false;
  for (const grant of grants) {
    const next = activeUntil(grant, now);
    if (!next.active) continue;
    pro = true;
    if (next.until === null) lifetime = true;
    else if (!until || next.until > until) until = next.until;
  }
  return { pro, until: lifetime ? null : until };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'auth' }, 401);

  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: 'auth' }, 401);
  const userId = auth.user.id;

  const key = env('REVENUECAT_SECRET_KEY');
  if (!key) return json({ error: 'revenuecat_unconfigured' }, 500);

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return json({ error: `revenuecat_${res.status}` }, 502);
  const { subscriber } = (await res.json()) as { subscriber?: Subscriber };
  const { pro, until } = readPro(subscriber ?? {});

  const { data: row, error: readError } = await admin
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (readError || !row) return json({ error: 'profile' }, 500);

  if (pro) {
    const { error } = await admin
      .from('profiles')
      .update({ plan: 'pro', plan_expires_at: until })
      .eq('id', userId);
    if (error) return json({ error: 'update_failed' }, 500);
    return json({ plan: 'pro' });
  }

  // A Pro row with no expiry was granted by hand, not bought, so a lapsed
  // store subscription must not take it away.
  if (row.plan === 'pro' && row.plan_expires_at) {
    const { error } = await admin
      .from('profiles')
      .update({ plan: 'free', plan_expires_at: null })
      .eq('id', userId);
    if (error) return json({ error: 'update_failed' }, 500);
    return json({ plan: 'free' });
  }

  return json({ plan: row.plan });
});
