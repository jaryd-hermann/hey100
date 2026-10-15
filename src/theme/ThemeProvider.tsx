import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, shadow, type Palette, type ShadowStyle, type ThemeName } from './tokens';

export type ThemePref = 'system' | 'light' | 'dark';

type ThemeValue = {
  /** The resolved theme actually being rendered. */
  name: ThemeName;
  /** What the user chose in Settings. */
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
  c: Palette;
  shadow: ShadowStyle;
  isDark: boolean;
};

const STORAGE_KEY = 'hey100.theme-pref';

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') setPrefState(stored);
      })
      .catch(() => {});
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const name: ThemeName = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
    return {
      name,
      pref,
      setPref,
      c: palettes[name],
      shadow: shadow[name],
      isDark: name === 'dark',
    };
  }, [pref, setPref, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
