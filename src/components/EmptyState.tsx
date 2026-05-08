import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: string;
}

/**
 * EmptyState — компонент для пустых состояний
 */
export function EmptyState({ title, message, icon }: EmptyStateProps): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: tokens.colors.background.card }]}>
          <Ionicons name={icon as any} size={64} color={tokens.colors.text.secondary} />
        </View>
      )}
      {title && (
        <Text style={[styles.title, { color: tokens.colors.text.primary }]}>
          {title}
        </Text>
      )}
      <Text style={[styles.message, { color: tokens.colors.text.secondary }]}>
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
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
