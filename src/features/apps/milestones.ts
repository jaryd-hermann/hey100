import type { ImageSource } from 'expo-image';

import { glyphs } from '@/components/brand/Glyph';

/** Heart-eyes is the audience match rate, H1 the first match, handshake the first trade, chart the launch report. */
export function milestoneGlyph(id: string): ImageSource {
  if (id === 'first-trade') return glyphs.handshake;
  if (id === 'target-opened') return glyphs.heartEyes;
  if (id === 'monthly') return glyphs.chart;
  return glyphs.milestoneH1;
}
