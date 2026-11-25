import { Platform } from 'react-native';

export type ThemeName = 'dark';

export type Palette = {
  bg: string;
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
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
    accent: '#00FF00',
    accentText: '#00FF00',
    accentInk: '#0020A1',
    soft: 'rgba(0, 255, 0, 0.13)',
    mid: '#00B800',
    scrim: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(34, 38, 35, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',
    glow: 'rgba(0, 255, 0, 0.22)',
    danger: '#FF6B61',
  },
};

/**
 * Colour is functional in htg.chat: each of these means one thing everywhere.
 * Yellow is never used for your own messages; it is reserved for your group
 * and today's question.
 */
export const htg = {
  /** Your group and today's question: header, question card, unread, active tab. */
  yours: '#FFFF00',
  yoursInk: '#111111',
  /** Groups above you: black with a white stroke. */
  above: '#000000',
  aboveStroke: '#FFFFFF',
  /** Eavesdropping badge, sheet and insights. */
  eavesdrop: '#FF1C6F',
  /** Verified states, selected plan, selected category chip. */
  verified: '#00FF00',
  verifiedInk: '#0020A1',
  mineBubble: '#FFFFFF',
  mineInk: '#111111',
  otherBubble: '#232825',
  /** Unselected plan rows and the floating "new ↓" pill. */
  idle: '#3C3C3B',
  sticker: '#111111',
} as const;

/** Full-bleed onboarding step colours, in order. */
export const shift = {
  yellow: '#FFFF00',
  blue: '#2E5CFF',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  violet: '#7B00FF',
  dark: '#0E100F',
} as const;

export const SPLASH_BG = '#0E100F';

const monoFace = (ios: string, android: string) => (Platform.OS === 'ios' ? ios : android);

export const fonts = {
  /** Wordmark only. */
  logo: 'HackerNoonV1-Regular',
  mono: monoFace('JetBrainsMono-Regular', 'JetBrainsMono_400Regular'),
  monoMedium: monoFace('JetBrainsMono-Medium', 'JetBrainsMono_500Medium'),
  monoSemi: monoFace('JetBrainsMono-SemiBold', 'JetBrainsMono_600SemiBold'),
  monoBold: monoFace('JetBrainsMono-Bold', 'JetBrainsMono_700Bold'),
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
  tabBarSpacer: 96,
  tabBarHeight: 52,
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
};
