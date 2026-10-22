import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useMyProfile } from '@/data/repo/profile';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const { c } = useTheme();
  const { onboarded } = useStore();
  const { session, restoring } = useAuth();
  const profile = useMyProfile();

  if (restoring) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  if (onboarded || (session && profile.data?.onboarded_at)) {
    return <Redirect href="/(tabs)/discover" />;
  }

  // Session is back, but the profile row has not arrived yet — wait rather
  // than bouncing a returning user through the welcome screen.
  if (session && (profile.isLoading || profile.isFetching) && profile.data === undefined) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  return <Redirect href="/onboarding" />;
}
