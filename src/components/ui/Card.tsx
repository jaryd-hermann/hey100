import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type CardProps = {
  children: React.ReactNode;
  /** `soft` is the lime-tinted callout used for tips and the pinned Team row. */
  tone?: 'surface' | 'raised' | 'soft' | 'outline';
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = 'surface', padding = 16, radius = radii.card, style }: CardProps) {
  const { c } = useTheme();

  const backgrounds = {
    surface: c.surface,
    raised: c.raised,
    soft: c.soft,
    outline: 'transparent',
  } as const;

  return (
    <View
      style={[
        {
          backgroundColor: backgrounds[tone],
          borderRadius: radius,
          padding,
          borderWidth: 1,
          borderColor: tone === 'soft' ? 'transparent' : c.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
