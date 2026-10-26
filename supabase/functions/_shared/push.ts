import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type OutboxRow = {
  id: string;
  user_id: string;
  event: string;
  collapse_id: string;
  title: string;
  body: string;
  url: string;
  payload: Record<string, unknown>;
  status: string;
};

export type PushProfile = {
  id: string;
  notification_prefs: Record<string, unknown> | null;
  last_active_at: string | null;
  timezone: string | null;
};

export function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

export function admin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function authorized(req: Request): boolean {
  const secret = env('PUSH_DRAIN_SECRET');
  const headerSecret = req.headers.get('x-push-secret') ?? '';
  if (secret && headerSecret === secret) return true;

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return !!token && token === env('SUPABASE_SERVICE_ROLE_KEY');
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

const ENGAGEMENT = new Set(['digest', 'new_group', 'milestones', 'listing_nudge']);

function prefOn(prefs: Record<string, unknown> | null, event: string): boolean {
  if (!prefs) return true;
  const value = prefs[event];
  return value !== false;
}

function minutesNow(timeZone: string | null): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    const now = new Date();
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

function parseHm(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value)) return fallback;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function inQuietHours(prefs: Record<string, unknown> | null, timeZone: string | null): boolean {
  if (!prefs || prefs.quiet_hours === false) return false;
  const start = parseHm(prefs.quiet_start, 22 * 60);
  const end = parseHm(prefs.quiet_end, 8 * 60);
  const now = minutesNow(timeZone);
  return start === end ? false : start < end ? now >= start && now < end : now >= start || now < end;
}

function nextQuietEndIso(prefs: Record<string, unknown> | null, timeZone: string | null): string {
  const end = typeof prefs?.quiet_end === 'string' ? prefs.quiet_end : '08:00';
  const [hours, minutes] = end.split(':').map(Number);
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: timeZone || 'UTC' }));
  const target = new Date(local);
  target.setHours(hours, minutes, 0, 0);
  if (target <= local) target.setDate(target.getDate() + 1);
  const delta = target.getTime() - local.getTime();
  return new Date(Date.now() + delta).toISOString();
}

export function decideSend(
  row: OutboxRow,
  profile: PushProfile | null,
): { action: 'send' | 'skip' | 'delay'; reason?: string; sendAfter?: string } {
  if (!profile) return { action: 'skip', reason: 'no_profile' };
  if (!prefOn(profile.notification_prefs, row.event)) {
    return { action: 'skip', reason: 'pref_off' };
  }

  if (profile.last_active_at) {
    const age = Date.now() - new Date(profile.last_active_at).getTime();
    if (age >= 0 && age < 60_000) return { action: 'skip', reason: 'active' };
  }

  if (inQuietHours(profile.notification_prefs, profile.timezone)) {
    if (ENGAGEMENT.has(row.event)) return { action: 'skip', reason: 'quiet_hours' };
    return { action: 'delay', sendAfter: nextQuietEndIso(profile.notification_prefs, profile.timezone) };
  }

  return { action: 'send' };
}

export async function sendOneSignal(row: OutboxRow, sendAfter?: string): Promise<{ ok: boolean; reason?: string }> {
  const appId = env('ONESIGNAL_APP_ID');
  const apiKey = env('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { ok: false, reason: 'onesignal_unconfigured' };

  const body: Record<string, unknown> = {
    app_id: appId,
    target_channel: 'push',
    include_aliases: { external_id: [row.user_id] },
    headings: { en: row.title },
    contents: { en: row.body },
    collapse_id: row.collapse_id.slice(0, 64),
    data: { path: row.url, event: row.event, ...row.payload },
    app_url: `hey100:/${row.url.startsWith('/') ? row.url : `/${row.url}`}`,
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
  };
  if (sendAfter) body.send_after = sendAfter;

  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `onesignal_${res.status}:${text.slice(0, 180)}` };
  }

  const payload = (await res.json()) as { id?: string };
  if (!payload.id) return { ok: false, reason: 'onesignal_no_audience' };
  return { ok: true };
}

export async function drain(db: SupabaseClient, limit = 40): Promise<{ sent: number; skipped: number; failed: number }> {
  const { data, error } = await db.rpc('admin_claim_push_batch', { p_limit: limit });
  if (error) throw error;

  const rows = (Array.isArray(data) ? data : []) as OutboxRow[];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const { data: raw } = await db.rpc('admin_profile_for_push', { p_user_id: row.user_id });
    const profile = (raw ?? null) as PushProfile | null;
    const decision = decideSend(row, profile);

    if (decision.action === 'skip') {
      await db.rpc('admin_mark_push', { p_id: row.id, p_status: 'skipped', p_reason: decision.reason });
      skipped += 1;
      continue;
    }

    const result = await sendOneSignal(row, decision.sendAfter);
    if (result.ok) {
      await db.rpc('admin_mark_push', { p_id: row.id, p_status: 'sent', p_reason: decision.sendAfter ? 'delayed' : null });
      sent += 1;
    } else {
      await db.rpc('admin_mark_push', { p_id: row.id, p_status: 'failed', p_reason: result.reason });
      failed += 1;
    }
  }

  return { sent, skipped, failed };
}
