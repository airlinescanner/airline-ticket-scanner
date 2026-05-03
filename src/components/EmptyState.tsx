// EmptyState — компонент для отображения пустых состояний списков
// Требования: 12.2.8, 12.2.10

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface EmptyStateProps {
  message: string;
  icon?: string; // Опциональная иконка (emoji или символ)
}

/**
 * EmptyState — компонент для пустых состояний
 * 
 * Используется когда:
 * - История билетов пуста
 * - Поиск авиакомпаний не дал результатов
 * - Любой другой пустой список
 * 
 * Применяет токены:
 * - colors.text.secondary для текста сообщения
 * - spacing.vertical для отступов
 * - typography.fontFamily для системного шрифта
 */
export function EmptyState({ message, icon }: EmptyStateProps): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: tokens.spacing.vertical * 4, // 48px вертикальный отступ
        },
      ]}
    >
      {icon && (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text
        style={[
          styles.message,
          {
            color: tokens.colors.text.secondary,
            fontFamily:
              Platform.OS === 'ios'
                ? tokens.typography.fontFamily.ios
                : tokens.typography.fontFamily.android,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
