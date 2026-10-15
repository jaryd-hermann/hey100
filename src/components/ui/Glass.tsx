import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type GlassProps = {
  children?: React.ReactNode;
  radius?: number;
  intensity?: number;
  /** Hairline border and top highlight, as on the tab bar and sticky app bar. */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The `glass` token: a blurred translucent surface. Android gets a flat tinted
 * fallback since blur there is expensive and inconsistent.
 */
export function Glass({ children, radius = 0, intensity = 40, bordered = true, style }: GlassProps) {
  const { c, isDark } = useTheme();

  const frame: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: bordered ? 1 : 0,
    borderColor: bordered ? c.glassBorder : 'transparent',
  };

  const highlight = bordered ? (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: radius / 2,
        right: radius / 2,
        height: 1,
        backgroundColor: c.glassHighlight,
        opacity: 0.6,
      }}
    />
  ) : null;

  if (Platform.OS === 'android') {
    return (
      <View style={[frame, { backgroundColor: c.glass }, style]}>
        {children}
        {highlight}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={[frame, style]}>
      <View style={{ backgroundColor: c.glass }}>
        {children}
        {highlight}
      </View>
    </BlurView>
  );
}
