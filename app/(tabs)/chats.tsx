import React from 'react';

import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { AccountMenuButton } from '@/features/account/AccountMenuButton';

/** [R3] Chats. The group, Jaryd and DMs, and the ladder land in Phases 3 and 5. */
export default function Chats() {
  return (
    <Screen headerRight={<AccountMenuButton />} tabBar={false}>
      <EmptyState
        icon={require('../../assets/images/glyphs/message.png')}
        title="No chats yet"
        body="Your group and today's question show up here once you're placed."
      />
    </Screen>
  );
}
