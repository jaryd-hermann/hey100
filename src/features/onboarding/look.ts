import type { Palette } from '@/theme/tokens';

import type { Step } from './steps';

/** Screen colors from the onboarding prototype, one per step in `STEPS`. */
const BACKGROUNDS = [
  '#0E100F',
  '#0E100F',
  '#0020A1',
  '#FFFF00',
  '#2E5CFF',
  '#FFFFFF',
  '#FF00FF',
  '#FF5900',
  '#FFFF00',
  '#00FFFF',
  '#2E5CFF',
  '#FF0000',
  '#0020A1',
  '#FFFF00',
  '#0E100F',
  '#7B00FF',
  '#FF00FF',
  '#FF5900',
  '#FFFF00',
  '#2E5CFF',
  '#0020A1',
  '#0000EB',
  '#00FFFF',
  '#FFFF00',
  '#0E100F',
];

const DARK = new Set(['#0E100F', '#2E5CFF', '#7B00FF', '#0020A1', '#0000EB']);

export const LIME = '#C6F24E';
export const INK = '#111111';

export type StepLook = {
  bg: string;
  dark: boolean;
  ink: string;
  muted: string;
  track: string;
  fill: string;
  ctaBg: string;
  ctaFg: string;
  shadow: string;
};

export function stepLook(index: number): StepLook {
  const bg = BACKGROUNDS[index] ?? '#0E100F';
  const dark = DARK.has(bg);
  const yellowOrWhite = bg === '#FFFF00' || bg === '#FFFFFF' || bg === '#F2F3EF';
  return {
    bg,
    dark,
    ink: dark ? '#FFFFFF' : INK,
    muted: dark ? 'rgba(255,255,255,0.84)' : 'rgba(17,17,17,0.78)',
    track: dark ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,17,0.15)',
    fill: dark ? LIME : INK,
    ctaBg: yellowOrWhite ? INK : LIME,
    ctaFg: yellowOrWhite ? '#FFFFFF' : INK,
    shadow: dark ? '#000000' : INK,
  };
}

export function stepPalette(look: StepLook): Partial<Palette> {
  return {
    bg: look.bg,
    surface: '#FFFFFF',
    raised: look.dark ? 'rgba(255,255,255,0.14)' : '#F2F3EF',
    ink: look.ink,
    muted: look.muted,
    line: look.track,
    accent: LIME,
    accentInk: INK,
  };
}

/** Three bars: your product, you, then the screens after sign-in. */
export function segmentProgress(index: number): [number, number, number] {
  const product = span(index, 3, 15);
  const you = span(index, 16, 24);
  const done = span(index, 25, 30);
  return [product, you, done];
}

function span(index: number, start: number, end: number): number {
  if (index < start) return 0;
  if (index > end) return 1;
  return (index - start + 1) / (end - start + 1);
}

export function segmentCounter(index: number): string {
  if (index >= 3 && index <= 15) return `${index - 2}/13`;
  if (index >= 16 && index <= 24) return `${index - 15}/9`;
  if (index >= 25 && index <= 30) return `${index - 24}/6`;
  return '';
}

export const BRIDGES: Record<number, { part: string; text: string }> = {
  3: {
    part: 'PART 1 OF 3 · YOUR PRODUCT',
    text: "Let's start with your product's profile. The stronger your profile the better we can match you to users.",
  },
  9: {
    part: 'YOUR PRODUCT · AUDIENCE',
    text: "Next: who's your app for? We'll match you with builders who'd actually use it.",
  },
  16: {
    part: 'PART 2 OF 3 · YOU',
    text: "Now we'll ask about you, and the apps you'd be open to trying.",
  },
};

export function showsChromeTitle(step: Step): boolean {
  return step.kind !== 'problem' && step.kind !== 'check';
}
