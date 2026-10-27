import React from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { EMOJI_TRAY } from '@/data/mock';

export function EmojiTray({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        paddingHorizontal: 2,
        paddingVertical: 4,
      }}
    >
      {EMOJI_TRAY.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => onPick(emoji)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={emoji}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Txt size={22}>{emoji}</Txt>
        </Pressable>
      ))}
    </View>
  );
}
