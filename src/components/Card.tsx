// Card — карточка с применением токенов дизайн-системы
// Требования: 12.2.6, 12.2.7

import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Card — базовый компонент карточки
 * 
 * Применяет токены:
 * - borderRadius.card для скругления углов
 * - colors.background.card для фона
 * - elevation для Android (тень через системный API)
 * - shadow для iOS (shadowOpacity, shadowRadius, shadowOffset)
 * 
 * Требование 12.2.7: В светлой теме применяется elevation: 2 (Android) и shadowOpacity: 0.08 (iOS)
 */
export function Card({ children, style }: CardProps): React.JSX.Element {
  const { tokens, resolvedTheme } = useTheme();

  // Применяем тень только в светлой теме (Требование 12.2.7)
  const shadowStyle: ViewStyle = resolvedTheme === 'light'
    ? Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        },
        android: {
          elevation: 2,
        },
      }) || {}
    : {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.background.card,
          borderRadius: tokens.borderRadius.card,
        },
        shadowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    overflow: 'hidden', // Обрезаем контент по borderRadius
  },
});
