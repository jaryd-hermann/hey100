import { Image, type ImageSource } from 'expo-image';
import React from 'react';

import { useTheme } from '@/theme/ThemeProvider';

/** Black glyph on the pink selected tile. Idle glyphs follow the theme ink. */
const SELECTED = '#111111';

export type TabIconProps = {
  size?: number;
  active?: boolean;
};

function TabGlyph({
  idle,
  solid,
  size = 24,
  active,
}: TabIconProps & { idle: ImageSource; solid: ImageSource }) {
  const { c } = useTheme();

  return (
    <Image
      source={active ? solid : idle}
      style={{ width: size, height: size }}
      contentFit="contain"
      tintColor={active ? SELECTED : c.ink}
    />
  );
}

export function DiscoverIcon(props: TabIconProps) {
  return (
    <TabGlyph
      {...props}
      idle={require('../../../assets/images/glyphs/search.png')}
      solid={require('../../../assets/images/glyphs/search-solid.png')}
    />
  );
}

export function HeysIcon(props: TabIconProps) {
  return (
    <TabGlyph
      {...props}
      idle={require('../../../assets/images/glyphs/heart.png')}
      solid={require('../../../assets/images/glyphs/heart-solid.png')}
    />
  );
}

export function ChatIcon(props: TabIconProps) {
  return (
    <TabGlyph
      {...props}
      idle={require('../../../assets/images/glyphs/message.png')}
      solid={require('../../../assets/images/glyphs/message-solid.png')}
    />
  );
}

export function FeedbackIcon(props: TabIconProps) {
  return (
    <TabGlyph
      {...props}
      idle={require('../../../assets/images/glyphs/analytics.png')}
      solid={require('../../../assets/images/glyphs/analytics-solid.png')}
    />
  );
}

export function AppsIcon(props: TabIconProps) {
  return (
    <TabGlyph
      {...props}
      idle={require('../../../assets/images/glyphs/apps.png')}
      solid={require('../../../assets/images/glyphs/apps-solid.png')}
    />
  );
}
