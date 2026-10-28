import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import type { PickedShot } from '@/data/types';

/** Media slots per listing, the same ten the App Store allows. */
export const MAX_SHOTS = 10;

/** Demo videos in the first screenshot slot, matching the listing-media bucket. */
export const MAX_DEMO_VIDEO_BYTES = 500 * 1024 * 1024;

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

function sizeOf(asset: ImagePicker.ImagePickerAsset): number {
  if (typeof asset.fileSize === 'number' && asset.fileSize > 0) return asset.fileSize;
  try {
    return new File(asset.uri).size || 0;
  } catch {
    return 0;
  }
}

function demoLabel(durationMs?: number | null): string {
  if (durationMs == null || durationMs <= 0) return 'Demo video';
  const total = Math.round(durationMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `Demo video · ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Editor-only: a screen recording from Photos, no duration cap, 500 MB max.
 * Callers insert it at the first screenshot slot; the owner can still reorder.
 */
export async function pickDemoVideo(): Promise<
  { shot: PickedShot } | { error: string } | { shot: null }
> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Allow photo access in Settings to add a demo video' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      selectionLimit: 1,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    });

    if (result.canceled) return { shot: null };

    const asset = result.assets[0];
    if (!asset || asset.type !== 'video') {
      return { error: 'Pick a screen recording from your photos' };
    }

    const bytes = sizeOf(asset);
    if (bytes > MAX_DEMO_VIDEO_BYTES) {
      return { error: 'Demo videos can be up to 500 MB' };
    }

    return {
      shot: {
        uri: asset.uri,
        kind: 'video',
        label: demoLabel(asset.duration),
      },
    };
  } catch {
    return { error: 'Could not open your videos. Try again.' };
  }
}
