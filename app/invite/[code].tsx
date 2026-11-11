import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { BootScreen } from '@/components/brand/BootScreen';
import { useMyProfile } from '@/data/repo/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStore } from '@/store/AppStore';

/** https://hey100.com/i/{code} lands here. New users go through onboarding
 *  with the code filled in; people who already have an account skip it. */
export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, restoring } = useAuth();
  const { onboarded } = useStore();
  const profile = useMyProfile();

  if (restoring) {
    return <BootScreen />;
  }

  if (onboarded || (session && profile.data?.onboarded_at)) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return <Redirect href={{ pathname: '/onboarding', params: { invite: code ?? '' } }} />;
}
