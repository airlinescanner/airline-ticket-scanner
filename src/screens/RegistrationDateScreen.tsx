/**
 * Экран даты регистрации
 * 
 * Отображает вычисленную дату открытия регистрации и информацию об авиакомпании
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrationDate'>;

export const RegistrationDateScreen: React.FC<Props> = ({ route }) => {
  const { tokens } = useTheme();
  const { ticketId } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <Text style={[styles.text, { color: tokens.colors.text.primary }]}>
        Registration Date Screen (TODO)
      </Text>
      <Text style={[styles.text, { color: tokens.colors.text.secondary }]}>
        Ticket ID: {ticketId}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});
