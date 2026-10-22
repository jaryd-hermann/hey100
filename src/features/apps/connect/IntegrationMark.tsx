import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { IntegrationKey } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<Exclude<IntegrationKey, 'revenuecat'>, { bg: string; fg: string }> = {
  github: { bg: '#24292F', fg: '#FFFFFF' },
  asc: { bg: '#0D96F6', fg: '#FFFFFF' },
  stripe: { bg: '#635BFF', fg: '#FFFFFF' },
};

export function IntegrationMark({
  provider,
  connected,
  size = 38,
}: {
  provider: IntegrationKey;
  connected?: boolean;
  size?: number;
}) {
  const { c } = useTheme();

  if (provider === 'revenuecat') {
    return (
      <Image
        source={
          connected
            ? require('../../../../assets/images/revenuecat-icon.png')
            : require('../../../../assets/images/revenuecat-icon-gray.png')
        }
        style={{ width: size, height: size, borderRadius: 11 }}
      />
    );
  }

  const brand = ICONS[provider];
  const bg = connected ? brand.bg : c.raised;
  const fg = connected ? brand.fg : c.muted;
  const glyph = size * 0.52;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {provider === 'github' ? (
        <Ionicons name="logo-github" size={glyph} color={fg} />
      ) : provider === 'asc' ? (
        <Ionicons name="logo-apple" size={glyph} color={fg} />
      ) : (
        <StripeMark size={glyph} color={fg} />
      )}
    </View>
  );
}

function StripeMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M13.98 6.24c0-1.5 1.24-2.1 3.14-2.1 1.76 0 3.7.54 5.32 1.5V1.3C20.78.5 18.86 0 16.86 0 12.1 0 8.9 2.5 8.9 7.06c0 6.9 9.5 5.8 9.5 8.76 0 1.78-1.54 2.36-3.7 2.36-1.9 0-4.14-.78-5.98-1.84v4.4c2.02 1 4.28 1.46 5.98 1.46 5.02 0 8.36-2.46 8.36-7.1-.02-7.44-9.52-6.12-9.52-8.86z"
      />
    </Svg>
  );
}
