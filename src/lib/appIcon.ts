import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSource } from 'expo-image';

const KEY = 'hey100.app-icon';

export type AppIconChoice = {
  /** Null is the primary icon baked into the binary. */
  native: string | null;
  label: string;
  source: ImageSource;
  /** Android adaptive background. The artwork is already a full tile. */
  background: string;
};

export const APP_ICONS: AppIconChoice[] = [
  { native: null, label: 'Lime', source: require('../../assets/images/app-icons/lime.png'), background: '#00FF00' },
  { native: 'Navy', label: 'Navy', source: require('../../assets/images/app-icons/navy.png'), background: '#0020A1' },
  { native: 'Yellow', label: 'Yellow', source: require('../../assets/images/app-icons/yellow.png'), background: '#FFFF00' },
  { native: 'White', label: 'White', source: require('../../assets/images/app-icons/white.png'), background: '#FFFFFF' },
  { native: 'Orange', label: 'Orange', source: require('../../assets/images/app-icons/orange.png'), background: '#FF5900' },
  { native: 'Cyan', label: 'Cyan', source: require('../../assets/images/app-icons/cyan.png'), background: '#00FFFF' },
  { native: 'Violet', label: 'Violet', source: require('../../assets/images/app-icons/violet.png'), background: '#7B00FF' },
  { native: 'Red', label: 'Red', source: require('../../assets/images/app-icons/red.png'), background: '#FF0000' },
  { native: 'Magenta', label: 'Magenta', source: require('../../assets/images/app-icons/magenta.png'), background: '#FF00FF' },
  { native: 'Indigo', label: 'Indigo', source: require('../../assets/images/app-icons/indigo.png'), background: '#0000EB' },
  { native: 'Blue', label: 'Blue', source: require('../../assets/images/app-icons/blue.png'), background: '#2E5CFF' },
  { native: 'Ink', label: 'Ink', source: require('../../assets/images/app-icons/ink.png'), background: '#0E100F' },
];

export const DEFAULT_APP_ICON = APP_ICONS[0];

type IconApi = {
  setAlternateAppIcon: (name: string | null) => Promise<string | null>;
  getAppIconName: () => string | null;
};

/** Reads the native module if this binary was built with it. Never imports the
 *  package: that import throws when the current dev client lacks the module. */
function iconApi(): IconApi | null {
  const modules = (globalThis as { expo?: { modules?: Record<string, Partial<IconApi>> } }).expo
    ?.modules;
  const native = modules?.ExpoAlternateAppIcons;
  if (!native?.setAlternateAppIcon || !native.getAppIconName) return null;
  return native as IconApi;
}

export async function savedAppIcon(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored === 'lime' || stored === '') return null;
  if (stored && APP_ICONS.some((icon) => icon.native === stored)) return stored;
  const live = iconApi()?.getAppIconName() ?? null;
  return APP_ICONS.some((icon) => icon.native === live) ? live : null;
}

/** Switches the home-screen icon. The lime tile is the primary icon. */
export async function chooseAppIcon(native: string | null): Promise<void> {
  await AsyncStorage.setItem(KEY, native ?? 'lime');
  const api = iconApi();
  if (!api) throw new Error('A new app build is needed before the home screen icon can change.');
  await api.setAlternateAppIcon(native);
}

/** Applies a saved choice once the binary includes the alternate icons. */
export async function restoreAppIcon(): Promise<void> {
  const api = iconApi();
  if (!api) return;
  const saved = await savedAppIcon();
  if ((api.getAppIconName() ?? null) === saved) return;
  await api.setAlternateAppIcon(saved);
}
