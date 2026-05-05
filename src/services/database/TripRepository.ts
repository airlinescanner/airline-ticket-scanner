import { Ticket, Trip } from '../../types/ticket';
import { databaseService } from './DatabaseService';
import { ticketRepository } from './TicketRepository';

/**
 * Нормализация имени пассажира для точного сравнения
 * Убирает слэши, обращения (MR, MRS) и лишние пробелы
 */
export const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/[\/\s]/g, '') // Убираем слэши и пробелы
    .replace(/(MR|MRS|MS|MSTR|DR|PROF)$/, '') // Убираем префиксы/суффиксы вежливости в конце
    .trim();
};

/**
 * TripRepository - репозиторий для работы с поездками (группами билетов)
 */
export class TripRepository {
  /**
   * Получить конкретную поездку по ID
   */
  async findById(tripId: number): Promise<Trip | null> {
    const db = await databaseService.getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM trips WHERE id = ?',
      [tripId]
    );
    
    if (!row) return null;
    
    const tickets = await this.findTicketsByTripId(row.id);
    return {
      id: row.id,
      passengerName: row.passenger_name,
      pnr: row.pnr,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tickets
    };
  }

  /**
   * Получить все поездки с их билетами
   */
  async findAllTrips(): Promise<Trip[]> {
    const db = await databaseService.getDatabase();
    
    // Получаем все поездки, сортируем по дате обновления (новые сверху)
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM trips ORDER BY updated_at DESC'
    );
    
    const trips: Trip[] = [];
    for (const row of rows) {
      const tickets = await this.findTicketsByTripId(row.id);
      trips.push({
        id: row.id,
        passengerName: row.passenger_name,
        pnr: row.pnr,
        title: row.title,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tickets
      });
    }
    
    // Фильтруем пустые поездки (на всякий случай)
    return trips.filter(t => t.tickets && t.tickets.length > 0);
  }

  /**
   * Получить билеты для конкретной поездки
   */
  async findTicketsByTripId(tripId: number): Promise<Ticket[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM tickets WHERE trip_id = ? ORDER BY departure_date ASC, departure_time ASC',
      [tripId]
    );
    return rows.map(row => ticketRepository.mapRowToTicket(row));
  }

  /**
   * Найти существующую поездку или создать новую для билета
   * Логика: ищем по PNR + Имя пассажира, либо по Имени + временному окну
   */
  async findOrCreateTripForTicket(ticket: Omit<Ticket, 'id' | 'scannedAt' | 'tripId'>): Promise<number> {
    const db = await databaseService.getDatabase();
    const now = new Date().toISOString();
    const normalizedNewName = normalizeName(ticket.passengerName);

    // 1. Поиск по PNR (самый надежный способ)
    if (ticket.bookingReference) {
      const trips = await db.getAllAsync<any>('SELECT id, passenger_name FROM trips WHERE pnr = ?', [ticket.bookingReference]);
      for (const t of trips) {
        if (normalizeName(t.passenger_name) === normalizedNewName) {
          await db.runAsync('UPDATE trips SET updated_at = ? WHERE id = ?', [now, t.id]);
          return t.id;
        }
      }
    }

    // 2. Поиск по Имени + близости дат (в пределах 48 часов)
    // Это позволяет объединять пересадки, купленные даже разными билетами
    const recentTrips = await db.getAllAsync<any>(
      `SELECT id, passenger_name FROM trips 
       WHERE updated_at > datetime('now', '-2 days') 
       ORDER BY updated_at DESC`
    );
    
    for (const t of recentTrips) {
      if (normalizeName(t.passenger_name) === normalizedNewName) {
        await db.runAsync('UPDATE trips SET updated_at = ? WHERE id = ?', [now, t.id]);
        return t.id;
      }
    }

    // 3. Если ничего не нашли - создаем новую поездку
    const result = await db.runAsync(
      'INSERT INTO trips (passenger_name, pnr, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [ticket.passengerName, ticket.bookingReference || null, null, now, now]
    );
    
    return result.lastInsertRowId;
  }

  /**
   * Удалить поездку и все её билеты
   */
  async deleteTrip(tripId: number): Promise<void> {
    const db = await databaseService.getDatabase();
    // Сначала удаляем билеты (или они отвяжутся, если ON DELETE SET NULL, но лучше удалить всё)
    await db.runAsync('DELETE FROM tickets WHERE trip_id = ?', [tripId]);
    await db.runAsync('DELETE FROM trips WHERE id = ?', [tripId]);
  }

  /**
   * Обновить название поездки
   */
  async updateTripTitle(tripId: number, title: string): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('UPDATE trips SET title = ?, updated_at = ? WHERE id = ?', [title, new Date().toISOString(), tripId]);
  }
}

export const tripRepository = new TripRepository();
