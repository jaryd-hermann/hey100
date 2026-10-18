import React from 'react';
import { Pressable, View } from 'react-native';

import { HandMark } from '@/components/brand/Logo';
import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing, IncomingHey } from '@/data/types';
import { radii } from '@/theme/tokens';

import { BuilderLine, NoteBlock } from './HeyParts';

export type ReceivedHeyCardProps = {
  hey: IncomingHey;
  listing: AppListing;
  /** The user's app the hey came in on. */
  viaApp?: AppListing;
  onOpen: () => void;
  onPass: () => void;
  onHeyBack: () => void;
};

export function ReceivedHeyCard({
  hey,
  listing,
  viaApp,
  onOpen,
  onPass,
  onHeyBack,
}: ReceivedHeyCardProps) {
  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
      {/* The buttons stay outside the press target: RN has no stopPropagation. */}
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => ({ gap: 13, opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={52} />
          <View style={{ flex: 1 }}>
            <Txt font="mono" size={15} weight={500} numberOfLines={1}>
              {listing.name}
            </Txt>
            <Txt size={13} muted numberOfLines={1}>
              {listing.cat} · {listing.stage}
            </Txt>
          </View>
        </View>

        <NoteBlock
          icon={viaApp ? <AppIcon hue={viaApp.hue} name={viaApp.name} uri={viaApp.icon} size={18} /> : undefined}
          label={`Said hey to ${shortName(viaApp?.name ?? 'your app')}'s ${hey.target}`}
          note={hey.note}
          followUp={hey.followUp}
        />

        <BuilderLine name={listing.builder} role={listing.role} />
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label="Pass" variant="surface" style={{ flex: 1 }} onPress={onPass} />
        <Btn
          label="Hey back"
          variant="accent"
          left={<HandMark size={18} />}
          style={{ flex: 1.3 }}
          onPress={onHeyBack}
        />
      </View>
    </Card>
  );
}
