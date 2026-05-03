// Типы для темизации
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeTokens {
  colors: {
    background: { app: string; card: string };
    accent: { primary: string };
    text: { primary: string; secondary: string; tertiary: string };
    button: {
      primary: { background: string; text: string };
      secondary: { background: string };
    };
    border: { default: string };
    status: { error: string; success: string };
    navigation: { background: string };
    divider: string;
    icon: { default: string; active: string };
  };
  spacing: { horizontal: number; vertical: number; sm: number; md: number; lg: number };
  borderRadius: { card: number; sm: number; md: number; lg: number };
  typography: {
    fontFamily: { ios: string; android: string };
  };
}

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  tokens: ThemeTokens;
  setMode(mode: ThemeMode): void;
}
