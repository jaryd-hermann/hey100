import React from 'react';

import { GateScreen } from '@/features/account/GateScreen';

/** Replaced by the three-tier paywall [PW] in Phase 2. */
export default function Paywall() {
  return (
    <GateScreen
      title="Pick a plan"
      body="Member, Pro and Ultimate plans unlock your group. Use ··· to log out or delete this account."
    />
  );
}
