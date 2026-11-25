import { Image, type ImageSource } from 'expo-image';
import React from 'react';

import { htg } from '@/theme/tokens';

export type TabIconProps = {
  size?: number;
  active?: boolean;
};

/** Black on the yellow active pill; dimmed white when idle. */
function TabGlyph({ source, size = 20, active }: TabIconProps & { source: ImageSource }) {
  return (
    <Image
      source={source}
      style={{ width: size, height: size, opacity: active ? 1 : 0.6 }}
      contentFit="contain"
      tintColor={active ? htg.yoursInk : '#FFFFFF'}
    />
  );
}

export function ChatsIcon(props: TabIconProps) {
  return <TabGlyph {...props} source={require('../../../assets/images/glyphs/message.png')} />;
}

export function TldrIcon(props: TabIconProps) {
  return <TabGlyph {...props} source={require('../../../assets/images/glyphs/sparkles.png')} />;
}
