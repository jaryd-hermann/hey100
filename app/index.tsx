import { Redirect } from 'expo-router';
import React from 'react';

import { BootScreen } from '@/components/brand/BootScreen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyProfile } from '@/data/repo/profile';
import { useStore } from '@/store/AppStore';

export default function Index() {
  const { onboarded } = useStore();
  const { session, restoring } = useAuth();
  const profile = useMyProfile();

  if (restoring) {
    return <BootScreen />;
  }

  if (onboarded || (session && profile.data?.onboarded_at)) {
    return <Redirect href="/(tabs)/discover" />;
  }

  // Session is back, but the profile row has not arrived yet — wait rather
  // than bouncing a returning user through the welcome screen.
  if (session && (profile.isLoading || profile.isFetching) && profile.data === undefined) {
    return <BootScreen />;
  }

  return <Redirect href="/onboarding" />;
}
