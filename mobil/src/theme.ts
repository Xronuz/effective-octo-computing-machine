/**
 * Xavfsiz Xonadon — Design System Tokens
 * Professional municipal inspection app (web dashboard bilan bir xil palitra)
 */

// ── Color Palette ──────────────────────────────────────
export const Colors = {
  // Primary — Navy (ishonch va vazminlik)
  primary: '#0A1E3C',
  primaryLight: '#2B4E8A',
  primaryDark: '#07162E',
  primarySurface: '#E8EEF6',

  // Secondary — Navy 2. qadam (ikkilamchi bloklar)
  secondary: '#1B3A66',
  secondaryLight: '#2B4E8A',
  secondarySurface: '#E8EEF6',

  // Accent — Oltin (faqat kichik urg'ular uchun)
  accent: '#C9A227',
  accentSurface: 'rgba(201, 162, 39, 0.12)',

  // Semantic
  danger: '#C0392B',
  dangerLight: '#D9534F',
  dangerSurface: 'rgba(192, 57, 43, 0.10)',
  success: '#2E9E6B',
  successSurface: 'rgba(46, 158, 107, 0.10)',
  info: '#3D6FB4',
  infoSurface: 'rgba(61, 111, 180, 0.10)',

  // Neutrals
  background: '#EDF0F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F6F8FB',
  border: '#E3E9F0',
  borderLight: '#EEF2F7',

  // Text
  textPrimary: '#0F2033',
  textSecondary: '#51637A',
  textMuted: '#8595AB',
  textInverse: '#FFFFFF',
  textLink: '#2B4E8A',
} as const;

// ── Status Colors (web bilan bir xil) ─────────────────
export const StatusColors: Record<string, { bg: string; text: string; icon: string }> = {
  ochiq: { bg: 'rgba(61, 111, 180, 0.12)', text: '#3D6FB4', icon: '#3D6FB4' },
  jarayonda: { bg: 'rgba(217, 164, 65, 0.14)', text: '#B8871F', icon: '#D9A441' },
  yopilgan: { bg: 'rgba(46, 158, 107, 0.12)', text: '#2E9E6B', icon: '#2E9E6B' },
  muddati_otgan: { bg: 'rgba(192, 57, 43, 0.12)', text: '#C0392B', icon: '#C0392B' },
  shubhali: { bg: 'rgba(142, 68, 173, 0.12)', text: '#8E44AD', icon: '#8E44AD' },
};

// ── Xavf Darajasi Colors (web bilan bir xil) ──────────
export const XavfColors: Record<string, { bg: string; text: string; border: string }> = {
  past: { bg: 'rgba(61, 111, 180, 0.12)', text: '#3D6FB4', border: '#B9CCE4' },
  orta: { bg: 'rgba(217, 164, 65, 0.14)', text: '#B8871F', border: '#E8D5A8' },
  yuqori: { bg: 'rgba(224, 123, 57, 0.12)', text: '#E07B39', border: '#F2C9AC' },
  kritik: { bg: 'rgba(192, 57, 43, 0.12)', text: '#C0392B', border: '#E5B3AC' },
};

// ── Typography ──────────────────────────────────────────
export const Fonts = {
  heading: 'Outfit',
  body: 'Inter',
  mono: 'JetBrainsMono',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
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
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// ── Spacing ─────────────────────────────────────────────
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ── Border Radius ───────────────────────────────────────
export const Radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
} as const;

// ── Shadows (navy tintli yumshoq) ───────────────────────
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0A1E3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.11,
    shadowRadius: 22,
    elevation: 7,
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
  maxWidth: 480, // Phone max content width
  tabBarHeight: 64,
  tabBarGap: 8,
  tabBarMargin: 16,
  headerHeight: 56,
} as const;

/**
 * Floating tab bar ostida kontent qolmasligi uchun kerakli pastki padding.
 * Barcha tab ekranlardagi ScrollView/FlatList contentContainerStyle'da ishlatiladi.
 */
export function tabBarContentPadding(insetBottom: number): number {
  return Layout.tabBarHeight + Math.max(insetBottom + Layout.tabBarGap, 12) + 16;
}

// ── Common Styles (reusable StyleSheet snippets) ───────
export const CommonStyles = {
  // Screen container
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Section padding
  contentPadding: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  // Standard input
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
  // Section title
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  // Empty state text
  emptyText: {
    textAlign: 'center' as const,
    color: Colors.textMuted,
    fontFamily: Fonts.body,
    fontSize: FontSizes.base,
  },
} as const;
