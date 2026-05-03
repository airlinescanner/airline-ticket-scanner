/**
 * Главный навигатор приложения
 * 
 * Объединяет Stack Navigator и Bottom Tab Navigator
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from './types';

// Импорт навигаторов и экранов
import { BottomTabNavigator } from './BottomTabNavigator';
import { ScanResultScreen } from '../screens/ScanResultScreen';
import { RegistrationDateScreen } from '../screens/RegistrationDateScreen';
import { AirlineDetailScreen } from '../screens/AirlineDetailScreen';
import { TicketDetailScreen } from '../screens/TicketDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { tokens } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: tokens.colors.background.app,
          },
          headerTitleStyle: {
            color: tokens.colors.text.primary,
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: tokens.colors.icon.active,
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Главный таб-навигатор */}
        <Stack.Screen
          name="MainTabs"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />

        {/* Экраны поверх табов */}
        <Stack.Screen
          name="ScanResult"
          component={ScanResultScreen}
          options={{ title: 'Результат сканування' }}
        />

        <Stack.Screen
          name="RegistrationDate"
          component={RegistrationDateScreen}
          options={{ title: 'Дата реєстрації' }}
        />

        <Stack.Screen
          name="AirlineDetail"
          component={AirlineDetailScreen}
          options={{ title: 'Авіакомпанія' }}
        />

        <Stack.Screen
          name="TicketDetail"
          component={TicketDetailScreen}
          options={{ title: 'Деталі квитка' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
