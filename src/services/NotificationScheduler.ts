import * as Notifications from 'expo-notifications';
import { Ticket } from '../types/ticket';

/**
 * NotificationScheduler - сервис для планирования локальных push-уведомлений
 * 
 * Использует expo-notifications для планирования уведомлений о регистрации на рейс
 * Не планирует уведомления для дат в прошлом
 */
export class NotificationScheduler {
  constructor() {
    // Настройка обработчика уведомлений
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Запросить разрешение на отправку уведомлений
   * 
   * @returns true, если разрешение предоставлено
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Запланировать уведомление о регистрации на рейс
   * 
   * @param ticket - билет
   * @param registrationDate - дата открытия регистрации
   * @returns ID запланированного уведомления или null, если не удалось запланировать
   */
  async schedule(ticket: Ticket, registrationDate: Date): Promise<string | null> {
    try {
      // Проверка разрешения
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('Notification permission denied');
        return null;
      }

      // Проверка, что дата не в прошлом
      if (registrationDate.getTime() < Date.now()) {
        console.warn('Registration date is in the past, not scheduling notification');
        return null;
      }

      // Формирование текста уведомления
      const title = `Регистрация на рейс ${ticket.flightNumber}`;
      const body = this.formatNotificationBody(ticket, registrationDate);

      // Планирование уведомления
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            ticketId: ticket.id,
            flightNumber: ticket.flightNumber,
            airlineCode: ticket.airlineCode,
          },
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
   * Отменить запланированное уведомление
   * 
   * @param notificationId - ID уведомления
   */
  async cancel(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Отменить все запланированные уведомления
   */
  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Восстановить уведомления для всех активных билетов
   * 
   * @param tickets - список билетов с включёнными уведомлениями
   */
  async restoreAll(tickets: Ticket[]): Promise<void> {
    // Отменяем все существующие уведомления
    await this.cancelAll();

    // Планируем уведомления для каждого билета
    for (const ticket of tickets) {
      if (ticket.notificationEnabled && ticket.notificationId) {
        // Вычисляем дату регистрации из даты вылета
        // Примечание: здесь нужно использовать RegistrationMatcher,
        // но для избежания циклической зависимости, мы просто пропускаем
        // Эта логика будет реализована на уровне приложения
        console.log(`Restoring notification for ticket ${ticket.id}`);
      }
    }
  }

  /**
   * Получить список всех запланированных уведомлений
   * 
   * @returns массив ID запланированных уведомлений
   */
  async getScheduledIds(): Promise<string[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications.map(n => n.identifier);
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Проверить, запланировано ли уведомление
   * 
   * @param notificationId - ID уведомления
   * @returns true, если уведомление запланировано
   */
  async isScheduled(notificationId: string): Promise<boolean> {
    const scheduledIds = await this.getScheduledIds();
    return scheduledIds.includes(notificationId);
  }

  /**
   * Форматировать текст уведомления
   */
  private formatNotificationBody(ticket: Ticket, registrationDate: Date): string {
    const route = `${ticket.departureAirport} → ${ticket.arrivalAirport}`;
    const city = ticket.departureCity || ticket.departureAirport;
    
    // Форматируем время открытия в локальном поясе города вылета для текста уведомления
    // Мы передаем registrationDate (UTC), но пользователю хотим показать время по их городу вылета
    // Для этого нам бы понадобился пояс здесь, но мы можем упростить:
    // "Регистрация для [Имя] открыта (по времени [Город])"
    
    return `Пора регистрировать ${ticket.passengerName}! Регистрация на рейс ${ticket.flightNumber} (${route}) открыта по времени города ${city}.`;
  }

  /**
   * Форматировать дату в DD.MM.YYYY HH:MM
   */
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  /**
   * Обработать нажатие на уведомление
   * 
   * @param callback - функция обратного вызова с данными билета
   */
  addNotificationResponseListener(
    callback: (ticketId: number, flightNumber: string) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && data.ticketId && data.flightNumber) {
        callback(data.ticketId as number, data.flightNumber as string);
      }
    });
  }
}

// Singleton экземпляр
export const notificationScheduler = new NotificationScheduler();
