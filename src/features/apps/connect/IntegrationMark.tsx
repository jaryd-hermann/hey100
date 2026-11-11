import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import type { IntegrationKey } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<Exclude<IntegrationKey, 'revenuecat' | 'stripe' | 'posthog'>, { bg: string; fg: string }> = {
  github: { bg: '#24292F', fg: '#FFFFFF' },
  asc: { bg: '#0D96F6', fg: '#FFFFFF' },
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

  if (provider === 'stripe') {
    return (
      <Image
        source={require('../../../../assets/images/stripe-icon.png')}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), opacity: connected ? 1 : 0.45 }}
      />
    );
  }

  if (provider === 'posthog') {
    return (
      <Image
        source={require('../../../../assets/images/posthog-icon.png')}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), opacity: connected ? 1 : 0.45 }}
        contentFit="cover"
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
      ) : (
        <Ionicons name="logo-apple" size={glyph} color={fg} />
      )}
    </View>
  );
}
