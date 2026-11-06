import { getSupabase, isServerId } from '@/lib/supabase';

export type ListingCooldown = {
  listingId: string;
  viewsToday: number;
  resetsAt: string;
};

export type ListingInsights = {
  periodDays: number;
  views: number;
  likes: number;
  skips: number;
  fit: {
    interests: number;
    age: number;
    gender: number;
    overall: number;
  };
  likedElement: string;
  scrollDepth: number;
  pitchSeconds: number;
  pitchWatches: number;
  pitchAvgSeconds: number;
  pitchCompletion: number;
};

export async function fetchListingCooldowns(): Promise<ListingCooldown[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db.rpc('my_listing_cooldowns');
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    listingId: String((row as { listing_id?: string }).listing_id ?? ''),
    viewsToday: Number((row as { views_today?: number }).views_today ?? 0),
    resetsAt: String((row as { resets_at?: string }).resets_at ?? ''),
  }));
}

export async function fetchListingInsights(
  appId: string,
  days: number | 'all' = 'all',
): Promise<ListingInsights | null> {
  const db = getSupabase();
  if (!db || !isServerId(appId)) return null;
  const { data, error } = await db.rpc('my_listing_insights', {
    p_app_id: appId,
    p_days: days === 'all' ? 3650 : days,
  });
  if (error || !data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const fit = (row.fit ?? {}) as Record<string, unknown>;
  return {
    periodDays: Number(row.period_days ?? days),
    views: Number(row.views ?? 0),
    likes: Number(row.likes ?? 0),
    skips: Number(row.skips ?? 0),
    fit: {
      interests: Number(fit.interests ?? 0),
      age: Number(fit.age ?? 0),
      gender: Number(fit.gender ?? 0),
      overall: Number(fit.overall ?? 0),
    },
    likedElement: String(row.liked_element ?? 'Not enough data yet'),
    scrollDepth: Number(row.scroll_depth ?? 0),
    pitchSeconds: Number(row.pitch_seconds ?? 0),
    pitchWatches: Number(row.pitch_watches ?? 0),
    pitchAvgSeconds: Number(row.pitch_avg_seconds ?? 0),
    pitchCompletion: Number(row.pitch_completion ?? 0),
  };
}

export async function recordListingScroll(listingId: string, depth: number): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(listingId)) return;
  await db.rpc('record_listing_scroll', {
    p_listing_id: listingId,
    p_depth: Math.max(0, Math.min(1, depth)),
  });
}

export async function recordHeySource(listingId: string, source: string): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(listingId)) return;
  await db.rpc('record_hey_source', { p_listing_id: listingId, p_source: source });
}

export async function recordPitchWatch(
  listingId: string,
  watchedSeconds: number,
  durationSeconds: number,
): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(listingId) || watchedSeconds < 0.5) return;
  await db.rpc('record_pitch_watch', {
    p_listing_id: listingId,
    p_watched: Math.round(watchedSeconds * 10) / 10,
    p_duration: Math.round(Math.max(0, durationSeconds) * 10) / 10,
  });
}
