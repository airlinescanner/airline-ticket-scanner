import * as SQLite from 'expo-sqlite';

/**
 * DatabaseService - сервис для инициализации и управления SQLite базой данных
 * 
 * Создаёт таблицы: airlines, tickets, app_meta
 * Создаёт индексы для оптимизации запросов
 */
class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'airline_scanner.db';

  /**
   * Получить экземпляр базы данных
   * Если база не инициализирована - инициализирует её
   */
  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }

    this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
    await this.initializeTables();
    return this.db;
  }

  /**
   * Инициализация таблиц и индексов
   */
  private async initializeTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    // Таблица авиакомпаний
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS airlines (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        iata_code             TEXT NOT NULL UNIQUE CHECK(length(iata_code) = 2),
        icao_code             TEXT NOT NULL UNIQUE CHECK(length(icao_code) = 3),
        name                  TEXT NOT NULL,
        country               TEXT NOT NULL,
        logo_url              TEXT,
        registration_url      TEXT,
        support_phone         TEXT,
        check_in_hours_before INTEGER NOT NULL CHECK(check_in_hours_before >= 1 AND check_in_hours_before <= 720),
        notes                 TEXT,
        updated_at            TEXT NOT NULL
      );
    `);

    // Индексы для таблицы airlines
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_airlines_iata ON airlines(iata_code);
    `);
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_airlines_icao ON airlines(icao_code);
    `);
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_airlines_name ON airlines(name COLLATE NOCASE);
    `);

    // Таблица билетов
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tickets (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        passenger_name       TEXT NOT NULL,
        airline_name         TEXT,
        airline_code         TEXT NOT NULL,
        flight_number        TEXT NOT NULL,
        departure_date       TEXT NOT NULL,
        departure_time       TEXT,
        departure_city       TEXT,
        departure_country    TEXT,
        departure_airport    TEXT NOT NULL,
        arrival_airport      TEXT NOT NULL,
        seat                 TEXT,
        service_class        TEXT,
        raw_json             TEXT NOT NULL,
        scanned_at           TEXT NOT NULL,
        notification_enabled INTEGER NOT NULL DEFAULT 0 CHECK(notification_enabled IN (0, 1)),
        notification_id      TEXT
      );
    `);

    // Migration for existing tables
    try {
      await this.db.execAsync("ALTER TABLE tickets ADD COLUMN airline_name TEXT;");
    } catch (e) {}
    try {
      await this.db.execAsync("ALTER TABLE tickets ADD COLUMN departure_time TEXT;");
    } catch (e) {}
    try {
      await this.db.execAsync("ALTER TABLE tickets ADD COLUMN departure_city TEXT;");
    } catch (e) {}
    try {
      await this.db.execAsync("ALTER TABLE tickets ADD COLUMN departure_country TEXT;");
    } catch (e) {}

    // Индексы для таблицы tickets
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_tickets_scanned_at ON tickets(scanned_at DESC);
    `);
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_tickets_airline_code ON tickets(airline_code);
    `);

    // Служебная таблица для метаданных приложения
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  /**
   * Закрыть соединение с базой данных
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  /**
   * Очистить все данные (для тестирования)
   */
  async clearAllData(): Promise<void> {
    const db = await this.getDatabase();
    await db.execAsync('DELETE FROM airlines;');
    await db.execAsync('DELETE FROM tickets;');
    await db.execAsync('DELETE FROM app_meta;');
  }
}

// Singleton экземпляр
export const databaseService = new DatabaseService();
