import * as ImageManipulator from 'expo-image-manipulator';
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
    return { uri: await asJpeg(result.assets[0].uri) };
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
    const { error } = await db.storage
      .from('avatars')
      .upload(path, await bytesOf(uri), { contentType: 'image/jpeg', upsert: true });

    return error ? null : publicUrl('avatars', path);
  } catch {
    return null;
  }
}

/** iOS often hands back HEIC; the avatars bucket only accepts jpeg/png/webp. */
async function asJpeg(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

async function bytesOf(uri: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(uri)) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Could not download ${uri}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  try {
    return await new File(uri).bytes();
  } catch {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Could not read ${uri}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
