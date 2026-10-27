import { useRouter, type Href } from 'expo-router';
import { getCalendars } from 'expo-localization';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { touchPresence } from '@/data/repo/notifications';
import {
  initOneSignal,
  loginOneSignal,
  logoutOneSignal,
  onNotificationOpen,
  requestPushPermission,
} from '@/lib/onesignal';

/**
 * Registers the signed-in user with OneSignal, pings last_active so the
 * server can suppress pushes while they are in the app, and opens the
 * deep link on a tap.
 */
export function usePush(): void {
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    if (!userId) {
      logoutOneSignal();
      return;
    }
    loginOneSignal(userId);
    // Existing accounts signed up before OneSignal never hit setup.
    void requestPushPermission();
  }, [userId]);

  useEffect(() => {
    return onNotificationOpen((path) => {
      router.push(path as Href);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const zone = getCalendars()[0]?.timeZone ?? undefined;
    const ping = () => {
      void touchPresence(zone);
    };

    ping();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });
    return () => sub.remove();
  }, [userId]);
}
