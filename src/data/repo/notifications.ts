import { getSupabase } from '@/lib/supabase';

export type NotificationEvent =
  | 'hey'
  | 'match'
  | 'message'
  | 'your_turn'
  | 'feedback'
  | 'group_reply'
  | 'group_reaction'
  | 'group_request'
  | 'group_accepted'
  | 'digest'
  | 'new_group'
  | 'milestones'
  | 'listing_nudge';

export type NotificationPrefs = Record<NotificationEvent, boolean> & {
  quiet_hours: boolean;
  quiet_start: string;
  quiet_end: string;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  hey: true,
  match: true,
  message: true,
  your_turn: true,
  feedback: true,
  group_reply: true,
  group_reaction: true,
  group_request: true,
  group_accepted: true,
  digest: true,
  new_group: true,
  milestones: true,
  listing_nudge: true,
  quiet_hours: true,
  quiet_start: '22:00',
  quiet_end: '08:00',
};

export function prefsFrom(raw: unknown): NotificationPrefs {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    ...DEFAULT_PREFS,
    ...Object.fromEntries(
      Object.entries(DEFAULT_PREFS).map(([key, fallback]) => {
        const value = row[key];
        if (key === 'quiet_start' || key === 'quiet_end') {
          return [key, typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value) ? value : fallback];
        }
        return [key, value === false ? false : value === true ? true : fallback];
      }),
    ),
  } as NotificationPrefs;
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db.from('profiles').update({ notification_prefs: prefs }).eq('id', userId);
  if (error) throw error;
}

export async function touchPresence(timeZone?: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.rpc('touch_presence', timeZone ? { p_timezone: timeZone } : {});
}

export async function recordProfileView(listingId: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.rpc('record_profile_view', { p_listing_id: listingId });
}

export async function myProfileViewCount(): Promise<number> {
  const db = getSupabase();
  if (!db) return 0;
  const { data, error } = await db.rpc('my_profile_view_count');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
