import { createClient } from '@/lib/supabase/client';

export type ChatAttachment = {
  storage_path: string;
  kind: 'image' | 'video';
  label: string;
};

function extensionOf(file: File, kind: 'image' | 'video') {
  const match = /\.([a-z0-9]+)$/i.exec(file.name);
  if (match) return match[1].toLowerCase();
  if (file.type.includes('png')) return 'png';
  if (file.type.includes('webp')) return 'webp';
  if (file.type.includes('webm')) return 'webm';
  if (file.type.includes('quicktime') || file.type.includes('mov')) return 'mov';
  return kind === 'video' ? 'mp4' : 'jpg';
}

export async function uploadChatFiles(userId: string, files: File[], prefix = 'chat'): Promise<ChatAttachment[]> {
  if (!files.length) return [];
  const db = createClient();
  const uploads = await Promise.all(
    files.map(async (file, index): Promise<ChatAttachment | null> => {
      const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      const extension = extensionOf(file, kind);
      const path = `${userId}/${Date.now().toString(36)}/${prefix}-${index}.${extension}`;
      const { error } = await db.storage.from('listing-media').upload(path, file, {
        contentType: file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
        upsert: true,
      });
      if (error) return null;
      return { storage_path: path, kind, label: file.name };
    }),
  );
  return uploads.filter((item): item is ChatAttachment => item !== null);
}
