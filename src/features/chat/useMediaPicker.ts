import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';

import type { MediaItem } from '@/data/types';

/** Four attachments is all a bubble can show without shrinking to nothing. */
const SELECTION_LIMIT = 4;

export type PickResult = {
  items: MediaItem[];
  /** The library permission was refused, so the caller can explain why. */
  denied: boolean;
};

function label(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.type !== 'video') return asset.fileName ?? 'Photo';

  const seconds = Math.round((asset.duration ?? 0) / 1000);
  if (!seconds) return 'Video';
  return `Video · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Picks photos and videos from the library as chat attachments. */
export function useMediaPicker(): () => Promise<PickResult> {
  return useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { items: [], denied: true };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: SELECTION_LIMIT,
      quality: 0.85,
    });

    if (result.canceled) return { items: [], denied: false };

    const items: MediaItem[] = result.assets.map((asset) => ({
      label: label(asset),
      video: asset.type === 'video',
      uri: asset.uri,
    }));

    return { items, denied: false };
  }, []);
}
