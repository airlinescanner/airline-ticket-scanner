import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

    const title = `🛫 Регистрация открыта: ${ticket.airline}`;
    const route = `${ticket.departureAirport} → ${ticket.arrivalAirport}`;
    const passenger = ticket.passengerName.split('/')[0];
    const body = `✈️ Пора регистрировать ${passenger}!\nРейс ${ticket.flightNumber} (${route}) уже открыт. Нажмите, чтобы открыть детали.`;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: CHANNEL_ID,
          data: { ticketId: ticket.id, type: 'REGISTRATION_OPEN' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: registrationDate,
        },
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

    const title = `🔔 Напоминание: ${ticket.airline}`;
    const route = `${ticket.departureAirport} → ${ticket.arrivalAirport}`;
    const body = `Вы просили напомнить о регистрации на рейс ${ticket.flightNumber} (${route}).`;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: CHANNEL_ID,
          data: { ticketId: ticket.id, type: 'CUSTOM_REMINDER' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: date,
        },
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
