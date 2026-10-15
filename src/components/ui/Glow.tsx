import React, { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { oklch } from '@/theme/oklch';
import { useTheme } from '@/theme/ThemeProvider';

const CORE = oklch(0.88, 0.19, 128);

/** The soft lime glow behind onboarding statements and the match overlay. */
export function Glow({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const { isDark } = useTheme();
  const id = `glow-${useId()}`;

  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={CORE} stopOpacity={isDark ? 0.3 : 0.52} />
            <Stop offset="0.5" stopColor={CORE} stopOpacity={isDark ? 0.15 : 0.26} />
            <Stop offset="1" stopColor={CORE} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
