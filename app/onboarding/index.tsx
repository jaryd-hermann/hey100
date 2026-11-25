import React from 'react';

import { GateScreen } from '@/features/account/GateScreen';

/** Replaced by the full flow ([O2]–[R2]) in Phase 2. */
export default function Onboarding() {
  return (
    <GateScreen
      title="Set up your account"
      body="Profile, product, revenue verification and group placement come next. Until then, use ··· to log out or delete this account."
    />
  );
}
