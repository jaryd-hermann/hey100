import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type FontFamily = 'body' | 'mono' | 'logo' | 'system';
export type FontWeight = 400 | 500 | 600 | 700;

const systemWeight: Record<FontWeight, TextStyle['fontWeight']> = {
  400: '400',
  500: '500',
  600: '600',
  700: '700',
};

const families: Record<Exclude<FontFamily, 'logo' | 'system'>, Record<FontWeight, string>> = {
  body: {
    400: fonts.body,
    500: fonts.bodyMedium,
    600: fonts.bodySemi,
    700: fonts.bodyBold,
  },
  mono: {
    400: fonts.mono,
    500: fonts.monoMedium,
    600: fonts.monoSemi,
    700: fonts.monoBold,
  },
};

export type TxtProps = TextProps & {
  font?: FontFamily;
  size?: number;
  weight?: FontWeight;
  color?: string;
  /** Shorthand for the `muted` palette colour. */
  muted?: boolean;
  accent?: boolean;
  /** Line height as a multiple of the font size. */
  lh?: number;
  tracking?: number;
  center?: boolean;
  upper?: boolean;
};

export function Txt({
  font = 'body',
  size = 16,
  weight = 400,
  color,
  muted,
  accent,
  lh,
  tracking,
  center,
  upper,
  style,
  children,
  ...rest
}: TxtProps) {
  const { c } = useTheme();

  const resolved: TextStyle = {
    fontSize: size,
    color: color ?? (accent ? c.accentText : muted ? c.muted : c.ink),
    ...(font === 'system'
      ? { fontWeight: systemWeight[weight] }
      : { fontFamily: font === 'logo' ? fonts.logo : families[font][weight] }),
  };

  if (lh) resolved.lineHeight = Math.round(size * lh);
  if (tracking !== undefined) resolved.letterSpacing = tracking;
  if (center) resolved.textAlign = 'center';
  if (upper) resolved.textTransform = 'uppercase';

  return (
    <RNText style={[resolved, style]} {...rest}>
      {children}
    </RNText>
  );
}

/** Screen and card titles: monospace, per the type spec. */
export function Title({ size = 20, weight = 500, ...rest }: TxtProps) {
  return <Txt font="mono" size={size} weight={weight} {...rest} />;
}

/** The 11px uppercase monospace label used above sections and stats. */
export function Label({ size = 11, ...rest }: TxtProps) {
  return <Txt font="mono" size={size} weight={500} tracking={size * 0.08} upper muted {...rest} />;
}

/** Long-form reading text. Prompt answers are 20px at 1.38 on app pages. */
export function Body({ size = 16, lh = 1.5, ...rest }: TxtProps) {
  return <Txt font="body" size={size} lh={lh} {...rest} />;
}
