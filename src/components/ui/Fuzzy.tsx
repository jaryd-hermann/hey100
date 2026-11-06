import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/** Soft-focus overlay used to hide reciprocal feedback until both sides submit. */
export function Fuzzy({
  locked,
  children,
  style,
}: {
  locked?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();

  if (!locked) return <View style={style}>{children}</View>;

  return (
    <View style={[{ overflow: 'hidden', borderRadius: radii.cardLg }, style]}>
      <View pointerEvents="none" style={{ opacity: 0.55 }}>
        {children}
      </View>
      <BlurView
        intensity={28}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
