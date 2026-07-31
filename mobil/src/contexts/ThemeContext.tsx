import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type ColorPalette } from '../theme/colors';

const THEME_STORAGE_KEY = '@theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  children: ReactNode;
}

function resolveIsDark(mode: ThemeMode, systemDark: boolean): boolean {
  if (mode === 'system') return systemDark;
  return mode === 'dark';
}

export function ThemeProvider({ children }: Props) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [systemDark, setSystemDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          setModeState(saved);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    // System theme detection — simplified; can be replaced with Appearance API
    setSystemDark(false);

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  };

  const toggle = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  const isDark = resolveIsDark(mode, systemDark);
  const colors = isDark ? DarkColors : LightColors;

  // AsyncStorage yuklanmaguncha ham context value doim bo'lishi kerak.
  const fallbackValue: ThemeContextValue = {
    mode: 'light',
    isDark: false,
    colors: LightColors,
    setMode: () => {},
    toggle: () => {},
  };

  if (!loaded) {
    return <ThemeContext.Provider value={fallbackValue}>{children}</ThemeContext.Provider>;
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
