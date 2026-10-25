import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Typography Configuration (Standardizing on clean Sans-Serif)
const fontConfig = {
  fontFamily: 'System', // Will map to San Francisco on iOS, Roboto on Android
  letterSpacing: 0,
};

const customFonts = {
  displayLarge: { ...fontConfig, fontWeight: '700', fontSize: 57, lineHeight: 64 },
  displayMedium: { ...fontConfig, fontWeight: '700', fontSize: 45, lineHeight: 52 },
  displaySmall: { ...fontConfig, fontWeight: '700', fontSize: 36, lineHeight: 44 },
  headlineLarge: { ...fontConfig, fontWeight: '600', fontSize: 32, lineHeight: 40 },
  headlineMedium: { ...fontConfig, fontWeight: '600', fontSize: 28, lineHeight: 36 },
  headlineSmall: { ...fontConfig, fontWeight: '600', fontSize: 24, lineHeight: 32 },
  titleLarge: { ...fontConfig, fontWeight: '600', fontSize: 22, lineHeight: 28 },
  titleMedium: { ...fontConfig, fontWeight: '500', fontSize: 16, lineHeight: 24 },
  titleSmall: { ...fontConfig, fontWeight: '500', fontSize: 14, lineHeight: 20 },
  labelLarge: { ...fontConfig, fontWeight: '600', fontSize: 14, lineHeight: 20 },
  labelMedium: { ...fontConfig, fontWeight: '600', fontSize: 12, lineHeight: 16 },
  labelSmall: { ...fontConfig, fontWeight: '600', fontSize: 11, lineHeight: 16 },
  bodyLarge: { ...fontConfig, fontWeight: '400', fontSize: 16, lineHeight: 24 },
  bodyMedium: { ...fontConfig, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  bodySmall: { ...fontConfig, fontWeight: '400', fontSize: 12, lineHeight: 16 },
};

// Official ReNu-Biome Brand Colors
export const BRAND_COLORS = {
  primary: '#0C6054', // Teal (primary)
  primaryTeal: '#0C6054', // Explicit Teal alias
  accent: '#F07E42', // Orange (accent)
  accentOrange: '#F07E42', // Explicit Orange alias
  secondary: '#F07E42',
  darkTeal: '#083F38', // Dark teal (headers & gradients)
  lightTeal: '#16837A', // Lighter teal (gradients)
  tealSoft: '#E6F3F1', // Soft tinted background
  orangeSoft: '#FEF0E8', // Soft orange tint
  gradient: ['#083F38', '#0C6054', '#16837A'] as const,
  cardBackground: '#FFFFFF',
  neutralBackground: '#F8FAFC',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  success: '#15803D',
  error: '#DC2626',
  warning: '#D97706',
};

// Base colors mapped to the ReNu-Biome brand spec
const baseColors = {
  primary: BRAND_COLORS.primary,
  primaryContainer: '#99D5CE',
  secondary: BRAND_COLORS.accent,
  secondaryContainer: '#FCE0D2',
  tertiary: BRAND_COLORS.lightTeal,
  error: '#DC2626',
  success: '#15803D',
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: customFonts,
  roundness: 6, // Multiplier for corner radius (approx 24px for cards)
  colors: {
    ...MD3LightTheme.colors,
    ...baseColors,
    background: '#F8FAFC', // Clean neutral background
    surface: '#FFFFFF', // Clean white cards
    surfaceVariant: 'rgba(255, 255, 255, 0.95)',
    onSurfaceVariant: '#0C6054',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: customFonts,
  roundness: 6,
  colors: {
    ...MD3DarkTheme.colors,
    ...baseColors,
    primary: '#16837A',
    background: '#081D1A',
    surface: '#0F2E2A',
    surfaceVariant: 'rgba(15, 46, 42, 0.85)',
    onSurfaceVariant: '#99D5CE',
  },
};
