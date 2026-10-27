import * as Notifications from 'expo-notifications';
import { AppState, Linking, Platform } from 'react-native';

import { config } from '@/lib/config';
import { hasNativeModule } from '@/lib/nativeModule';
import { getSupabase } from '@/lib/supabase';

type ClickEvent = {
  notification: { additionalData?: Record<string, unknown> };
};

type OneSignalModule = {
  OneSignal: {
    initialize: (appId: string) => void;
    login: (userId: string) => void;
    logout: () => void;
    Notifications: {
      requestPermission: (fallbackToSettings: boolean) => Promise<boolean>;
      addEventListener: (event: string, listener: (value: ClickEvent) => void) => void;
      removeEventListener: (event: string, listener: (value: ClickEvent) => void) => void;
    };
    Debug?: { setLogLevel: (level: number) => void };
  };
};

let booted = false;
let clickPath: ((path: string) => void) | null = null;

function native(): OneSignalModule | null {
  if (!config.onesignalAppId) return null;
  if (!hasNativeModule('OneSignal')) return null;
  try {
    return require('react-native-onesignal') as OneSignalModule;
  } catch {
    return null;
  }
}

/** Safe in Expo Go and before a native rebuild: missing binaries become a no-op. */
export function initOneSignal(): void {
  if (booted) return;
  const sdk = native();
  const appId = config.onesignalAppId;
  if (!sdk || !appId) return;

  try {
    sdk.OneSignal.initialize(appId);
    const onClick = (event: ClickEvent) => {
      const path = event.notification.additionalData?.path;
      if (typeof path === 'string' && path.startsWith('/') && clickPath) clickPath(path);
    };
    const onForeground = (event: { preventDefault: () => void }) => {
      if (AppState.currentState === 'active') event.preventDefault();
    };
    sdk.OneSignal.Notifications.addEventListener('click', onClick);
    sdk.OneSignal.Notifications.addEventListener(
      'foregroundWillDisplay',
      onForeground as unknown as (value: ClickEvent) => void,
    );
    booted = true;
  } catch {
    // Native module is in the JS bundle but not in this binary yet.
  }
}

export function loginOneSignal(userId: string): void {
  try {
    native()?.OneSignal.login(userId);
  } catch {
    // Same as init: a stale binary should not crash sign-in.
  }
}

export function logoutOneSignal(): void {
  try {
    native()?.OneSignal.logout();
  } catch {
    // Ignore.
  }
}

export function isPushNativeAvailable(): boolean {
  return native() !== null;
}

export async function requestPushPermission(fallbackToSettings = false): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted || current.status === 'granted';
    if (!granted && current.canAskAgain !== false) {
      const next = await Notifications.requestPermissionsAsync();
      granted = next.granted || next.status === 'granted';
    }

    if (!granted) {
      if (fallbackToSettings) await Linking.openSettings();
      return false;
    }

    const device = await Notifications.getDevicePushTokenAsync();
    const token = typeof device.data === 'string' ? device.data : '';
    if (token) {
      const db = getSupabase();
      if (db) {
        await db.functions.invoke('register-push', {
          body: { token, platform: Platform.OS === 'android' ? 'android' : 'ios' },
        });
      }
    }

    try {
      await native()?.OneSignal.Notifications.requestPermission(false);
    } catch {
      // Store builds with newArch off cannot load the OneSignal TurboModule.
    }

    return true;
  } catch {
    if (fallbackToSettings) {
      try {
        await Linking.openSettings();
      } catch {
        // Ignore.
      }
    }
    return false;
  }
}

export function onNotificationOpen(handler: (path: string) => void): () => void {
  clickPath = handler;
  return () => {
    if (clickPath === handler) clickPath = null;
  };
}
