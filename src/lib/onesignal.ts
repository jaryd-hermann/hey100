import { AppState } from 'react-native';

import { config } from '@/lib/config';
import { hasNativeModule } from '@/lib/nativeModule';

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

export async function requestPushPermission(): Promise<boolean> {
  try {
    return (await native()?.OneSignal.Notifications.requestPermission(false)) ?? false;
  } catch {
    return false;
  }
}

export function onNotificationOpen(handler: (path: string) => void): () => void {
  clickPath = handler;
  return () => {
    if (clickPath === handler) clickPath = null;
  };
}
