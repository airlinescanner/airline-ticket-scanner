import { Ticket } from '../../types/ticket';
import { databaseService } from './DatabaseService';

/**
 * TicketRepository - репозиторий для работы с билетами
 * 
 * Реализует сохранение, поиск, обновление и удаление билетов
 */
export class TicketRepository {
  /**
   * Сохранить новый билет
   * Автоматически устанавливает scanned_at в текущее время
   */
  async save(ticket: Omit<Ticket, 'id' | 'scannedAt'>): Promise<Ticket> {
    const db = await databaseService.getDatabase();
    const scannedAt = new Date().toISOString();

    const result = await db.runAsync(
      `INSERT INTO tickets (
        passenger_name, airline_name, airline_code, flight_number, 
        departure_date, departure_time, departure_city, departure_country,
        departure_airport, arrival_airport, arrival_city, arrival_country,
        seat, service_class,
        raw_json, scanned_at, notification_enabled, notification_id,
        booking_reference, trip_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket.passengerName,
        ticket.airlineName || null,
        ticket.airlineCode,
        ticket.flightNumber,
        ticket.departureDate,
        ticket.departureTime || null,
        ticket.departureCity || null,
        ticket.departureCountry || null,
        ticket.departureAirport,
        ticket.arrivalAirport,
        ticket.arrivalCity || null,
        ticket.arrivalCountry || null,
        ticket.seat || null,
        ticket.serviceClass || null,
        ticket.rawJson,
        scannedAt,
        ticket.notificationEnabled ? 1 : 0,
        ticket.notificationId || null,
        ticket.bookingReference || null,
        ticket.tripId || null,
      ]
    );

    return {
      id: result.lastInsertRowId,
      ...ticket,
      scannedAt,
    };
  }

  /**
   * Получить все билеты с ограничением по количеству
   * Сортировка по дате сканирования (от новых к старым)
   */
  async findAll(limit: number = 50): Promise<Ticket[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM tickets ORDER BY scanned_at DESC LIMIT ?',
      [limit]
    );

    return rows.map(row => this.mapRowToTicket(row));
  }

  /**
   * Найти билет по ID
   */
  async findById(id: number): Promise<Ticket | null> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM tickets WHERE id = ? LIMIT 1',
      [id]
    );

    if (!result) {
      return null;
    }

    return this.mapRowToTicket(result);
  }

  /**
   * Обновить статус уведомления для билета
   */
  async updateNotification(
    id: number,
    enabled: boolean,
    notificationId?: string
  ): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync(
      'UPDATE tickets SET notification_enabled = ?, notification_id = ? WHERE id = ?',
      [enabled ? 1 : 0, notificationId || null, id]
    );
  }

  /**
   * Удалить билет
   */
  async delete(id: number): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM tickets WHERE id = ?', [id]);
  }

  /**
   * Заменить все билеты (для восстановления из бэкапа)
   */
  async replaceAll(tickets: Ticket[]): Promise<void> {
    const db = await databaseService.getDatabase();

    // Удаляем все существующие записи
    await db.runAsync('DELETE FROM tickets');

    // Добавляем новые
    for (const ticket of tickets) {
      await db.runAsync(
        `INSERT INTO tickets (
          id, passenger_name, airline_name, airline_code, flight_number, 
          departure_date, departure_time, departure_city, departure_country,
          departure_airport, arrival_airport, seat, service_class,
          raw_json, scanned_at, notification_enabled, notification_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.id,
          ticket.passengerName,
          ticket.airlineName || null,
          ticket.airlineCode,
          ticket.flightNumber,
          ticket.departureDate,
          ticket.departureTime || null,
          ticket.departureCity || null,
          ticket.departureCountry || null,
          ticket.departureAirport,
          ticket.arrivalAirport,
          ticket.seat || null,
          ticket.serviceClass || null,
          ticket.rawJson,
          ticket.scannedAt,
          ticket.notificationEnabled ? 1 : 0,
          ticket.notificationId || null,
          ticket.bookingReference || null,
          ticket.tripId || null,
        ]
      );
    }
  }

  /**
   * Преобразование строки БД в объект Ticket
   */
  public mapRowToTicket(row: any): Ticket {
    return {
      id: row.id,
      passengerName: row.passenger_name,
      airlineName: row.airline_name || null,
      airlineCode: row.airline_code,
      flightNumber: row.flight_number,
      departureDate: row.departure_date,
      departureTime: row.departure_time || '',
      departureCity: row.departure_city || '',
      departureCountry: row.departure_country || null,
      departureAirport: row.departure_airport,
      arrivalAirport: row.arrival_airport,
      arrivalCity: row.arrival_city || null,
      arrivalCountry: row.arrival_country || null,
      seat: row.seat,
      serviceClass: row.service_class,
      rawJson: row.raw_json,
      scannedAt: row.scanned_at,
      notificationEnabled: row.notification_enabled === 1,
      notificationId: row.notification_id,
      bookingReference: row.booking_reference || null,
      tripId: row.trip_id || null,
    };
  }
}

// Singleton экземпляр
export const ticketRepository = new TicketRepository();
