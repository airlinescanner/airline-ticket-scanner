// ThemeContext — управление темой оформления приложения
// Требования: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode, ThemeContextValue, ThemeTokens } from '../types/theme';
import { themes } from './tokens';

// Ключ для сохранения темы в AsyncStorage
const THEME_STORAGE_KEY = '@airline_scanner:theme_mode';

// Создаем контекст с undefined по умолчанию (будет заполнен в Provider)
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider — провайдер контекста темы
 * 
 * Функциональность:
 * - Управление режимом темы (light/dark/system)
 * - Подписка на системную тему через Appearance API
 * - Сохранение выбранной темы в AsyncStorage
 * - Автоматическое восстановление темы при запуске
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  // Текущий режим темы (light/dark/system)
  const [mode, setModeState] = useState<ThemeMode>('dark');
  
  // Разрешенная тема (light или dark) — результат применения режима 'system'
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  /**
   * Определяет разрешенную тему на основе режима и системной темы
   */
  const resolveTheme = useCallback((themeMode: ThemeMode, systemTheme: ColorSchemeName): 'light' | 'dark' => {
    if (themeMode === 'system') {
      // Если системная тема null или неизвестна, используем светлую по умолчанию
      return systemTheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, []);

  /**
   * Обработчик изменения системной темы
   */
  const handleSystemThemeChange = useCallback((preferences: Appearance.AppearancePreferences) => {
    setResolvedTheme((currentResolved) => {
      // Обновляем разрешенную тему только если текущий режим — 'system'
      setModeState((currentMode) => {
        if (currentMode === 'system') {
          const newResolved = resolveTheme(currentMode, preferences.colorScheme);
          return currentMode; // Возвращаем тот же режим, но обновляем resolvedTheme через setResolvedTheme
        }
        return currentMode;
      });
      
      // Вычисляем новую разрешенную тему
      return resolveTheme(mode, preferences.colorScheme);
    });
  }, [mode, resolveTheme]);

  /**
   * Устанавливает новый режим темы
   * Требования: 8.2 — немедленное применение темы без перезапуска
   */
  const setMode = useCallback(async (newMode: ThemeMode) => {
    try {
      // Сохраняем в AsyncStorage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
      
      // Обновляем состояние
      setModeState(newMode);
      
      // Вычисляем и применяем разрешенную тему
      const systemTheme = Appearance.getColorScheme();
      const newResolved = resolveTheme(newMode, systemTheme);
      setResolvedTheme(newResolved);
    } catch (error) {
      console.error('Ошибка сохранения темы:', error);
    }
  }, [resolveTheme]);

  /**
   * Восстанавливает сохраненную тему при запуске приложения
   * Требования: 8.3 — восстановление темы при следующем запуске
   * Требования: 8.6 — светлая тема по умолчанию, если настройки недоступны
   */
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const systemTheme = Appearance.getColorScheme();
        
        if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
          setModeState(savedMode as ThemeMode);
          setResolvedTheme(resolveTheme(savedMode as ThemeMode, systemTheme));
        } else {
          // Требование 8.6: темная тема по умолчанию
          setModeState('dark');
          setResolvedTheme('dark');
        }
      } catch (error) {
        console.error('Ошибка загрузки темы:', error);
        // При ошибке применяем темную тему по умолчанию
        setModeState('dark');
        setResolvedTheme('dark');
      }
    };

    loadSavedTheme();
  }, [resolveTheme]);

  /**
   * Подписка на изменения системной темы
   * Требования: 8.4 — опция "Системная" для автоматического следования теме ОС
   * Требования: 8.5 — автоматическое переключение при изменении системной темы
   */
  useEffect(() => {
    const subscription = Appearance.addChangeListener(handleSystemThemeChange);

    // Отписываемся при размонтировании
    return () => {
      subscription.remove();
    };
  }, [handleSystemThemeChange]);

  // Получаем токены для текущей разрешенной темы
  const tokens: ThemeTokens = themes[resolvedTheme];

  const value: ThemeContextValue = {
    mode,
    resolvedTheme,
    tokens,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Хук для доступа к контексту темы
 * Выбрасывает ошибку, если используется вне ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }
  
  return context;
}
