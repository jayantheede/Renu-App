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

// Base colors mapped to the AI Agriculture spec
const baseColors = {
  primary: '#2D6640',       // Deep forest green brand color
  primaryContainer: '#98D6A4',
  secondary: '#FF8F00',     // Warm amber for offers/promotions
  secondaryContainer: '#FFF2C2',
  tertiary: '#5D9C68',      // Muted green for alerts/reminders
  error: '#FF5252',         // Red for errors
  success: '#3F784C',       // Green for success
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: customFonts,
  roundness: 6, // Multiplier for corner radius (approx 24px for cards)
  colors: {
    ...MD3LightTheme.colors,
    ...baseColors,
    background: '#F0F4F1',  // Very light green/gray neutral
    surface: '#FFFFFF',     // Clean white cards
    surfaceVariant: 'rgba(255, 255, 255, 0.7)', // Translucent surface for glassmorphism
    onSurfaceVariant: '#4E6B56', // Neutral green-gray for secondary text
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: customFonts,
  roundness: 6,
  colors: {
    ...MD3DarkTheme.colors,
    ...baseColors,
    primary: '#4CAF50',       // Lighter green for dark mode contrast
    background: '#121C14',    // True dark with slight green tint
    surface: '#1A2E20',       // Elevated dark surface
    surfaceVariant: 'rgba(26, 46, 32, 0.7)', // Translucent surface for glassmorphism
    onSurfaceVariant: '#9DBBA4', // Lighter green-gray for secondary text
  },
};
