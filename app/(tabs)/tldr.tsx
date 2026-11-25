import React from 'react';

import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

/** [R9] TLDR. Feed, themes, saved and search land in Phase 6. */
export default function Tldr() {
  return (
    <Screen title="TLDR" tabBar={false}>
      <EmptyState
        icon={require('../../assets/images/glyphs/sparkles.png')}
        title="Nothing to summarise yet"
        body="Each week's best answers from your group, and the groups you can read, are summarised here."
      />
    </Screen>
  );
}
