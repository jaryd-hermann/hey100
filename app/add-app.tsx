import React from 'react';

import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

/** Reuses onboarding steps 2–12 to list a second app. */
export default function AddApp() {
  return <OnboardingFlow mode="addApp" />;
}
