import { File } from 'expo-file-system';

import type { NewListing } from '@/data/repo/listings';
import type { PickedShot } from '@/data/types';
import { getSupabase } from '@/lib/supabase';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function extensionOf(uri: string, kind: PickedShot['kind']): string {
  const match = /\.([a-z0-9]+)(?:\?|$)/i.exec(uri);
  const extension = match?.[1].toLowerCase();
  if (extension && MIME[extension]) return extension;
  return kind === 'video' ? 'mp4' : 'jpg';
}

/**
 * Store screenshots arrive as https URLs and picked ones as local files, so
 * both paths end in the same bytes. Keeping them in our own bucket matters:
 * hotlinked store artwork expires and takes the listing's cover with it.
 */
async function bytesOf(uri: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(uri)) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Could not download ${uri}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  return new File(uri).bytes();
}

/**
 * Paths start with the owner's id because that first segment is what the
 * storage policy checks, and carry a random segment so a deleted asset's URL
 * cannot be reused to serve a different image.
 */
export async function uploadAsset(
  ownerId: string,
  uri: string,
  kind: PickedShot['kind'] = 'image',
  name = 'asset',
): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;

  try {
    const extension = extensionOf(uri, kind);
    const path = `${ownerId}/${Date.now().toString(36)}/${name}.${extension}`;

    const { error } = await db.storage
      .from('listing-media')
      .upload(path, await bytesOf(uri), { contentType: MIME[extension], upsert: true });

    return error ? null : path;
  } catch {
    return null;
  }
}

/**
 * Uploads what the picker or the store lookup gave us and returns the rows the
 * listing needs, one per shot and in the same order.
 *
 * A shot that fails to upload comes back as null rather than failing the
 * publish, since a listing with four of five screenshots is worth more than no
 * listing. The hole is kept so callers that place rows by position do not move
 * everything after it into the wrong slot.
 */
export async function uploadShots(
  ownerId: string,
  shots: PickedShot[],
): Promise<(NewListing['media'][number] | null)[]> {
  if (!shots.length) return [];

  type Row = NewListing['media'][number];

  return Promise.all(
    shots.map(async (shot, index): Promise<Row | null> => {
      const path = await uploadAsset(ownerId, shot.uri, shot.kind, `shot-${index}`);
      return path ? { label: shot.label, kind: shot.kind, storagePath: path } : null;
    }),
  );
}
