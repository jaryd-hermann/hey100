import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { Txt } from './Txt';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** A count rendered after the label, used by active filter chips. */
  count?: number;
  tone?: 'default' | 'accent' | 'pink' | 'blue';
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected,
  onPress,
  size = 'md',
  left,
  right,
  count,
  tone = 'default',
  style,
}: ChipProps) {
  const { c, isDark } = useTheme();
  const height = size === 'sm' ? 30 : 36;

  const pink = tone === 'pink';
  const blue = tone === 'blue';
  const bg = selected
    ? c.ink
    : pink
      ? 'rgba(255, 182, 193, 0.32)'
      : blue
        ? isDark
          ? 'rgba(96, 165, 250, 0.22)'
          : 'rgba(59, 130, 246, 0.14)'
        : tone === 'accent'
          ? c.soft
          : 'transparent';
  const fg = selected
    ? c.bg
    : pink
      ? '#9A3B58'
      : blue
        ? isDark
          ? '#93C5FD'
          : '#1D4ED8'
        : tone === 'accent'
          ? c.accentText
          : c.ink;

  const content = (
    <>
      {left}
      <Txt size={size === 'sm' ? 12 : 13} weight={500} color={fg}>
        {label}
        {count ? ` ${count}` : ''}
      </Txt>
      {right}
    </>
  );

  const box: ViewStyle = {
    height,
    borderRadius: radii.pill,
    paddingHorizontal: size === 'sm' ? 11 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: bg,
    borderWidth: 1,
    borderColor: selected
      ? c.ink
      : pink
        ? 'rgba(196, 90, 120, 0.28)'
        : blue
          ? isDark
            ? 'rgba(147, 197, 253, 0.35)'
            : 'rgba(37, 99, 235, 0.28)'
          : tone === 'accent'
            ? 'transparent'
            : c.line,
  };

  if (!onPress) return <View style={[box, style]}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [box, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}
