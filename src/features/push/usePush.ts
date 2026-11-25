import { useRouter, type Href } from 'expo-router';
import { getCalendars } from 'expo-localization';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { initOneSignal, loginOneSignal, logoutOneSignal, onNotificationOpen } from '@/lib/onesignal';
import { getSupabase } from '@/lib/supabase';

/**
 * Registers the signed-in user with OneSignal, pings last_active (and the
 * device timezone) so the server can suppress pushes while they are in the
 * app, and opens the deep link on a tap. The permission prompt itself lives
 * on the onboarding notifications step.
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
      getSupabase()
        ?.rpc('touch_presence', zone ? { p_timezone: zone } : {})
        .then(() => undefined, () => undefined);
    };

    ping();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });
    return () => sub.remove();
  }, [userId]);
}
