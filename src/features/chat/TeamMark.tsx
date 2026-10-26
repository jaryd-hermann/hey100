import React from 'react';
import { Image, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** The Hey100 app icon stands in for the Team thread's own icon. */
const TEAM_ICON = require('../../../assets/images/icon.png');
const JARYD = require('../../../assets/images/jaryd.png');

/** Jaryd writes the Team thread, so his avatar sits on the app icon. */
export const TEAM_AVATAR_NAME = 'Jaryd';

export type TeamMarkProps = {
  size?: number;
  /** The founder avatar badged on the icon. */
  badge?: number;
  /** Colour the badge is ringed against, so it reads on its own background. */
  ring?: string;
};

/**
 * `Avatar` draws initials, so the Team thread gets this instead: the real icon
 * image with Jaryd badged on it, the same lockup the match rows use.
 */
/** Jaryd alone, for the 1:1 founder DM. */
export function JarydMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={JARYD}
      resizeMode="cover"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#232825',
      }}
      accessibilityLabel={TEAM_AVATAR_NAME}
    />
  );
}

export function TeamMark({ size = 48, badge = 22, ring }: TeamMarkProps) {
  const { c } = useTheme();

  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={TEAM_ICON}
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.26),
          backgroundColor: c.raised,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -4,
          bottom: -4,
          borderRadius: badge,
          borderWidth: 2,
          borderColor: ring ?? c.surface,
        }}
      >
        <Image
          source={JARYD}
          resizeMode="cover"
          style={{
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: c.raised,
          }}
          accessibilityLabel={TEAM_AVATAR_NAME}
        />
      </View>
    </View>
  );
}
