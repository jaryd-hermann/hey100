import * as ImagePicker from 'expo-image-picker';

import type { PickedShot } from '@/data/types';

/** Media slots per listing, the same ten the App Store allows. */
export const MAX_SHOTS = 10;

/**
 * Shared by the onboarding step and the owner's edit sheet, so both honour the
 * same limit and return the same shape. An error message comes back rather than
 * being thrown, since both callers just want to show it in a toast.
 */
export async function pickShots(
  remaining: number,
): Promise<{ shots: PickedShot[] } | { error: string }> {
  if (remaining <= 0) return { shots: [] };

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Allow photo access in Settings to add screenshots' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (result.canceled) return { shots: [] };

    return {
      shots: result.assets.map((asset) => ({
        uri: asset.uri,
        kind: asset.type === 'video' ? ('video' as const) : ('image' as const),
      })),
    };
  } catch {
    return { error: 'Could not open your photos. Try again.' };
  }
}
