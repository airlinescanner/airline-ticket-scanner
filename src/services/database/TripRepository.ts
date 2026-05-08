import { Ticket, Trip } from '../../types/ticket';
import { databaseService } from './DatabaseService';
import { ticketRepository } from './TicketRepository';

/**
 * Нормализация имени пассажира для точного сравнения
 * Убирает слэши, обращения (MR, MRS) и лишние пробелы
 */
/**
 * Расстояние Левенштейна для нечеткого сравнения строк
 */
const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, i) => i)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let i = 0; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = i === 0 ? j : Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
};

/**
 * Нормализация имени пассажира для точного сравнения
 */
export const normalizeName = (name: string): string => {
  if (!name) return '';
  let clean = name.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
  
  // Убираем стандартные титулы/обращения
  const titles = ['MR', 'MRS', 'MS', 'MSTR', 'MISS', 'DR', 'PROF'];
  const words = clean.split(/\s+/).filter(w => !titles.includes(w));
  
  return words.join(' ').trim();
};

/**
 * Умное сравнение имён по частям (имя, фамилия)
 * Возвращает true, если имена достаточно похожи
 * Логика: сравниваем каждую часть имени отдельно
 * Например: "IRYNA KILIGOL" vs "IRINA KILGAI" -> 
 *   "IRYNA" vs "IRINA" = 80% match ✓
 *   "KILIGOL" vs "KILGAI" = 57% match ✓ (первые 3 буквы KIL совпадают)
 */
const areNamesSimilar = (name1: string, name2: string): boolean => {
  const parts1 = name1.split(/\s+/).filter(p => p.length > 1);
  const parts2 = name2.split(/\s+/).filter(p => p.length > 1);
  
  if (parts1.length === 0 || parts2.length === 0) return false;
  
  // Стратегия 1: Сравниваем полные строки (без пробелов)
  const full1 = parts1.join('');
  const full2 = parts2.join('');
  const fullDist = getLevenshteinDistance(full1, full2);
  const fullSim = 1 - (fullDist / Math.max(full1.length, full2.length));
  if (fullSim >= 0.7) return true;
  
  // Стратегия 2: Сравниваем части отдельно (имя vs имя, фамилия vs фамилия)
  let matchedParts = 0;
  const totalParts = Math.min(parts1.length, parts2.length);
  
  for (let i = 0; i < totalParts; i++) {
    const p1 = parts1[i];
    const p2 = parts2[i];
    const dist = getLevenshteinDistance(p1, p2);
    const sim = 1 - (dist / Math.max(p1.length, p2.length));
    
    // Если часть совпадает на 55%+ ИЛИ первые 2 буквы одинаковые — считаем совпадением
    if (sim >= 0.55 || (p1.length >= 3 && p2.length >= 3 && p1.substring(0, 2) === p2.substring(0, 2))) {
      matchedParts++;
    }
  }
  
  // Если все сравниваемые части совпали — имена похожи
  return totalParts > 0 && matchedParts === totalParts;
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
   * Логика: ищем по PNR + Имя пассажира, либо просто по Имени (один пассажир - одна карточка)
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

    // 2. Поиск по Имени (нечеткое сравнение)
    // Ищем последнюю созданную поездку для этого имени или похожего
    const existingTrips = await db.getAllAsync<any>(
      `SELECT id, passenger_name FROM trips 
       ORDER BY updated_at DESC`
    );
    
    for (const t of existingTrips) {
      const existingNormalized = normalizeName(t.passenger_name);
      const existingPNR = t.pnr?.toUpperCase().trim() || '';
      const newPNR = ticket.bookingReference?.toUpperCase().trim() || '';
      
      // 1. Прямое совпадение (Имя или PNR)
      if (existingNormalized === normalizedNewName || (newPNR && existingPNR === newPNR)) {
        await db.runAsync('UPDATE trips SET updated_at = ? WHERE id = ?', [now, t.id]);
        return t.id;
      }

      // 2. Нечеткое совпадение по PNR (допускаем 1 ошибку в 6-значном коде)
      if (newPNR && existingPNR && newPNR.length > 4) {
        const pnrDistance = getLevenshteinDistance(newPNR, existingPNR);
        const pnrSimilarity = 1 - (pnrDistance / Math.max(newPNR.length, existingPNR.length));
        if (pnrSimilarity >= 0.8) {
          await db.runAsync('UPDATE trips SET updated_at = ? WHERE id = ?', [now, t.id]);
          return t.id;
        }
      }

      // 3. Умное сравнение имён по частям (имя vs имя, фамилия vs фамилия)
      if (existingNormalized.length > 3 && normalizedNewName.length > 3) {
        if (areNamesSimilar(existingNormalized, normalizedNewName)) {

          await db.runAsync('UPDATE trips SET updated_at = ? WHERE id = ?', [now, t.id]);
          return t.id;
        }
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
    
    // 1. Сначала удаляем все билеты, принадлежащие этой поездке
    await db.runAsync('DELETE FROM tickets WHERE trip_id = ?', [tripId]);
    
    // 2. Затем удаляем саму поездку
    await db.runAsync('DELETE FROM trips WHERE id = ?', [tripId]);
    
    // 3. На всякий случай удаляем билеты без trip_id (мусор)
    await db.runAsync('DELETE FROM tickets WHERE trip_id IS NULL');

    // 4. Принудительно сбрасываем WAL-кэш, чтобы данные удалились немедленно
    try {
      await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      console.warn('WAL checkpoint failed:', e);
    }
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
