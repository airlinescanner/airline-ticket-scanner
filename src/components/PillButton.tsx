// PillButton — кнопка в форме таблетки (pill shape)
// Требования: 12.2.9

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type ButtonVariant = 'primary' | 'secondary';

interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * PillButton — кнопка-таблетка с двумя вариантами
 * 
 * Варианты:
 * - primary: фон #2979FF, белый текст (tokens.button.primary)
 * - secondary: фон из tokens.button.secondary, текст primary
 * 
 * Форма: pill-shaped (большой borderRadius для эффекта таблетки)
 */
export function PillButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: PillButtonProps): React.JSX.Element {
  const { tokens } = useTheme();

  // Определяем стили в зависимости от варианта
  const buttonStyle: ViewStyle = {
    backgroundColor:
      variant === 'primary'
        ? tokens.colors.button.primary.background
        : tokens.colors.button.secondary.background,
    opacity: disabled ? 0.5 : 1,
  };

  const textStyle: TextStyle = {
    color:
      variant === 'primary'
        ? tokens.colors.button.primary.text
        : tokens.colors.text.primary,
    fontFamily:
      Platform.OS === 'ios'
        ? tokens.typography.fontFamily.ios
        : tokens.typography.fontFamily.android,
  };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24, // Pill shape — большой радиус для эффекта таблетки
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
