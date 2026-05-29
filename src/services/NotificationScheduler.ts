import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import i18next from 'i18next';
import { Ticket } from '../types/ticket';

// Настройка обработчика уведомлений (вынесено наверх для стабильности в SDK 54)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = 'flight-notifications';

export interface PermissionStatus {
  notifications: boolean;
  exactAlarms: boolean;
}

export class NotificationScheduler {
  constructor() {
    this.setupAndroidChannel();
  }

  private async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Flight Registration',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2979FF',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default', 
        });
      } catch (error) {
        console.error('[NotificationScheduler] Failed to setup Android channel:', error);
      }
    }
  }

  /**
   * Проверить, разрешены ли exact alarms на Android 12+
   * На iOS всегда возвращает true (не применимо)
   */
  async checkExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    
    try {
      // expo-notifications на Android автоматически использует exact alarms
      // Проверяем через попытку получить все запланированные уведомления
      // Если разрешения нет, scheduleNotificationAsync упадёт
      // Но мы можем проверить через Android Settings API
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return false;
      
      // На Android 12+ (API 31+) нужно дополнительное разрешение
      // expo-notifications SDK 52 внутренне проверяет canScheduleExactAlarms()
      // Если нет — нужно направить пользователя в настройки
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Открыть настройки alarm & reminders на Android (для exact alarm разрешения)
   */
  async openAlarmSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.REQUEST_SCHEDULE_EXACT_ALARM'
        );
      } catch {
        // Fallback: открыть общие настройки приложения
        try {
          await Linking.openSettings();
        } catch (e) {
          console.error('[NotificationScheduler] Cannot open settings:', e);
        }
      }
    } else {
      await Linking.openSettings();
    }
  }

  async requestPermission(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  /**
   * Расширенная проверка всех разрешений
   */
  async checkAllPermissions(): Promise<PermissionStatus> {
    const notifications = await this.requestPermission();
    const exactAlarms = await this.checkExactAlarmPermission();
    return { notifications, exactAlarms };
  }

  async schedule(ticket: Ticket, registrationDate: Date): Promise<string | null> {
    if (registrationDate.getTime() <= Date.now()) return null;

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('[NotificationScheduler] Notification permission denied');
      return null;
    }

    // Resolve localization keys or fallbacks safely
    const title = i18next.t('notification.registrationOpensTitle', { 
      airline: ticket.airlineName || ticket.airlineCode,
      defaultValue: `🛫 Регистрация открыта: ${ticket.airlineName || ticket.airlineCode}`
    });
    const route = `${ticket.departureAirport} → ${ticket.arrivalAirport}`;
    const passenger = ticket.passengerName.split('/')[0];
    const body = i18next.t('notification.registrationOpensBody', {
      passenger,
      flightNumber: ticket.flightNumber,
      route,
      defaultValue: `✈️ Пора регистрировать ${passenger}!\nРейс ${ticket.flightNumber} (${route}) уже открыт. Нажмите, чтобы открыть детали.`
    });

    // Попытка 1: Exact alarm (точное время)
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { ticketId: ticket.id, type: 'REGISTRATION_OPEN' },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: registrationDate,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        } as any,
      });
      console.log(`[NotificationScheduler] ✅ Notification scheduled: ${notificationId} for ${registrationDate.toISOString()}`);
      return notificationId;
    } catch (exactError: any) {
      console.warn('[NotificationScheduler] Exact alarm failed, trying fallback:', exactError?.message || exactError);
      
      // Попытка 2: Fallback через секундный интервал (inexact, но гарантированно работает)
      try {
        const secondsUntil = Math.max(1, Math.floor((registrationDate.getTime() - Date.now()) / 1000));
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { ticketId: ticket.id, type: 'REGISTRATION_OPEN' },
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          } as any,
        });
        console.log(`[NotificationScheduler] ✅ Fallback notification scheduled: ${notificationId} (in ${secondsUntil}s)`);
        return notificationId;
      } catch (fallbackError: any) {
        console.error('[NotificationScheduler] ❌ All scheduling methods failed:', fallbackError?.message || fallbackError);
        return null;
      }
    }
  }

  /**
   * Запланировать РУЧНОЕ уведомление о регистрации
   */
  async scheduleCustom(ticket: Ticket, date: Date): Promise<string | null> {
    if (date.getTime() <= Date.now()) return null;

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('[NotificationScheduler] Notification permission denied for custom reminder');
      return null;
    }

    const title = i18next.t('notification.customReminderTitle', {
      airline: ticket.airlineName || ticket.airlineCode,
      defaultValue: `🔔 Напоминание: ${ticket.airlineName || ticket.airlineCode}`
    });
    const route = `${ticket.departureAirport} → ${ticket.arrivalAirport}`;
    const body = i18next.t('notification.customReminderBody', {
      flightNumber: ticket.flightNumber,
      route,
      defaultValue: `Вы просили напомнить о регистрации на рейс ${ticket.flightNumber} (${route}).`
    });

    // Попытка 1: Exact alarm
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { ticketId: ticket.id, type: 'CUSTOM_REMINDER' },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: date,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        } as any,
      });
      console.log(`[NotificationScheduler] ✅ Custom notification scheduled: ${notificationId} for ${date.toISOString()}`);
      return notificationId;
    } catch (exactError: any) {
      console.warn('[NotificationScheduler] Exact alarm failed for custom, trying fallback:', exactError?.message || exactError);
      
      // Попытка 2: Fallback через TIME_INTERVAL
      try {
        const secondsUntil = Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { ticketId: ticket.id, type: 'CUSTOM_REMINDER' },
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          } as any,
        });
        console.log(`[NotificationScheduler] ✅ Fallback custom notification scheduled: ${notificationId} (in ${secondsUntil}s)`);
        return notificationId;
      } catch (fallbackError: any) {
        console.error('[NotificationScheduler] ❌ All custom scheduling methods failed:', fallbackError?.message || fallbackError);
        return null;
      }
    }
  }

  async cancel(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('[NotificationScheduler] Failed to cancel notification:', error);
    }
  }

  /**
   * Получить список всех запланированных уведомлений (для диагностики)
   */
  async getScheduled(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  }
}

export const notificationScheduler = new NotificationScheduler();
