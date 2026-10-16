import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { HandMark } from '@/components/brand/Logo';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type HeyPillProps = {
  onPress: () => void;
  /** 40 on screenshots and prompts, 58 for the floating whole-app Hey. */
  size?: 40 | 58;
  /** What is being heyed. Used for the accessibility label only. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** The core verb: a lime circle with the hand mark. No wording, just the hand. */
export function HeyPill({ onPress, size = 40, label, style }: HeyPillProps) {
  const { c } = useTheme();
  const big = size === 58;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? `Say hey — ${label}` : 'Say hey'}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.accent,
          borderWidth: big ? 2 : 0,
          borderColor: c.ink,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <HandMark size={big ? 28 : 20} />
    </Pressable>
  );
}
