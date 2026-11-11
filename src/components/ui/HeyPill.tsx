import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Glyph, glyphs } from '@/components/brand/Glyph';
import { useTheme } from '@/theme/ThemeProvider';

export type HeyPillProps = {
  onPress: () => void;
  /** 40 on screenshots and prompts, 58 for the floating whole-app Hey. */
  size?: 40 | 58;
  /** What is being heyed. Used for the accessibility label only. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Lime circle with the solid heart. */
export function HeyPill({ onPress, size = 40, label, style }: HeyPillProps) {
  const { c } = useTheme();

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
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.accent,
          borderWidth: 2,
          borderColor: '#111111',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Glyph source={glyphs.heartSolid} size={size * 0.5} color="#111111" />
      </View>
    </Pressable>
  );
}

export type PassPillProps = {
  onPress: () => void;
  size?: 40 | 58;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Solid white circle with an orange X. */
export function PassPill({ onPress, size = 58, label, style }: PassPillProps) {
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
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={Math.round(size * 0.62)} color="#FF5900" />
      </View>
    </Pressable>
  );
}
