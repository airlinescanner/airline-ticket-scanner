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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppNavigator, navigationRef } from './src/navigation/AppNavigator';
import i18n from './src/i18n'; // Инициализация i18next
import { I18nextProvider, useTranslation } from 'react-i18next';
import { initializeDatabase } from './src/services/database';
import { AlertProvider, useAlert } from './src/theme/AlertContext';
import { notificationScheduler } from './src/services/NotificationScheduler';
import * as Notifications from 'expo-notifications';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { airlineUpdateService } from './src/services/AirlineUpdateService';

/**
 * RootUpdater - фоновый компонент для автоматических задач (раз в неделю)
 */
function RootUpdater() {
  const { showAlert } = useAlert();
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    const checkAndSync = async () => {
      try {
        const lastUpdateStr = await AsyncStorage.getItem('@last_airline_update_date');
        const now = new Date();
        let shouldSync = false;

        if (!lastUpdateStr) {
          shouldSync = true;
        } else {
          const lastUpdate = new Date(lastUpdateStr);
          const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 7) {
            shouldSync = true;
          }
        }

        if (shouldSync) {
          console.log('[RootUpdater] Starting weekly automatic airline sync...');
          const report = await airlineUpdateService.performUpdate();
          
          const isRu = i18n.language === 'ru';
          const isUk = i18n.language === 'uk';
          const successTitle = isRu 
            ? 'Обновление базы авиакомпаний' 
            : isUk 
            ? 'Оновлення бази авіакомпаній' 
            : 'Airline Database Update';

          if (report.changes.length > 0) {
            const successMessage = isRu
              ? `Правила регистрации были автоматически обновлены. Найдено ${report.changes.length} изменений.`
              : isUk
              ? `Правила реєстрації були автоматично оновлені. Знайдено ${report.changes.length} змін.`
              : `Registration rules have been automatically updated. Found ${report.changes.length} changes.`;

            showAlert({
              title: successTitle,
              message: successMessage,
              buttons: [{ text: t('common.ok') }]
            });
          } else {
            const noChangesMessage = isRu
              ? 'База авиакомпаний проверена. Новых изменений нет.'
              : isUk
              ? 'Базу авіакомпаній перевірено. Нових змін немає.'
              : 'Airline database checked. No new changes.';

            showAlert({
              title: successTitle,
              message: noChangesMessage,
              buttons: [{ text: t('common.ok') }]
            });
          }
        }
      } catch (e) {
        console.error('[RootUpdater] Auto-sync error:', e);
      }
    };

    const timer = setTimeout(checkAndSync, 5000);
    return () => clearTimeout(timer);
  }, [showAlert, t, i18n.language]);

  return null;
}

/**
 * Компонент загрузки (без ThemeContext, так как рендерится до ThemeProvider)
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>
        ✈️
      </Text>
      <Text style={styles.loadingSubtext}>
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

    // Запрос разрешений на уведомления при старте
    notificationScheduler.requestPermission();
  }, []);

  // Обработчик нажатия на уведомление — навигация к билету
  React.useEffect(() => {
    // Listener: уведомление получено (foreground)
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[App] 🔔 Notification received in foreground:', notification.request.content.title);
    });

    // Listener: пользователь нажал на уведомление
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[App] 👆 Notification tapped, data:', data);

      if (data?.ticketId && navigationRef.current?.isReady()) {
        // Навигация к деталям билета
        navigationRef.current.navigate('TicketDetail', { ticketId: data.ticketId as number });
      }
    });

    // Проверяем, не было ли уведомление, которое открыло приложение (cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        console.log('[App] 🚀 App opened from notification, data:', data);
        // Задержка, чтобы навигация успела инициализироваться
        setTimeout(() => {
          if (data?.ticketId && navigationRef.current?.isReady()) {
            navigationRef.current.navigate('TicketDetail', { ticketId: data.ticketId as number });
          }
        }, 1000);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Показываем загрузку ДО инициализации ThemeProvider
  if (!isDbReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <AlertProvider>
            <StatusBar style="auto" />
            <RootUpdater />
            <AppNavigator />
          </AlertProvider>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1F2E', // Темний фон за замовчуванням
  },
  loadingText: {
    fontSize: 64,
    marginBottom: 16,
    color: '#FFFFFF',
  },
  loadingSubtext: {
    fontSize: 18,
    color: '#8A9BB5',
  },
});
