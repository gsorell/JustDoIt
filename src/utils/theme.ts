import { Platform } from 'react-native';

export const colors = {
  background: '#0F0F18',
  surface: '#15151F',
  card: '#1C1C28',
  cardElevated: '#222232',
  border: '#252538',
  borderBright: '#333348',
  text: '#F0F0FA',
  textSecondary: '#7878A0',
  textMuted: '#3E3E5A',
  do: '#00E676',
  dont: '#FF4466',
  doLight: 'rgba(0,230,118,0.10)',
  dontLight: 'rgba(255,68,102,0.10)',
  doGlow: 'rgba(0,230,118,0.18)',
  dontGlow: 'rgba(255,68,102,0.18)',
  accent: '#7C6BFF',
  accentLight: 'rgba(124,107,255,0.12)',
  success: '#00E676',
  failure: '#FF4466',
  warning: '#FFB300',
  white: '#FFFFFF',
  black: '#000000',
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 19,
  xl: 26,
  xxl: 38,
  xxxl: 60,
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
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.4)' } : {}),
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 4px 16px rgba(0,0,0,0.5)' } : {}),
  },
} as const;
