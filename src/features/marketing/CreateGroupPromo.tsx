import React from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { captureEvent } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';

/** Sits under Find new groups and sells starting a room of your own. */
export function CreateGroupPromo({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create a group"
      onPress={() => {
        captureEvent('create_group_promo_tapped', { from: 'community' });
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card tone="soft" padding={16} style={{ gap: 8 }}>
        <Label>Creating a group</Label>
        <Txt size={16} weight={600} lh={1.3}>
          Start a room for the builders you want around you
        </Txt>
        <Txt size={14.5} lh={1.45} muted>
          A group is a shared place to talk shop, share launches, and find people who will actually
          try the thing. You set who can join.
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Txt size={14} weight={600} color={c.accentText}>
            Create a group
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}
