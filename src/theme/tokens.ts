// Токены дизайн-системы для светлой и тёмной темы
// Требования: 12.1.1, 12.1.2, 12.1.3, 12.1.4, 12.1.5

import type { ThemeTokens } from '../types/theme';

// Тёмная тема
const darkTokens = {
  colors: {
    background: { app: '#143B57', card: '#274966' },
    accent: { primary: '#2979FF' },
    text: { primary: '#FFFFFF', secondary: '#8A9BB5', tertiary: '#5C6A80' },
    button: {
      primary: { background: '#2979FF', text: '#FFFFFF' },
      secondary: { background: '#2E3650' },
    },
    border: { default: '#2E3650' },
    status: { error: '#FF5252', success: '#00C853' },
    navigation: { background: '#1A1F2E' },
    divider: '#2E3650',
    icon: { default: '#8A9BB5', active: '#00C853' },
  },
  spacing: { horizontal: 16, vertical: 12, sm: 8, md: 16, lg: 24 },
  borderRadius: { card: 12, sm: 4, md: 8, lg: 16 },
  typography: {
    fontFamily: { ios: 'SF Pro', android: 'Roboto' },
  },
};

// Светлая тема
const lightTokens = {
  colors: {
    background: { app: '#CCE0F2', card: '#E8F1FA' },
    accent: { primary: '#2979FF' },
    text: { primary: '#2C3E50', secondary: '#7F8C8D', tertiary: '#BDC3C7' },
    button: {
      primary: { background: '#2979FF', text: '#FFFFFF' },
      secondary: { background: '#E0EAF4' },
    },
    border: { default: '#E0EAF4' },
    status: { error: '#E74C3C', success: '#27AE60' },
    navigation: { background: '#FFFFFF' },
    divider: '#E0EAF4',
    icon: { default: '#7F8C8D', active: '#2979FF' },
  },
  spacing: { horizontal: 16, vertical: 12, sm: 8, md: 16, lg: 24 },
  borderRadius: { card: 12, sm: 4, md: 8, lg: 16 },
  typography: {
    fontFamily: { ios: 'SF Pro', android: 'Roboto' },
  },
};

// Экспорт токенов
export const themes: Record<'light' | 'dark', ThemeTokens> = {
  dark: darkTokens,
  light: lightTokens,
};
