import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Txt } from './Txt';

export type HeyPillProps = {
  onPress: () => void;
  /** 40 on screenshots and prompts, 58 for the floating whole-app Hey. */
  size?: 40 | 58;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** The core verb. Lime pill, waving hand, "Hey". */
export function HeyPill({ onPress, size = 40, label = 'Hey', style }: HeyPillProps) {
  const { c } = useTheme();
  const big = size === 58;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Say hey${label === 'Hey' ? '' : ` — ${label}`}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          height: size,
          borderRadius: radii.pill,
          paddingHorizontal: big ? 22 : 13,
          flexDirection: 'row',
          alignItems: 'center',
          gap: big ? 8 : 5,
          backgroundColor: c.accent,
          borderWidth: big ? 2 : 0,
          borderColor: c.ink,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Txt size={big ? 20 : 14}>✋</Txt>
      <Txt size={big ? 17 : 13} weight={700} color={c.accentInk}>
        {label}
      </Txt>
    </Pressable>
  );
}
