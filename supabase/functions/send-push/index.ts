/**
 * Drains `app.push_outbox` into OneSignal. Called by pg_net on enqueue, by
 * the minute cron, and by engagement-cron after it plans new jobs.
 *
 * Auth is the service role key or PUSH_DRAIN_SECRET — never a user JWT.
 */

import { admin, authorized, CORS, drain, json } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!authorized(req)) return json({ error: 'unauthorized' }, 401);

  try {
    const stats = await drain(admin());
    return json({ ok: true, ...stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'drain_failed';
    return json({ error: message }, 500);
  }
});
