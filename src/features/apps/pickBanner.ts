import * as ImagePicker from 'expo-image-picker';

/** Matches the listing banner frame. iOS ImagePicker cannot enforce this. */
export const BANNER_RATIO = 2.2 / 1;
export const BANNER_ASPECT = [11, 5] as const;
export const BANNER_WIDTH = 1584;
export const BANNER_HEIGHT = 720;

/**
 * Picks a photo only. Crop and reposition happen in BannerCrop, because the
 * system editor ignores aspect on iOS and does not match the banner frame.
 */
export async function pickBanner(): Promise<{ uri: string } | { error: string } | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Allow photo access in Settings to add a banner' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return null;
    const uri = result.assets[0]?.uri;
    return uri ? { uri } : null;
  } catch {
    return { error: 'Could not open your photos. Try again.' };
  }
}
