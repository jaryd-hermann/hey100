import React from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { QUICK_REACT } from './reactions';

export function MessageActions({
  visible,
  onClose,
  onReply,
  onReact,
}: {
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
}) {
  const { c } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {QUICK_REACT.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => onReact(emoji)}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.raised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt size={22}>{emoji}</Txt>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={onReply}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: radii.option,
            backgroundColor: c.raised,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Txt size={15} weight={600}>
            Reply
          </Txt>
        </Pressable>
      </View>
    </Sheet>
  );
}
