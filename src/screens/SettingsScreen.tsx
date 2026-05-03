/**
 * Экран настроек
 * 
 * Управление темой, языком и резервным копированием
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export const SettingsScreen: React.FC = () => {
  const { tokens } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <Text style={[styles.text, { color: tokens.colors.text.primary }]}>
        Settings Screen (TODO)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});
