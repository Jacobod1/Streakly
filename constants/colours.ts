// Brand colours — single source of truth
export const BRAND = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryDark: '#60A5FA',
  primaryLightDark: '#1E3A5F',

  danger: '#EF4444',
  dangerDark: '#F87171',

  success: '#22C55E',
  successDark: '#4ADE80',

  warning: '#F59E0B',
  warningDark: '#FBBF24',
} as const;

export type BrandColor = typeof BRAND[keyof typeof BRAND];
