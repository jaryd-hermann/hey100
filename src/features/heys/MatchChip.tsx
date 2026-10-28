import React from 'react';

import { JoinChip } from '@/features/community/JoinChip';
import { firstName } from '@/features/community/time';
import { shortName } from '@/data/mock';
import type { AppListing, IncomingHey } from '@/data/types';

export function MatchChip({
  hey,
  listing,
  onPress,
}: {
  hey: IncomingHey;
  listing: AppListing;
  onPress: () => void;
}) {
  const who = firstName(listing.builder);
  const app = shortName(listing.name);

  return (
    <JoinChip
      name={listing.builder}
      photo={listing.builderPhoto}
      label={`Matched with ${who} · ${app}`}
      onPress={hey.matchId ? onPress : undefined}
    />
  );
}
