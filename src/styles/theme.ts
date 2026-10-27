export const darkColors = {
  background: '#030712',
  cardBackground: '#0b0f19',
  border: '#1e293b',
  text: '#ffffff',
  textMuted: '#9ca3af',
  purpleAccent: '#8b5cf6',
  gradientStart: '#7c3aed',
  gradientEnd: '#2563eb',
  cyanAccent: '#06b6d4',
  greenSuccess: '#10b981',
  redDanger: '#ef4444',
  orangeWarning: '#f59e0b',
  pinkAccent: '#ec4899',
  cardBackgroundLight: '#0f172a',
  blueAccent: '#3b82f6',
  darkPurpleGlow: '#231e58',
  outerGlow: '#080b1f',
};

export const lightColors = {
  background: '#f8fafc',
  cardBackground: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  purpleAccent: '#8b5cf6',
  gradientStart: '#7c3aed',
  gradientEnd: '#2563eb',
  cyanAccent: '#06b6d4',
  greenSuccess: '#10b981',
  redDanger: '#ef4444',
  orangeWarning: '#f59e0b',
  pinkAccent: '#ec4899',
  cardBackgroundLight: '#f1f5f9',
  blueAccent: '#3b82f6',
  darkPurpleGlow: '#ede9fe',
  outerGlow: '#e2e8f0',
};

// Default is light theme; dark mode is an optional preference
export const colors = lightColors;
export type ThemeColors = typeof lightColors;

export const theme = {
  colors,
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    black: 'System',
  },
};
