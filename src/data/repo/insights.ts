import { getSupabase, isServerId } from '@/lib/supabase';

export type ListingCooldown = {
  listingId: string;
  viewsToday: number;
  resetsAt: string;
};

export type AudienceSlice = { label: string; pct: number };

export type ListingInsights = {
  periodDays: number;
  views: number;
  likes: number;
  skips: number;
  viewers: number;
  fit: {
    interests: number | null;
    devices: number | null;
    age: number | null;
    gender: number | null;
    overall: number | null;
  };
  likedElement: string;
  scrollDepth: number | null;
  pitchSeconds: number;
  pitchWatches: number;
  pitchAvgSeconds: number | null;
  pitchCompletion: number | null;
  audience: {
    viewers: number;
    interests: AudienceSlice[];
    jobs: AudienceSlice[];
    devices: AudienceSlice[];
  };
  series: {
    views: number[];
    heys: number[];
    skips: number[];
    scroll: number[];
    pitch: number[];
  };
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
  const audience = (row.audience ?? {}) as Record<string, unknown>;
  const series = (row.series ?? {}) as Record<string, unknown>;
  return {
    periodDays: Number(row.period_days ?? days),
    views: Number(row.views ?? 0),
    likes: Number(row.likes ?? 0),
    skips: Number(row.skips ?? 0),
    viewers: Number(row.viewers ?? audience.viewers ?? 0),
    fit: {
      interests: rate(fit.interests),
      devices: rate(fit.devices),
      age: rate(fit.age),
      gender: rate(fit.gender),
      overall: rate(fit.overall),
    },
    likedElement: String(row.liked_element ?? 'Not enough data yet'),
    scrollDepth: rate(row.scroll_depth),
    pitchSeconds: Number(row.pitch_seconds ?? 0),
    pitchWatches: Number(row.pitch_watches ?? 0),
    pitchAvgSeconds: rate(row.pitch_avg_seconds),
    pitchCompletion: rate(row.pitch_completion),
    audience: {
      viewers: Number(audience.viewers ?? 0),
      interests: slices(audience.interests),
      jobs: slices(audience.jobs),
      devices: slices(audience.devices),
    },
    series: {
      views: numbers(series.views),
      heys: numbers(series.heys),
      skips: numbers(series.skips),
      scroll: numbers(series.scroll),
      pitch: numbers(series.pitch),
    },
  };
}

function rate(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

function slices(value: unknown): AudienceSlice[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { label?: unknown; pct?: unknown };
    const label = String(row.label ?? '').trim();
    const pct = Number(row.pct);
    if (!label || !Number.isFinite(pct)) return [];
    return [{ label, pct }];
  });
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
