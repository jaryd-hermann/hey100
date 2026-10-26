/**
 * Hourly planner: your-turn, expiry, digest, new groups, listing nudges,
 * then drain whatever it queued. pg_cron also calls `app.plan_engagement`
 * directly; this is the HTTP twin for the Dashboard scheduler.
 */

import { admin, authorized, CORS, drain, json } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!authorized(req)) return json({ error: 'unauthorized' }, 401);

  const db = admin();

  try {
    const { data, error } = await db.rpc('admin_plan_engagement');
    if (error) throw error;
    const stats = await drain(db);
    return json({ ok: true, planned: data ?? 0, ...stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'plan_failed';
    return json({ error: message }, 500);
  }
});
