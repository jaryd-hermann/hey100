import { Redirect } from 'expo-router';
import React from 'react';

import { useStore } from '@/store/AppStore';

export default function Index() {
  const { onboarded } = useStore();
  return <Redirect href={onboarded ? '/(tabs)/discover' : '/onboarding'} />;
}
