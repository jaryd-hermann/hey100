import React from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Btn } from '@/components/ui/Btn';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import { shortName } from '@/data/mock';
import type { AppListing, SentHey } from '@/data/types';
import { FOLLOW_UP_DELAY_MS, canFollowUp } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { BuilderLine, NoteBlock } from './HeyParts';
import { sinceLabel, untilLabel } from './time';

export type SentHeyCardProps = {
  sent: SentHey;
  listing: AppListing;
  /** The user's app the hey was sent from. */
  viaApp?: AppListing;
  onFollowUp: () => void;
  onOpenChat: () => void;
};

export function SentHeyCard({ sent, listing, viaApp, onFollowUp, onOpenChat }: SentHeyCardProps) {
  const { c } = useTheme();

  const unlocked = canFollowUp(sent);
  const unlocksAt = sent.sentAt + FOLLOW_UP_DELAY_MS;

  return (
    <Card padding={16} radius={radii.cardLg} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <AppIcon hue={listing.hue} name={listing.name} uri={listing.icon} size={52} />
        <View style={{ flex: 1 }}>
          <Txt font="mono" size={15} weight={500} numberOfLines={1}>
            {listing.name}
          </Txt>
          <Txt size={13} muted numberOfLines={1}>
            {/* A matched app resolves to a stub listing with no category. */}
            {listing.cat ? `${listing.cat} · ` : ''}sent {sinceLabel(sent.sentAt)}
          </Txt>
        </View>
        <Chip
          label={sent.status === 'Pending' ? 'Waiting' : sent.status}
          size="sm"
          tone={sent.status === 'Matched' ? 'accent' : 'default'}
        />
      </View>

      <NoteBlock
        icon={
          viaApp ? (
            <AppIcon hue={viaApp.hue} name={viaApp.name} uri={viaApp.icon} size={18} />
          ) : undefined
        }
        label={`Said hey about their ${sent.target}`}
        note={sent.note}
        followUp={
          sent.followUp
            ? {
                note: sent.followUp.note,
                when: sinceLabel(sent.followUp.sentAt),
              }
            : undefined
        }
      />

      <BuilderLine name={listing.builder} role={listing.role} photo={listing.builderPhoto} />

      {sent.status === 'Passed' ? (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 13,
            gap: 5,
          }}
        >
          <Label size={10}>They passed</Label>
          <Txt size={14} lh={1.45} muted>
            {sent.passReason
              ? `Reason given: ${sent.passReason}`
              : 'No reason given. Passes are silent on Hey100.'}
          </Txt>
        </View>
      ) : null}

      {sent.status === 'Matched' ? (
        <Btn
          label={`Open chat with ${shortName(listing.name)}`}
          variant="surface"
          onPress={onOpenChat}
        />
      ) : null}

      {sent.status === 'Pending' ? (
        sent.followUp ? (
          <Txt size={12.5} muted lh={1.4}>
            Follow-up sent. That was your one.
          </Txt>
        ) : (
          <View style={{ gap: 7 }}>
            <Btn
              label={
                unlocked ? 'Send a follow-up' : `Follow-up unlocks in ${untilLabel(unlocksAt)}`
              }
              variant={unlocked ? 'accent' : 'surface'}
              disabled={!unlocked}
              onPress={onFollowUp}
            />
            <Txt size={12} muted lh={1.4} center>
              One follow-up per hey, 24 hours after you said hey.
            </Txt>
          </View>
        )
      ) : null}
    </Card>
  );
}
