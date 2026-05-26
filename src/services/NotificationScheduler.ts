import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

export class NotificationScheduler {
  constructor() {
    this.setupAndroidChannel();
  }

  private async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Flight Registration',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2979FF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default', 
      });
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

  async schedule(ticket: Ticket, registrationDate: Date): Promise<string | null> {
    if (registrationDate.getTime() <= Date.now()) return null;

    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;

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

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { ticketId: ticket.id, type: 'REGISTRATION_OPEN' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: registrationDate,
          channelId: CHANNEL_ID, // Correctly moved to trigger / options hierarchy
        } as any,
      });
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Запланировать РУЧНОЕ уведомление о регистрации
   */
  async scheduleCustom(ticket: Ticket, date: Date): Promise<string | null> {
    if (date.getTime() <= Date.now()) return null;

    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;

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

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { ticketId: ticket.id, type: 'CUSTOM_REMINDER' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: date,
          channelId: CHANNEL_ID, // Correctly moved to trigger / options hierarchy
        } as any,
      });
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule custom notification:', error);
      return null;
    }
  }

  async cancel(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error(error);
    }
  }
}

export const notificationScheduler = new NotificationScheduler();

