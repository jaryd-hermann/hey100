import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';

/** https://hey100.com/i/{code} lands here. New users go through onboarding
 *  with the code filled in; people who already have an account skip it. */
export default function InviteScreen() {
  const { c } = useTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, restoring } = useAuth();
  const { onboarded } = useStore();
  const profile = useMyProfile();

  if (restoring) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  if (onboarded || (session && profile.data?.onboarded_at)) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return <Redirect href={{ pathname: '/onboarding', params: { invite: code ?? '' } }} />;
}
