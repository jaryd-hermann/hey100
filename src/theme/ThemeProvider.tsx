import React, { createContext, useContext, useMemo } from 'react';

import { palettes, shadow, type Palette, type ShadowStyle, type ThemeName } from './tokens';

type ThemeValue = {
  name: ThemeName;
  c: Palette;
  shadow: ShadowStyle;
  isDark: boolean;
};

const DARK: ThemeValue = { name: 'dark', c: palettes.dark, shadow: shadow.dark, isDark: true };

const ThemeContext = createContext<ThemeValue>(DARK);

/** htg.chat is dark only. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={DARK}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/** Paints one screen with a different palette, e.g. a full-bleed onboarding step. */
export function ThemeOverride({
  c,
  isDark,
  children,
}: {
  c: Partial<Palette>;
  isDark?: boolean;
  children: React.ReactNode;
}) {
  const parent = useTheme();
  const value = useMemo<ThemeValue>(
    () => ({
      ...parent,
      c: { ...parent.c, ...c },
      isDark: isDark ?? parent.isDark,
    }),
    [parent, c, isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
