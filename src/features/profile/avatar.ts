import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

import { getSupabase, publicUrl } from '@/lib/supabase';

/**
 * Picks a square photo. Cropping happens here rather than at render time so
 * every avatar in the app is the same shape whatever the camera roll had.
 */
export async function pickAvatar(): Promise<{ uri: string } | { error: string } | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { error: 'Allow photo access in Settings to add a photo' };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return null;
    return { uri: result.assets[0].uri };
  } catch {
    return { error: 'Could not open your photos. Try again.' };
  }
}

/**
 * Returns the public URL to store on the profile.
 *
 * The path carries a timestamp instead of overwriting one file, because a CDN
 * that has already cached `avatar.jpg` would keep serving the old face.
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;

  const path = `${userId}/${Date.now().toString(36)}.jpg`;

  try {
    const bytes = /^https?:\/\//i.test(uri)
      ? new Uint8Array(await (await fetch(uri)).arrayBuffer())
      : await new File(uri).bytes();

    const { error } = await db.storage
      .from('avatars')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

    return error ? null : publicUrl('avatars', path);
  } catch {
    return null;
  }
}
