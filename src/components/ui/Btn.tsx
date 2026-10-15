import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Txt } from './Txt';

export type BtnVariant =
  /** Solid ink: black on light, white on dark. */
  | 'ink'
  /** The key action. Lime with a 2px ink/white outline. */
  | 'accent'
  | 'surface'
  | 'outline'
  | 'ghost';

export type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Dims the button without blocking the press, so invalid taps can explain why. */
  dim?: boolean;
  full?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sizes = {
  sm: { height: 38, px: 14, text: 14 },
  md: { height: 48, px: 18, text: 15 },
  lg: { height: 56, px: 22, text: 16 },
} as const;

export function Btn({
  label,
  onPress,
  variant = 'ink',
  size = 'md',
  disabled,
  dim,
  full,
  left,
  right,
  haptic = true,
  style,
}: BtnProps) {
  const { c } = useTheme();
  const s = sizes[size];

  const look: Record<BtnVariant, { bg: string; fg: string; border?: string; borderWidth?: number }> =
    {
      ink: { bg: c.ink, fg: c.bg },
      accent: { bg: c.accent, fg: c.accentInk, border: c.ink, borderWidth: 2 },
      surface: { bg: c.surface, fg: c.ink, border: c.line, borderWidth: 1.5 },
      outline: { bg: 'transparent', fg: c.ink, border: c.line, borderWidth: 1.5 },
      ghost: { bg: 'transparent', fg: c.muted },
    };

  const v = look[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.borderWidth ?? 0,
          opacity: (pressed ? 0.75 : 1) * (disabled || dim ? 0.45 : 1),
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {left ? <View style={styles.slot}>{left}</View> : null}
      <Txt size={s.text} weight={600} color={v.fg}>
        {label}
      </Txt>
      {right ? <View style={styles.slot}>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slot: { justifyContent: 'center', alignItems: 'center' },
});
