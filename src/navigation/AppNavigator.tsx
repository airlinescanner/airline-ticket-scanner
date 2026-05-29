/**
 * Главный навигатор приложения
 * 
 * Объединяет Stack Navigator и Bottom Tab Navigator
 */

import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from './types';

// Импорт навигаторов и экранов
import { BottomTabNavigator } from './BottomTabNavigator';
import { ScanResultScreen } from '../screens/ScanResultScreen';
import { RegistrationDateScreen } from '../screens/RegistrationDateScreen';
import { AirlineDetailScreen } from '../screens/AirlineDetailScreen';
import { TicketDetailScreen } from '../screens/TicketDetailScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Ref для навигации из уведомлений и других внешних источников
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { tokens, resolvedTheme } = useTheme();
  const headerTopColor = resolvedTheme === 'dark' ? '#082D52' : '#DFEAF5';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: headerTopColor,
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
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="TicketDetail"
          component={TicketDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripDetail"
          component={TripDetailScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
