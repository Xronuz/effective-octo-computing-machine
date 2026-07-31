/**
 * Xavfsiz Xonadon — Premium Design System Tokens
 * Professional municipal inspection app
 */

export { LightColors, DarkColors, type ColorPalette } from './theme/colors';

// ── Color Palette (default light) ──────────────────────
export const Colors = {
  // Primary — Navy (trust & authority)
  primary: '#0A1E3C',
  primaryLight: '#1B3A66',
  primaryDark: '#061224',
  primarySurface: '#E4EBF5',

  // Secondary
  secondary: '#132C4F',
  secondaryLight: '#244A7A',
  secondarySurface: '#E8EEF6',

  // Accent — Refined gold (small accents only)
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

  // Neutrals
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
} as const;

// ── Strict 8-Point Grid ─────────────────────────────────
export const Grid8 = {
  xs: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// ── Semantic Intent Colors ──────────────────────────────
export const Intent = {
  nav: Colors.primary,
  completed: Colors.success,
  attention: Colors.warning,
  critical: Colors.danger,
  info: Colors.info,
  secondary: Colors.textMuted,
} as const;

// ── Status Colors ──────────────────────────────────────
export const StatusColors: Record<
  string,
  { bg: string; text: string; icon: string; border: string }
> = {
  ochiq: { bg: 'rgba(42, 101, 179, 0.12)', text: '#2A65B3', icon: '#2A65B3', border: '#B9CCE8' },
  jarayonda: {
    bg: 'rgba(184, 134, 11, 0.13)',
    text: '#9A7009',
    icon: '#B8860B',
    border: '#E4D5A8',
  },
  yopilgan: { bg: 'rgba(30, 126, 78, 0.12)', text: '#1E7E4E', icon: '#1E7E4E', border: '#A8D9BF' },
  muddati_otgan: {
    bg: 'rgba(198, 40, 40, 0.12)',
    text: '#C62828',
    icon: '#C62828',
    border: '#E8B3B3',
  },
  shubhali: { bg: 'rgba(126, 87, 194, 0.12)', text: '#7E57C2', icon: '#7E57C2', border: '#D1C4E9' },
};

// ── Xavf Darajasi Colors ───────────────────────────────
export const XavfColors: Record<string, { bg: string; text: string; border: string }> = {
  past: { bg: 'rgba(42, 101, 179, 0.12)', text: '#2A65B3', border: '#B9CCE8' },
  orta: { bg: 'rgba(184, 134, 11, 0.13)', text: '#9A7009', border: '#E4D5A8' },
  yuqori: { bg: 'rgba(212, 108, 43, 0.12)', text: '#C66C2B', border: '#EDC8B4' },
  kritik: { bg: 'rgba(198, 40, 40, 0.12)', text: '#C62828', border: '#E8B3B3' },
};

// ── Typography ──────────────────────────────────────────
export const Fonts = {
  heading: 'Outfit',
  body: 'Inter',
  mono: 'JetBrainsMono',
} as const;

export const FontSizes = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 21,
  xl: 25,
  '2xl': 30,
  '3xl': 36,
  '4xl': 44,
  '5xl': 56,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LineHeights = {
  tight: 1.15,
  snug: 1.28,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// ── Spacing ─────────────────────────────────────────────
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  base: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 52,
  '4xl': 64,
  '5xl': 80,
} as const;

// ── Border Radius ───────────────────────────────────────
export const Radius = {
  none: 0,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 32,
  full: 999,
} as const;

// ── Shadows (soft navy-tinted) ──────────────────────────
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 7,
  },
  xl: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.11,
    shadowRadius: 32,
    elevation: 11,
  },
} as const;

// ── Animation Durations ─────────────────────────────────
export const Durations = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// ── Layout ──────────────────────────────────────────────
export const Layout = {
  maxWidth: 520,
  tabBarHeight: 64,
  tabBarGap: 10,
  tabBarMargin: 16,
  headerHeight: 60,
} as const;

/**
 * Floating tab bar ostida kontent qolmasligi uchun kerakli pastki padding.
 */
export function tabBarContentPadding(insetBottom: number): number {
  return Layout.tabBarHeight + Math.max(insetBottom + Layout.tabBarGap, 12) + 16;
}

// ── Common Styles (reusable StyleSheet snippets) ───────
export const CommonStyles = {
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentPadding: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: Colors.textMuted,
    fontFamily: Fonts.body,
    fontSize: FontSizes.base,
  },
} as const;
