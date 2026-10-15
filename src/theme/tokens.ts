import { oklch } from './oklch';

export type ThemeName = 'dark' | 'light';

export type Palette = {
  bg: string;
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  /** Lime used as text or icon colour, darkened on light backgrounds for contrast. */
  accentText: string;
  accentInk: string;
  soft: string;
  mid: string;
  scrim: string;
  glass: string;
  glassBorder: string;
  glassHighlight: string;
  glow: string;
  danger: string;
};

export const palettes: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0E100F',
    surface: '#171A18',
    raised: '#232825',
    ink: '#E8ECE7',
    muted: '#8E968F',
    line: 'rgba(232, 236, 231, 0.11)',
    accent: oklch(0.87, 0.18, 128),
    accentText: oklch(0.87, 0.18, 128),
    accentInk: '#0E100F',
    soft: oklch(0.87, 0.18, 128, 0.13),
    mid: oklch(0.6, 0.11, 128),
    scrim: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(34, 38, 35, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',
    glow: oklch(0.87, 0.18, 128, 0.22),
    danger: '#FF6B61',
  },
  light: {
    bg: '#F2F3EF',
    surface: '#FFFFFF',
    raised: '#E6E9E2',
    ink: '#121412',
    muted: '#5B625C',
    line: 'rgba(18, 20, 18, 0.12)',
    accent: oklch(0.88, 0.19, 128),
    accentText: oklch(0.48, 0.13, 135),
    accentInk: '#121412',
    soft: oklch(0.88, 0.19, 128, 0.3),
    mid: oklch(0.74, 0.12, 128),
    scrim: 'rgba(0, 0, 0, 0.35)',
    glass: 'rgba(255, 255, 255, 0.62)',
    glassBorder: 'rgba(0, 0, 0, 0.08)',
    glassHighlight: 'rgba(255, 255, 255, 0.9)',
    glow: oklch(0.88, 0.19, 128, 0.45),
    danger: '#D5342A',
  },
};

/** The splash screen is the one place that breaks the palette. */
export const SPLASH_BG = { light: '#F0D7FF', dark: '#0E100F' } as const;

export const fonts = {
  logo: 'TitanOne_400Regular',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemi: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const radii = {
  input: 14,
  card: 16,
  option: 16,
  cardLg: 20,
  sheet: 24,
  pill: 999,
} as const;

export const layout = {
  /** Horizontal page padding used across screens. */
  gutter: 20,
  /** Clearance so content scrolls out from under the floating tab bar. */
  tabBarSpacer: 110,
  tabBarHeight: 66,
  tabBarInset: 14,
  tabBarBottom: 24,
} as const;

export type ShadowStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
};

export const shadow: Record<ThemeName, ShadowStyle> = {
  dark: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  light: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
};
