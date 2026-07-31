/**
 * Xavfsiz Xonadon — Premium Light / Dark color palettes
 * Government-grade trust + fintech clarity + soft structuralism
 */

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primarySurface: string;

  secondary: string;
  secondaryLight: string;
  secondarySurface: string;

  accent: string;
  accentLight: string;
  accentSurface: string;

  danger: string;
  dangerLight: string;
  dangerSurface: string;
  success: string;
  successLight: string;
  successSurface: string;
  info: string;
  infoLight: string;
  infoSurface: string;
  warning: string;
  warningSurface: string;

  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderLight: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
}

export const LightColors: ColorPalette = {
  // Primary — deep navy (trust, authority)
  primary: '#0A1E3C',
  primaryLight: '#1B3A66',
  primaryDark: '#061224',
  primarySurface: '#E4EBF5',

  // Secondary — navy 2nd step
  secondary: '#132C4F',
  secondaryLight: '#244A7A',
  secondarySurface: '#E8EEF6',

  // Accent — refined gold (accents only)
  accent: '#D4A82B',
  accentLight: '#EAC45A',
  accentSurface: 'rgba(212, 168, 43, 0.13)',

  // Semantic
  danger: '#C62828',
  dangerLight: '#E25555',
  dangerSurface: 'rgba(198, 40, 40, 0.10)',
  success: '#1E7E4E',
  successLight: '#3BAA75',
  successSurface: 'rgba(30, 126, 78, 0.10)',
  info: '#2A65B3',
  infoLight: '#5B8FD3',
  infoSurface: 'rgba(42, 101, 179, 0.10)',
  warning: '#B8860B',
  warningSurface: 'rgba(184, 134, 11, 0.12)',

  // Neutrals — crisp and breathable
  background: '#F2F5FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#E8EDF5',
  border: '#D9E0EA',
  borderLight: '#EEF2F8',

  // Text
  textPrimary: '#0D1B2A',
  textSecondary: '#46566C',
  textMuted: '#8A9AB0',
  textInverse: '#FFFFFF',
  textLink: '#1B3A66',
};

export const DarkColors: ColorPalette = {
  // Primary — muted steel blue
  primary: '#93AFD6',
  primaryLight: '#B5CBEA',
  primaryDark: '#0A1E3C',
  primarySurface: 'rgba(147, 175, 214, 0.16)',

  // Secondary
  secondary: '#7C9BC4',
  secondaryLight: '#9DB8DA',
  secondarySurface: 'rgba(124, 155, 196, 0.16)',

  // Accent — softer gold
  accent: '#E4C466',
  accentLight: '#F2DE9C',
  accentSurface: 'rgba(228, 196, 102, 0.18)',

  // Semantic
  danger: '#EF6B6B',
  dangerLight: '#F59A9A',
  dangerSurface: 'rgba(239, 107, 107, 0.15)',
  success: '#65C48E',
  successLight: '#8ED6AD',
  successSurface: 'rgba(101, 196, 142, 0.15)',
  info: '#7DB4EF',
  infoLight: '#A6CFF5',
  infoSurface: 'rgba(125, 180, 239, 0.15)',
  warning: '#E4B64A',
  warningSurface: 'rgba(228, 182, 74, 0.15)',

  // Neutrals
  background: '#0B1320',
  surface: '#121D2E',
  surfaceElevated: '#1A2940',
  surfaceSubtle: '#162236',
  border: '#24334D',
  borderLight: '#1C2C45',

  // Text
  textPrimary: '#E8EEF6',
  textSecondary: '#A5B4CA',
  textMuted: '#6D7F99',
  textInverse: '#0B1320',
  textLink: '#93AFD6',
};
