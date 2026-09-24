/**
 * Design tokens: "Bold & dark". One dark theme; every screen and component
 * takes its colors, type, spacing and radii from here.
 */
import { TextStyle } from 'react-native';

export const colors = {
  bg: '#0B0B12',
  bgElevated: '#13131E',
  surface: 'rgba(255,255,255,0.06)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',

  text: '#F4F4FA',
  textSecondary: '#A6A6BF',
  textMuted: '#6C6C88',

  cyan: '#00E5FF',
  pink: '#FF2E93',
  violet: '#8B5CFF',

  /** "erreichbar" */
  available: '#00E5FF',
  offline: '#4A4A63',
  danger: '#FF3B5C',
  warning: '#FFB547',
  success: '#3DF5A7',

  overlay: 'rgba(5,5,10,0.72)',
} as const;

/** Brand gradient, cyan -> pink */
export const gradients = {
  brand: ['#00E5FF', '#8B5CFF', '#FF2E93'] as const,
  brandSoft: ['rgba(0,229,255,0.22)', 'rgba(255,46,147,0.18)'] as const,
  danger: ['#FF3B5C', '#FF2E93'] as const,
  offline: ['#2A2A3D', '#1B1B29'] as const,
};

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  h1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  title: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

/** Bottom padding for tab screens so content clears the floating tab bar. */
export const TAB_BAR_SPACE = 110;

/** Neon glow as an iOS shadow (Android falls back to elevation). */
export const glow = (color: string = colors.cyan, strength = 0.6) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: strength,
  shadowRadius: 18,
  elevation: 8,
});
