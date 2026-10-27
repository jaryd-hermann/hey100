import React from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { captureEvent } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';

/** Points DMs at Community. Groups are the shared rooms; this is the door. */
export function CommunityPromoCard({
  from,
  onPress,
}: {
  from: 'dms' | 'team_chat';
  onPress: () => void;
}) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Community"
      onPress={() => {
        captureEvent('community_promo_tapped', { from });
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card tone="soft" padding={16} style={{ gap: 8 }}>
        <Label>Community</Label>
        <Txt size={16} weight={600} lh={1.3}>
          Groups are where builders hang out
        </Txt>
        <Txt size={14.5} lh={1.45} muted>
          Shared rooms for shipping, launch and feedback. Join one that fits what
          you&apos;re building, or start your own.
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Txt size={14} weight={600} color={c.accentText}>
            Open Community
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}
