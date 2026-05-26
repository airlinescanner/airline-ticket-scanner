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
        custom_notification_id, custom_notification_date,
        booking_reference, trip_id,
        operating_airline_name, operating_airline_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ticket.customNotificationId || null,
        ticket.customNotificationDate || null,
        ticket.bookingReference || null,
        ticket.tripId || null,
        ticket.operatingAirlineName || null,
        ticket.operatingAirlineCode || null,
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
   * Обновить статус ручного уведомления
   */
  async updateCustomNotification(
    id: number,
    notificationId: string | null,
    date: string | null
  ): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync(
      'UPDATE tickets SET custom_notification_id = ?, custom_notification_date = ? WHERE id = ?',
      [notificationId, date, id]
    );
  }

  /**
   * Проверить, существует ли уже такой билет в базе (защита от дублей)
   */
  async findDuplicate(flightNumber: string, departureDate: string, airlineCode: string, bookingReference?: string | null): Promise<Ticket | null> {
    const db = await databaseService.getDatabase();
    
    const cleanFlightNumber = flightNumber.toUpperCase().trim();
    const cleanPNR = bookingReference?.trim().toUpperCase() || null;
    const cleanAirlineCode = airlineCode.toUpperCase().trim();
    
    console.log(`[TicketRepository] Checking for duplicate: Flight=${cleanFlightNumber}, Date=${departureDate}, Airline=${cleanAirlineCode}, PNR=${cleanPNR}`);

    const tickets = await db.getAllAsync<any>(
      'SELECT * FROM tickets WHERE departure_date = ?',
      [departureDate]
    );

    console.log(`[TicketRepository] Found ${tickets.length} potential matches for date ${departureDate}`);

    for (const row of tickets) {
      const rowFlight = row.flight_number.toUpperCase().trim();
      const rowPNR = row.booking_reference?.trim().toUpperCase() || null;
      const rowAirline = row.airline_code.toUpperCase().trim();
      
      console.log(`[TicketRepository] Comparing with: ID=${row.id}, Flight=${rowFlight}, Airline=${rowAirline}, PNR=${rowPNR}`);

      // 1. Если PNR совпадает — это 100% дубликат
      if (cleanPNR && rowPNR === cleanPNR) {
        console.log(`[TicketRepository] DUPLICATE FOUND by PNR: ${cleanPNR}`);
        return this.mapRowToTicket(row);
      }

      // 2. Если номер рейса И код авиакомпании совпадают — это дубликат
      const isSameFlight = rowFlight === cleanFlightNumber || 
                           (rowFlight.includes(cleanFlightNumber) && rowAirline === cleanAirlineCode) ||
                           (cleanFlightNumber.includes(rowFlight) && rowAirline === cleanAirlineCode);

      if (isSameFlight && rowAirline === cleanAirlineCode) {
        console.log(`[TicketRepository] DUPLICATE FOUND by Flight Number: ${rowFlight}`);
        return this.mapRowToTicket(row);
      }
    }
    
    console.log(`[TicketRepository] No duplicate found.`);
    return null;
  }

  /**
   * Удалить билет
   */
  async delete(id: number): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      
      // 1. Сначала находим детали билета, который хотим удалить
      const ticket = await this.findById(id);
      if (!ticket) {
        console.log(`[TicketRepository] Ticket ${id} already gone or not found.`);
        return;
      }

      console.log(`[TicketRepository] Nuclear delete for flight: ${ticket.flightNumber} on ${ticket.departureDate}`);

      // 2. Удаляем ВСЕ билеты с этим номером рейса, датой и кодом авиакомпании 
      // (на случай если в базе завалялись "призраки" от неудачных сканирований)
      const result = await db.runAsync(
        'DELETE FROM tickets WHERE flight_number = ? AND departure_date = ? AND airline_code = ?',
        [ticket.flightNumber, ticket.departureDate, ticket.airlineCode]
      );
      
      console.log(`[TicketRepository] Deleted ${result.changes} ticket records.`);

      // 3. Если билет был привязан к поездке, проверяем не опустела ли она
      if (ticket.tripId) {
        const remainingInTrip = await db.getFirstAsync<{count: number}>(
          'SELECT COUNT(*) as count FROM tickets WHERE trip_id = ?',
          [ticket.tripId]
        );
        
        if (!remainingInTrip || remainingInTrip.count === 0) {
          console.log(`[TicketRepository] Trip ${ticket.tripId} is now empty. Deleting trip.`);
          await db.runAsync('DELETE FROM trips WHERE id = ?', [ticket.tripId]);
        }
      }

      // 4. Принудительная очистка базы
      await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      // VACUUM может быть тяжелым, но в данном случае он гарантирует физическое удаление
      // await db.execAsync('VACUUM;'); 
      
    } catch (e) {
      console.error('[TicketRepository] Nuclear delete failed:', e);
      // Если сложная логика упала, пробуем просто удалить по ID
      const db = await databaseService.getDatabase();
      await db.runAsync('DELETE FROM tickets WHERE id = ?', [id]);
    }
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
          departure_airport, arrival_airport, arrival_city, arrival_country,
          seat, service_class,
          raw_json, scanned_at, notification_enabled, notification_id,
          custom_notification_id, custom_notification_date,
          booking_reference, trip_id,
          operating_airline_name, operating_airline_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ticket.arrivalCity || null,
          ticket.arrivalCountry || null,
          ticket.seat || null,
          ticket.serviceClass || null,
          ticket.rawJson,
          ticket.scannedAt,
          ticket.notificationEnabled ? 1 : 0,
          ticket.notificationId || null,
          ticket.customNotificationId || null,
          ticket.customNotificationDate || null,
          ticket.bookingReference || null,
          ticket.tripId || null,
          ticket.operatingAirlineName || null,
          ticket.operatingAirlineCode || null,
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
      operatingAirlineName: row.operating_airline_name || null,
      operatingAirlineCode: row.operating_airline_code || null,
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
      customNotificationId: row.custom_notification_id,
      customNotificationDate: row.custom_notification_date,
      bookingReference: row.booking_reference || null,
      tripId: row.trip_id || null,
    };
  }
}

// Singleton экземпляр
export const ticketRepository = new TicketRepository();
