import { useQuery } from '@tanstack/react-query';

import { MAX_SHOTS } from '@/features/apps/pickShots';
import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase, isServerId } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

import { queryKeys, staleTimes } from './keys';
import type { ListingCard } from './loop';

type Tables = Database['public']['Tables'];

export type AppRow = Tables['apps']['Row'];
export type AppInsert = Tables['apps']['Insert'];
export type AppPatch = Tables['apps']['Update'];
export type MediaRow = Tables['app_media']['Row'];
export type PromptRow = Tables['app_prompts']['Row'];

/** A listing and the two child tables that are always rendered with it. */
export type ListingRow = AppRow & {
  app_media: MediaRow[];
  app_prompts: PromptRow[];
};

/** One round trip: PostgREST embeds the children in the same request. */
const LISTING_SELECT = '*, app_media(*), app_prompts(*)';

export function useMyListings() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.myListings(userId),
    enabled: !!userId,
    staleTime: staleTimes.myListings,
    queryFn: async (): Promise<ListingRow[]> => {
      const db = getSupabase();
      if (!db || !userId) return [];

      const { data, error } = await db
        .from('apps')
        .select(LISTING_SELECT)
        .eq('owner_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ListingRow[];
    },
  });
}

export type NewListing = {
  app: Omit<AppInsert, 'owner_id'>;
  /** Up to five, in slot order. */
  prompts: { promptId: string; answer: string }[];
  /** Up to six, in carousel order. The first is the cover. */
  media: { label?: string; kind: 'image' | 'video'; storagePath: string }[];
};

/**
 * Returns the server id, which becomes the listing's id everywhere in the app.
 * The listing limit and the referral bonus both fire inside the insert, so a
 * rejection here is the free plan talking, not a bug.
 */
export async function createListing(
  ownerId: string,
  { app, prompts, media }: NewListing,
): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from('apps')
    .insert({ ...app, owner_id: ownerId })
    .select('id')
    .single();

  if (error) throw error;

  await Promise.all([setListingPrompts(data.id, prompts), setListingMedia(data.id, media)]);

  return data.id;
}

export async function updateListing(appId: string, patch: AppPatch): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(appId)) return;

  const { error } = await db.from('apps').update(patch).eq('id', appId);
  if (error) throw error;
}

export async function deleteListing(appId: string): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(appId)) return;

  const { error } = await db.from('apps').delete().eq('id', appId);
  if (error) throw error;
}

/**
 * Replaces the whole set rather than diffing it. Prompt answers and shots are
 * small, ordered lists that the user edits as a group, and a delete-then-insert
 * keeps the slot numbers honest without reconciling moves.
 */
export async function setListingPrompts(
  appId: string,
  prompts: NewListing['prompts'],
): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(appId)) return;

  const { error: clearError } = await db.from('app_prompts').delete().eq('app_id', appId);
  if (clearError) throw clearError;

  const rows = prompts
    .filter((entry) => entry.promptId && entry.answer.trim())
    .slice(0, 5)
    .map((entry, slot) => ({
      app_id: appId,
      slot,
      prompt_id: entry.promptId,
      answer: entry.answer.trim().slice(0, 225),
    }));

  if (!rows.length) return;

  const { error } = await db.from('app_prompts').insert(rows);
  if (error) throw error;
}

export async function setListingMedia(appId: string, media: NewListing['media']): Promise<void> {
  const db = getSupabase();
  if (!db || !isServerId(appId)) return;

  const { error: clearError } = await db.from('app_media').delete().eq('app_id', appId);
  if (clearError) throw clearError;

  const rows = media.slice(0, MAX_SHOTS).map((item, position) => ({
    app_id: appId,
    position,
    kind: item.kind,
    storage_path: item.storagePath,
    label: item.label ?? null,
  }));

  if (!rows.length) return;

  const { error } = await db.from('app_media').insert(rows);
  if (error) throw error;
}

/** Public share page. Published listings only; callable while signed out. */
export async function listingBySlug(slug: string): Promise<ListingCard | null> {
  const db = getSupabase();
  if (!db || !slug.trim()) return null;

  const { data, error } = await db.rpc('listing_by_slug', { p_slug: slug.trim() });
  if (error) throw error;
  if (!data) return null;
  return data as ListingCard;
}

/** The free plan allows one listed app. The trigger raises with this hint. */
export function isListingLimitError(error: unknown): boolean {
  const { hint, message } = (error ?? {}) as { hint?: string; message?: string };
  return hint === 'upgrade_required' || !!message?.includes('free account can list one app');
}
