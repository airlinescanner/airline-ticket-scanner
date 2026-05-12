import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  warning?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, warning, style, ...props }) => {
  const { tokens } = useTheme();

  const getBorderColor = () => {
    if (error) return tokens?.colors?.status?.error || 'red';
    if (warning) return '#FFCC00'; // Yellow for warnings
    return tokens?.colors?.border?.default || '#CCCCCC';
  };

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
            borderColor: getBorderColor(),
            borderRadius: tokens?.borderRadius?.md || 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderWidth: (error || warning) ? 2 : 1,
          },
          style,
        ]}
        placeholderTextColor={tokens.colors.text.tertiary}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: tokens.colors.status.error }]}>
          {error}
        </Text>
      ) : warning ? (
        <Text style={[styles.error, { color: '#FFCC00' }]}>
          {warning}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
