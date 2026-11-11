/**
 * One transactional note when someone joins the waitlist.
 * Auth is x-welcome-secret. The OneSignal keys already live on this project.
 */

import { CORS, env, json } from '../_shared/push.ts';

const SUBJECT = "You're on the list";
const PREHEADER = "We'll email you when your wave opens.";

function authorized(req: Request): boolean {
  const secret = env('WAITLIST_WELCOME_SECRET');
  const header = req.headers.get('x-welcome-secret') ?? '';
  return !!secret && header === secret;
}

/** Stable UUID so a retried signup does not send a second copy. */
async function idempotencyKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(`hey100-waitlist-welcome:${email}`),
  );
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!authorized(req)) return json({ error: 'unauthorized' }, 401);

  const appId = env('ONESIGNAL_APP_ID');
  const apiKey = env('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return json({ error: 'onesignal_unconfigured' }, 500);

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const to = email?.trim().toLowerCase() ?? '';
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return json({ error: 'email' }, 400);
  }

  const res = await fetch('https://api.onesignal.com/notifications?c=email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      email_to: [to],
      email_subject: SUBJECT,
      email_preheader: PREHEADER,
      email_body:
        '<p>You\'re on the list.</p><p>We\'ll email you when your wave opens.</p><p>— Jaryd</p>',
      include_unsubscribed: true,
      disable_email_click_tracking: true,
      name: 'Waitlist welcome',
      idempotency_key: await idempotencyKey(to),
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as { id?: string; errors?: unknown };
  if (!res.ok || !payload.id) {
    return json({ error: 'send_failed', detail: payload.errors ?? res.status }, 502);
  }
  return json({ ok: true, id: payload.id });
});
