/**
 * Главный файл приложения Airline Ticket Scanner
 * 
 * Инициализирует:
 * - Базу данных SQLite
 * - Систему навигации
 * - Темизацию
 * - Локализацию
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import './src/i18n'; // Инициализация i18next
import { initializeDatabase } from './src/services/database';
import { AlertProvider } from './src/theme/AlertContext';


/**
 * Компонент загрузки
 */
function LoadingScreen() {
  const { tokens } = useTheme();

  return (
    <View style={[styles.loadingContainer, { backgroundColor: tokens.colors.background.app }]}>
      <Text style={[styles.loadingText, { color: tokens.colors.text.primary }]}>
        ✈️
      </Text>
      <Text style={[styles.loadingSubtext, { color: tokens.colors.text.secondary }]}>
        Завантаження...
      </Text>
    </View>
  );
}

/**
 * Главный компонент приложения с ThemeProvider
 */
export default function App() {
  const [isDbReady, setIsDbReady] = React.useState(false);

  // Инициализация базы данных при запуске
  React.useEffect(() => {
    initializeDatabase()
      .then(() => {
        console.log('✅ Database initialized successfully');
        setIsDbReady(true);
      })
      .catch((error) => {
        console.error('❌ Database initialization failed:', error);
        // Всё равно показываем приложение, но без данных
        setIsDbReady(true);
      });
  }, []);

  return (
    <ThemeProvider>
      <AlertProvider>
        {!isDbReady ? (
          <LoadingScreen />
        ) : (
          <>
            <StatusBar style="auto" />
            <AppNavigator />
          </>
        )}
      </AlertProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingSubtext: {
    fontSize: 18,
  },
});
