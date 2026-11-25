import { Redirect } from 'expo-router';
import React from 'react';

import { BootScreen } from '@/components/brand/BootScreen';
import { nextRoute, useMe } from '@/features/account/useMe';
import { useAuth } from '@/features/auth/AuthProvider';

/** Signed out → splash. Signed in → the first gate the account has not passed. */
export default function Index() {
  const { session, restoring } = useAuth();
  const me = useMe();

  if (restoring) return <BootScreen />;
  if (!session) return <Redirect href="/welcome" />;
  if (me.isError) return <BootScreen onRetry={() => void me.refetch()} />;
  if (me.data === undefined) return <BootScreen />;
  // A session without a profile row means the account was deleted elsewhere.
  if (me.data === null) return <Redirect href="/welcome" />;

  return <Redirect href={nextRoute(me.data)} />;
}
