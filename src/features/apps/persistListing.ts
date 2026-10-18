import { PROMPT_LIBRARY } from '@/data/prompts';
import {
  setListingMedia,
  setListingPrompts,
  updateListing,
  type NewListing,
} from '@/data/repo/listings';
import type { MediaItem, OwnedApp } from '@/data/types';
import { isServerId, publicUrl } from '@/lib/supabase';

import { toListingPatch } from './mapListing';
import { uploadShots } from './uploadShots';

/** The edit sheets hand back prompt labels, not ids, so this maps them back. */
function promptIdFor(label: string): string | null {
  return PROMPT_LIBRARY.find((prompt) => prompt.label === label)?.id ?? null;
}

/** Recovers the storage path from a public URL, for media already uploaded. */
function storagePathOf(uri: string): string | null {
  const prefix = publicUrl('listing-media', '');
  return uri.startsWith(prefix) ? decodeURIComponent(uri.slice(prefix.length)) : null;
}

async function toMediaRows(
  ownerId: string,
  media: MediaItem[],
): Promise<NewListing['media']> {
  const rows: NewListing['media'] = [];
  const pending: { index: number; item: MediaItem }[] = [];

  media.forEach((item, index) => {
    const existing = item.uri ? storagePathOf(item.uri) : null;

    if (existing) {
      rows[index] = {
        label: item.label,
        kind: item.video ? 'video' : 'image',
        storagePath: existing,
      };
      return;
    }

    // A slot with a local uri still needs uploading; one with no uri at all is
    // a label the owner added without picking a file, which cannot be stored.
    if (item.uri) pending.push({ index, item });
  });

  if (pending.length) {
    const uploaded = await uploadShots(
      ownerId,
      pending.map(({ item }) => ({
        uri: item.uri!,
        kind: item.video ? ('video' as const) : ('image' as const),
        label: item.label,
      })),
    );

    uploaded.forEach((row, at) => {
      if (row) rows[pending[at].index] = row;
    });
  }

  return rows.filter(Boolean);
}

/**
 * Writes an owner's edit to the server. The store is updated separately and
 * first, so the UI stays instant; this is what makes the change outlive the
 * install. Mock listings have no server row and are skipped.
 */
export async function persistListing(
  ownerId: string | null,
  appId: string,
  patch: Partial<OwnedApp>,
): Promise<void> {
  if (!ownerId || !isServerId(appId)) return;

  const columns = toListingPatch(patch);
  if (Object.keys(columns).length) await updateListing(appId, columns);

  if (patch.prompts) {
    await setListingPrompts(
      appId,
      patch.prompts
        .map(([label, answer]) => ({ promptId: promptIdFor(label), answer }))
        .filter((entry): entry is { promptId: string; answer: string } => !!entry.promptId),
    );
  }

  if (patch.media) {
    await setListingMedia(appId, await toMediaRows(ownerId, patch.media));
  }
}
