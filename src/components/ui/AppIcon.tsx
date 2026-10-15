import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { appHueColor } from '@/theme/oklch';

import { Txt } from './Txt';

export type AppIconProps = {
  /** Generated colour source when the app has no fetched icon. */
  hue: number;
  name: string;
  size?: number;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
};

/** App icons are generated per app from a hue until a store icon is fetched. */
export function AppIcon({ hue, name, size = 48, uri, style }: AppIconProps) {
  const { c } = useTheme();
  const radius = Math.round(size * 0.26);

  if (uri) {
    return (
      <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size, backgroundColor: c.raised }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: appHueColor(hue),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Txt font="mono" weight={700} size={Math.round(size * 0.44)} color="#0E100F">
        {name.trim().charAt(0).toUpperCase()}
      </Txt>
    </View>
  );
}

export type AvatarProps = {
  name: string;
  size?: number;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ name, size = 40, uri, style }: AvatarProps) {
  const { c } = useTheme();

  if (uri) {
    return (
      <View style={[{ borderRadius: size / 2, overflow: 'hidden' }, style]}>
        <Image source={{ uri }} style={{ width: size, height: size, backgroundColor: c.raised }} />
      </View>
    );
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.raised,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Txt font="mono" weight={600} size={Math.round(size * 0.38)}>
        {initials}
      </Txt>
    </View>
  );
}
