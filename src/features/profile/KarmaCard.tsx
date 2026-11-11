import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { KarmaMark, VerifiedBadge } from '@/components/brand/Marks';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { Label, Txt } from '@/components/ui/Txt';
import { useMyKarma, VERIFIED_KARMA } from '@/features/profile/karma';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

const WAYS = [
  'Match with apps that fit your interests',
  'Reply to people you match with',
  'Give feedback after a trade',
  'Post and engage in communities',
  'Publish a strong listing',
  'Join groups',
  'Verify commits, revenue, or customers',
];

export function KarmaCard() {
  const { c } = useTheme();
  const { karma, verified } = useMyKarma();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <Card padding={16} radius={radii.cardLg} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <KarmaMark size={24} />
            <Txt font="mono" size={16} weight={500} style={{ flex: 1 }}>
              Block Points
            </Txt>
            {verified ? <VerifiedBadge size={20} /> : null}
          </View>
          <Txt font="mono" size={32} weight={500}>
            {karma}
          </Txt>
          <Txt size={13} muted>
            {verified
              ? 'Verified badge unlocked. Tap to see how Block Points work.'
              : `${Math.max(0, VERIFIED_KARMA - karma)} more to unlock the verified badge.`}
          </Txt>
        </Card>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <KarmaMark size={28} />
            <Txt font="mono" size={22} weight={500}>
              Block Points
            </Txt>
          </View>
          <Txt size={15} lh={1.45}>
            Block Points are trust in the community. You earn them by matching, replying, giving
            feedback, posting, joining groups, verifying your product, and making a strong listing.
          </Txt>
          <Txt size={15} lh={1.45}>
            {VERIFIED_KARMA} Block Points unlock a verified badge on your profile.
          </Txt>
          <Label>How to earn it</Label>
          {WAYS.map((item) => (
            <Txt key={item} size={14} lh={1.4}>
              · {item}
            </Txt>
          ))}
        </View>
      </Sheet>
    </>
  );
}

export function KarmaChip({ karma, verified }: { karma: number; verified?: boolean }) {
  const { isDark } = useTheme();
  return (
    <View
      accessibilityLabel={`${karma} Block Points`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(244, 201, 176, 0.22)' : 'rgba(244, 201, 176, 0.55)',
      }}
    >
      <KarmaMark size={20} />
      <Txt font="mono" size={14} weight={600}>
        {karma}
      </Txt>
      {verified ? <VerifiedBadge size={18} /> : null}
    </View>
  );
}
