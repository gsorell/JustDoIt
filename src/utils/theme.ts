export const colors = {
  background: '#FFFFFF',
  surface: '#F4F4F5',
  border: '#E4E4E7',
  text: '#18181B',
  textSecondary: '#71717A',
  textMuted: '#A1A1AA',
  do: '#22C55E',
  dont: '#EF4444',
  doLight: '#DCFCE7',
  dontLight: '#FEE2E2',
  accent: '#6366F1',
  accentLight: '#EEF2FF',
  success: '#22C55E',
  failure: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
  xxxl: 56,
};

export const fontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};
