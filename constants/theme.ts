import type { Colors } from '../context/ThemeContext';
import { BRAND } from './colours';

export const lightColors: Colors = {
  background: '#F4F6FB',
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: BRAND.primary,
  primaryLight: BRAND.primaryLight,
  danger: BRAND.danger,
  success: BRAND.success,
  tabBar: '#FFFFFF',
  inputBg: '#F9FAFB',
};

export const darkColors: Colors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#334155',
  primary: BRAND.primaryDark,
  primaryLight: BRAND.primaryLightDark,
  danger: BRAND.dangerDark,
  success: BRAND.successDark,
  tabBar: '#1E293B',
  inputBg: '#0F172A',
};
