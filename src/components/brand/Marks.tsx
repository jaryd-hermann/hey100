import { Image } from 'expo-image';
import React from 'react';

import { useTheme } from '@/theme/ThemeProvider';

import { Glyph, glyphs } from './Glyph';

const VERIFIED = require('../../../assets/images/verified.png');

export function KarmaMark({ size = 22, color }: { size?: number; color?: string }) {
  const { c } = useTheme();
  return <Glyph source={glyphs.coin} size={size} color={color ?? c.ink} />;
}

export function AiMark({ size = 22, color }: { size?: number; color?: string }) {
  const { c } = useTheme();
  return <Glyph source={glyphs.sparkles} size={size} color={color ?? c.ink} />;
}

export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return <Image source={VERIFIED} style={{ width: size, height: size }} contentFit="contain" />;
}
