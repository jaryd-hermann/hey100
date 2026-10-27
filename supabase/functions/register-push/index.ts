/**
 * Attaches this phone's APNs/FCM token to the signed-in user in OneSignal.
 * The native OneSignal TurboModule does not load in our old-architecture
 * store binary, so the client asks iOS via expo-notifications and we
 * register the token here with the REST API.
 */

import { CORS, env, json } from '../_shared/push.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type Body = {
  token?: unknown;
  platform?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'auth' }, 401);

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return json({ error: 'auth' }, 401);

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'body' }, 400);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (token.length < 16) return json({ error: 'token' }, 400);

  const type = body.platform === 'android' ? 'AndroidPush' : 'iOSPush';
  const appId = env('ONESIGNAL_APP_ID');
  const apiKey = env('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return json({ error: 'onesignal_unconfigured' }, 500);

  const headers = {
    Authorization: `Key ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  };

  const created = await fetch(`https://api.onesignal.com/apps/${appId}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      identity: { external_id: data.user.id },
      subscriptions: [{ type, token, enabled: true }],
    }),
  });

  if (created.ok) return json({ ok: true });

  const attached = await fetch(
    `https://api.onesignal.com/apps/${appId}/users/by/external_id/${data.user.id}/subscriptions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ subscription: { type, token, enabled: true } }),
    },
  );

  if (attached.ok) return json({ ok: true });

  const detail = `${created.status}:${(await created.text()).slice(0, 120)} ${attached.status}:${(await attached.text()).slice(0, 120)}`;
  return json({ error: `onesignal_${detail}` }, 502);
});
