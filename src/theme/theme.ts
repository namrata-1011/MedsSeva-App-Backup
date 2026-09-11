export const COLORS = {
  // Premium Teal Theme
  primary: '#006D6F',
  secondary: '#0A7C7E',
  primaryLight: '#008486',
  
  accent: '#006D6F', // Main interactive elements
  discountGreen: '#7FBF75',

  background: '#F5F7F8', // Light background
  surface: '#FFFFFF',
  border: '#DDE5E7',

  textDark: '#1B1B1B', // Text
  textSecondary: '#667085', // Muted Text
  textLight: '#FFFFFF', 

  success: '#10B981',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Fallbacks for compatibility
  bgGradientStart: '#F5F7F8',
  bgGradientEnd: '#F5F7F8',
  glassBorder: '#DDE5E7',
  glassBg: '#FFFFFF',
  glassBgLight: '#FFFFFF',
  textPrimary: '#1B1B1B',
};

export const TYPOGRAPHY = {
  fontFamily: 'System', 
  hero: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: COLORS.textDark,
  },
  h1: {
    fontSize: 26,
    fontWeight: 'bold' as const,
    color: COLORS.textDark,
  },
  h2: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: COLORS.textDark,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    color: COLORS.textSecondary,
  },
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  }
};
