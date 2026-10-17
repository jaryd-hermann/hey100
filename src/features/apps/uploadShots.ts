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
 * Uploads what the picker gave us and returns the rows the listing needs.
 *
 * Paths start with the owner's id because that first segment is what the
 * storage policy checks, and carry a random segment so a deleted shot's URL
 * cannot be reused to serve a different image.
 *
 * A shot that fails to upload is skipped rather than failing the publish: a
 * listing with four of five screenshots is worth more than no listing.
 */
export async function uploadShots(
  ownerId: string,
  shots: PickedShot[],
): Promise<NewListing['media']> {
  const db = getSupabase();
  if (!db || !shots.length) return [];

  const folder = `${ownerId}/${Date.now().toString(36)}`;

  type Row = NewListing['media'][number];

  const uploads = await Promise.all(
    shots.map(async (shot, index): Promise<Row | null> => {
      try {
        const extension = extensionOf(shot.uri, shot.kind);
        const path = `${folder}/${index}.${extension}`;

        const bytes = await new File(shot.uri).bytes();

        const { error } = await db.storage
          .from('listing-media')
          .upload(path, bytes, { contentType: MIME[extension], upsert: true });

        if (error) return null;

        return { label: shot.label, kind: shot.kind, storagePath: path };
      } catch {
        return null;
      }
    }),
  );

  return uploads.filter((item): item is Row => item !== null);
}
