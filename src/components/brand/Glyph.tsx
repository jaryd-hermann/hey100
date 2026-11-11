import { Image, type ImageSource } from 'expo-image';
import React from 'react';

export function Glyph({
  source,
  size = 22,
  color,
}: {
  source: ImageSource;
  size?: number;
  color?: string;
}) {
  return (
    <Image source={source} style={{ width: size, height: size }} contentFit="contain" tintColor={color} />
  );
}

export const glyphs = {
  cog: require('../../../assets/images/glyphs/cog.png'),
  sparkles: require('../../../assets/images/glyphs/sparkles.png'),
  coin: require('../../../assets/images/glyphs/coin.png'),
  pro: require('../../../assets/images/glyphs/pro.png'),
  proSolid: require('../../../assets/images/glyphs/pro-solid.png'),
  eye: require('../../../assets/images/glyphs/eye.png'),
  heartSolid: require('../../../assets/images/glyphs/heart-solid.png'),
  milestoneH1: require('../../../assets/images/glyphs/milestone-h1.png'),
  handshake: require('../../../assets/images/glyphs/handshake.png'),
  heartEyes: require('../../../assets/images/glyphs/heart-eyes.png'),
  chart: require('../../../assets/images/glyphs/chart.png'),
  flame: require('../../../assets/images/glyphs/flame.png'),
} as const;
