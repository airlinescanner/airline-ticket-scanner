import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: tokens.colors.text.secondary }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: tokens?.colors?.background?.card || '#FFFFFF',
            color: tokens?.colors?.text?.primary || '#000000',
            borderColor: error 
              ? (tokens?.colors?.status?.error || 'red') 
              : (tokens?.colors?.border?.default || '#CCCCCC'),
            borderRadius: tokens?.borderRadius?.md || 8,
            padding: tokens?.spacing?.md || 12,
          },
          style,
        ]}
        placeholderTextColor={tokens.colors.text.tertiary}
        {...props}
      />
      {error && (
        <Text style={[styles.error, { color: tokens.colors.status.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
