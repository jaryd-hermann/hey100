import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const LIKE = {
  light: require('../../../assets/images/like-light.png'),
  dark: require('../../../assets/images/like-dark.png'),
};

const PASS = {
  light: require('../../../assets/images/pass-light.png'),
  dark: require('../../../assets/images/pass-dark.png'),
};

export type HeyPillProps = {
  onPress: () => void;
  /** 40 on screenshots and prompts, 58 for the floating whole-app Hey. */
  size?: 40 | 58;
  /** What is being heyed. Used for the accessibility label only. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Lime circle with the heart. Replaces the old waving-hand mark. */
export function HeyPill({ onPress, size = 40, label, style }: HeyPillProps) {
  const { name } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? `Say hey — ${label}` : 'Say hey'}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Image source={LIKE[name]} style={{ width: size, height: size }} contentFit="contain" />
    </Pressable>
  );
}

export type PassPillProps = {
  onPress: () => void;
  size?: 40 | 58;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Outlined circle with the X. */
export function PassPill({ onPress, size = 58, label, style }: PassPillProps) {
  const { name } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Pass'}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Image source={PASS[name]} style={{ width: size, height: size }} contentFit="contain" />
    </Pressable>
  );
}
