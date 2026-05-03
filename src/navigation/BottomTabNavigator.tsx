/**
 * Bottom Tab Navigator
 * 
 * Главная навигация приложения с 4 вкладками:
 * - Scanner (сканирование)
 * - History (история)
 * - Airlines (авиакомпании)
 * - Settings (настройки)
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BottomTabParamList } from './types';

// Импорт экранов
import { ScannerScreen } from '../screens/ScannerScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AirlinesScreen } from '../screens/AirlinesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Импорт иконок (используем простые эмодзи для MVP, потом заменим на react-native-vector-icons)
const ScanIcon = '📷';
const HistoryIcon = '📋';
const AirlineIcon = '✈️';
const SettingsIcon = '⚙️';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        // Стиль таб-бара (pill-shaped)
        tabBarStyle: {
          backgroundColor: tokens.colors.navigation.background,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          paddingHorizontal: 16,
        },
        
        // Стиль лейбла
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        
        // Цвета активной/неактивной вкладки
        tabBarActiveTintColor: tokens.colors.icon.active,
        tabBarInactiveTintColor: tokens.colors.icon.default,
        
        // Стиль хедера
        headerStyle: {
          backgroundColor: tokens.colors.background.app,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          color: tokens.colors.text.primary,
          fontSize: 20,
          fontWeight: '600',
        },
        
        // Анимация
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          title: t('scanner.title'),
          tabBarLabel: t('scanner.tab'),
          tabBarIcon: ({ focused, color, size }) => <Text style={{ fontSize: size }}>{ScanIcon}</Text>,
        }}
      />
      
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: t('ticket.history'),
          tabBarLabel: t('ticket.history_tab'),
          tabBarIcon: ({ focused, color, size }) => <Text style={{ fontSize: size }}>{HistoryIcon}</Text>,
        }}
      />
      
      <Tab.Screen
        name="Airlines"
        component={AirlinesScreen}
        options={{
          title: t('airline.list_title'),
          tabBarLabel: t('airline.tab'),
          tabBarIcon: ({ focused, color, size }) => <Text style={{ fontSize: size }}>{AirlineIcon}</Text>,
        }}
      />
      
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.tab'),
          tabBarIcon: ({ focused, color, size }) => <Text style={{ fontSize: size }}>{SettingsIcon}</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
