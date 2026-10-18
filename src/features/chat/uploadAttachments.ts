import type { MediaItem } from '@/data/types';
import { uploadAsset } from '@/features/apps/uploadShots';

/** An attachment as it is stored on the message row. */
export type Attachment = {
  storage_path: string;
  kind: 'image' | 'video';
  label: string;
};

/**
 * Chat attachments go in the same bucket as listing media, under the sender's
 * own folder, which is what the storage policy checks.
 *
 * One that fails to upload is dropped rather than failing the whole message,
 * for the same reason a listing publishes with four of five screenshots.
 */
export async function uploadAttachments(userId: string, media: MediaItem[]): Promise<Attachment[]> {
  if (!media.length) return [];

  const uploads = await Promise.all(
    media.map(async (item, index): Promise<Attachment | null> => {
      if (!item.uri) return null;

      const kind = item.video ? 'video' : 'image';
      const path = await uploadAsset(userId, item.uri, kind, `chat-${index}`);

      return path ? { storage_path: path, kind, label: item.label ?? '' } : null;
    }),
  );

  return uploads.filter((item): item is Attachment => item !== null);
}
