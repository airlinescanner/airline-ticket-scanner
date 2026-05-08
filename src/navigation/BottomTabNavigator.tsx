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
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BottomTabParamList } from './types';

// Импорт экранов
import { ScannerScreen } from '../screens/ScannerScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AirlinesScreen } from '../screens/AirlinesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { tokens, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const headerTopColor = resolvedTheme === 'dark' ? '#082D52' : '#DFEAF5';

  return (
    <Tab.Navigator
      screenOptions={{
        // Стиль таб-бара (pill-shaped)
        tabBarStyle: {
          backgroundColor: tokens.colors.navigation.background,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: 24,
          right: 24,
          borderRadius: 32,
          height: 64,
          paddingBottom: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        },
        
        // Стиль лейбла
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        
        // Цвета активной/неактивной вкладки
        tabBarActiveTintColor: tokens.colors.icon.active,
        tabBarInactiveTintColor: tokens.colors.icon.default,
        
        // Стиль хедера
        headerStyle: {
          backgroundColor: headerTopColor,
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
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={20} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: t('ticket.history'),
          tabBarLabel: t('ticket.history_tab'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={20} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Airlines"
        component={AirlinesScreen}
        options={{
          title: t('airline.list_title'),
          tabBarLabel: t('airline.tab'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'airplane' : 'airplane-outline'} size={20} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.tab'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
