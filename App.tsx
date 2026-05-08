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
import i18n from './src/i18n'; // Инициализация i18next
import { I18nextProvider, useTranslation } from 'react-i18next';
import { initializeDatabase } from './src/services/database';
import { AlertProvider, useAlert } from './src/theme/AlertContext';
import { airlineUpdateService } from './src/services/AirlineUpdateService';

/**
 * RootUpdater - фоновый компонент для автоматических задач (раз в неделю)
 */
function RootUpdater() {
  const { showAlert } = useAlert();
  const { t } = useTranslation();

  React.useEffect(() => {
    // Запускаем через 2 секунды после старта, чтобы не мешать загрузке
    const timer = setTimeout(async () => {
      try {
        const changes = await airlineUpdateService.checkAutoUpdate();
        if (changes && changes.length > 0) {
          const message = changes.map(c => 
            `• ${c.airlineName}: ${c.oldHours}h → ${c.newHours}h`
          ).join('\n');

          showAlert({
            title: t('settings.updateSuccessTitle'),
            message: `${t('settings.updateSuccessMessage')}\n\n${message}`,
            buttons: [{ text: t('common.ok') }]
          });
        }
      } catch (e) {
        console.error('[RootUpdater] Auto-update failed:', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}


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
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AlertProvider>
          <RootUpdater />
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
    </I18nextProvider>
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
