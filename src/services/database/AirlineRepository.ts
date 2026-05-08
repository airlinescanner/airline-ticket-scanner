import { Airline } from '../../types/airline';
import { databaseService } from './DatabaseService';

/**
 * AirlineRepository - репозиторий для работы с авиакомпаниями
 * 
 * Реализует CRUD операции, валидацию кодов IATA/ICAO,
 * поиск по различным полям и предзаполнение базы данных
 */
export class AirlineRepository {
  /**
   * Найти авиакомпанию по коду (IATA или ICAO)
   */
  async findByCode(code: string): Promise<Airline | null> {
    const db = await databaseService.getDatabase();
    const normalizedCode = code.toUpperCase().trim();

    // Пробуем найти по IATA (2 символа) или ICAO (3 символа)
    const query = normalizedCode.length === 2
      ? 'SELECT * FROM airlines WHERE iata_code = ? LIMIT 1'
      : 'SELECT * FROM airlines WHERE icao_code = ? LIMIT 1';

    const result = await db.getFirstAsync<any>(query, [normalizedCode]);

    if (!result) {
      return null;
    }

    return this.mapRowToAirline(result);
  }

  /**
   * Получить все авиакомпании
   */
  async findAll(): Promise<Airline[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM airlines ORDER BY name COLLATE NOCASE ASC');
    return rows.map(row => this.mapRowToAirline(row));
  }

  /**
   * Поиск авиакомпаний по запросу (название, IATA, ICAO, страна)
   */
  async search(query: string): Promise<Airline[]> {
    const db = await databaseService.getDatabase();
    const searchPattern = `%${query.toLowerCase()}%`;

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM airlines 
       WHERE LOWER(name) LIKE ? 
          OR LOWER(iata_code) LIKE ? 
          OR LOWER(icao_code) LIKE ? 
          OR LOWER(country) LIKE ?
       ORDER BY name COLLATE NOCASE ASC`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );

    return rows.map(row => this.mapRowToAirline(row));
  }

  /**
   * Создать новую авиакомпанию
   */
  async create(airline: Omit<Airline, 'id' | 'updatedAt'>): Promise<Airline> {
    // Валидация
    this.validateAirline(airline);

    // Проверка дубликатов кодов
    await this.checkDuplicateCodes(airline.iataCode, airline.icaoCode);

    const db = await databaseService.getDatabase();
    const updatedAt = new Date().toISOString();

    const result = await db.runAsync(
      `INSERT INTO airlines (
        iata_code, icao_code, name, country, logo_url, 
        registration_url, support_phone, check_in_hours_before, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        airline.iataCode.toUpperCase(),
        airline.icaoCode.toUpperCase(),
        airline.name,
        airline.country,
        airline.logoUrl || null,
        airline.registrationUrl || null,
        airline.supportPhone || null,
        airline.checkInHoursBefore,
        airline.notes || null,
        updatedAt,
      ]
    );

    return {
      id: result.lastInsertRowId,
      ...airline,
      iataCode: airline.iataCode.toUpperCase(),
      icaoCode: airline.icaoCode.toUpperCase(),
      updatedAt,
    };
  }

  /**
   * Обновить авиакомпанию
   */
  async update(id: number, data: Partial<Omit<Airline, 'id' | 'updatedAt'>>): Promise<Airline> {
    // Получаем текущую запись
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Airline with id ${id} not found`);
    }

    // Объединяем с новыми данными
    const updated = { ...existing, ...data };

    // Валидация
    this.validateAirline(updated);

    // Проверка дубликатов кодов (исключая текущую запись)
    await this.checkDuplicateCodes(updated.iataCode, updated.icaoCode, id);

    const db = await databaseService.getDatabase();
    const updatedAt = new Date().toISOString();

    await db.runAsync(
      `UPDATE airlines SET 
        iata_code = ?, icao_code = ?, name = ?, country = ?, logo_url = ?,
        registration_url = ?, support_phone = ?, check_in_hours_before = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.iataCode.toUpperCase(),
        updated.icaoCode.toUpperCase(),
        updated.name,
        updated.country,
        updated.logoUrl || null,
        updated.registrationUrl || null,
        updated.supportPhone || null,
        updated.checkInHoursBefore,
        updated.notes || null,
        updatedAt,
        id,
      ]
    );

    return {
      ...updated,
      iataCode: updated.iataCode.toUpperCase(),
      icaoCode: updated.icaoCode.toUpperCase(),
      updatedAt,
    };
  }

  /**
   * Удалить авиакомпанию
   */
  async delete(id: number): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM airlines WHERE id = ?', [id]);
  }

  /**
   * Найти авиакомпанию по ID
   */
  async findById(id: number): Promise<Airline | null> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<any>('SELECT * FROM airlines WHERE id = ? LIMIT 1', [id]);

    if (!result) {
      return null;
    }

    return this.mapRowToAirline(result);
  }

  /**
   * Инициализация базы данных предзаполненными данными
   * Идемпотентная операция - не добавляет дубликаты
   */
  async initialize(seedData: Omit<Airline, 'id' | 'updatedAt'>[]): Promise<void> {
    // Проверяем, была ли уже инициализация
    const isSeeded = await this.isInitialized();
    if (isSeeded) {
      return; // Уже инициализировано, ничего не делаем
    }

    const db = await databaseService.getDatabase();

    // Добавляем все авиакомпании из seedData
    for (const airline of seedData) {
      try {
        await this.create(airline);
      } catch (error) {
        // Игнорируем ошибки дубликатов (если авиакомпания уже есть)
        console.warn(`Failed to seed airline ${airline.iataCode}:`, error);
      }
    }

    // Устанавливаем флаг инициализации
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['is_seeded', 'true']
    );
  }

  /**
   * Проверить, была ли выполнена инициализация
   */
  async isInitialized(): Promise<boolean> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      ['is_seeded']
    );

    return result?.value === 'true';
  }

  /**
   * Проверить, была ли выполнена инициализация V2 (новые данные)
   */
  async isInitializedV2(): Promise<boolean> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      ['is_seeded_v2']
    );

    return result?.value === 'true';
  }

  /**
   * Проверить, была ли выполнена инициализация V3 (новые данные СНГ)
   */
  async isInitializedV3(): Promise<boolean> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      ['is_seeded_v3']
    );

    return result?.value === 'true';
  }

  /**
   * Проверить, была ли выполнена инициализация V4 (фикс дублей ICAO)
   */
  async isInitializedV4(): Promise<boolean> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      ['is_seeded_v4']
    );

    return result?.value === 'true';
  }

  /**
   * Полная очистка таблицы авиакомпаний
   */
  async deleteAllAirlines(): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM airlines');
  }

  /**
   * Инициализация базы данных V2 (новая версия)
   */
  async initializeV2(seedData: Omit<Airline, 'id' | 'updatedAt'>[]): Promise<void> {
    const db = await databaseService.getDatabase();

    // Добавляем все авиакомпании из seedData
    for (const airline of seedData) {
      try {
        await this.create(airline);
      } catch (error) {
        console.warn(`Failed to seed airline ${airline.iataCode}:`, error);
      }
    }

    // Устанавливаем флаг инициализации V2
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['is_seeded_v2', 'true']
    );
  }

  /**
   * Инициализация базы данных V3 (новая версия СНГ)
   */
  async initializeV3(seedData: Omit<Airline, 'id' | 'updatedAt'>[]): Promise<void> {
    const db = await databaseService.getDatabase();

    // Добавляем все авиакомпании из seedData
    for (const airline of seedData) {
      try {
        await this.create(airline);
      } catch (error) {
        console.warn(`Failed to seed airline ${airline.iataCode}:`, error);
      }
    }

    // Устанавливаем флаг инициализации V3
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['is_seeded_v3', 'true']
    );
  }

  /**
   * Инициализация базы данных V4 (фикс дублей ICAO)
   */
  async initializeV4(seedData: Omit<Airline, 'id' | 'updatedAt'>[]): Promise<void> {
    const db = await databaseService.getDatabase();

    for (const airline of seedData) {
      try {
        await this.create(airline);
      } catch (error) {
        console.warn(`Failed to seed airline ${airline.iataCode}:`, error);
      }
    }

    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['is_seeded_v4', 'true']
    );
  }

  /**
   * Проверить, была ли выполнена инициализация V6 (точные данные времени регистрации)
   */
  async isInitializedV6(): Promise<boolean> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      ['is_seeded_v6']
    );

    return result?.value === 'true';
  }

  /**
   * Инициализация базы данных V6 (точные данные времени регистрации)
   */
  async initializeV6(seedData: Omit<Airline, 'id' | 'updatedAt'>[]): Promise<void> {
    const db = await databaseService.getDatabase();

    // Добавляем все авиакомпании из seedData
    for (const airline of seedData) {
      try {
        await this.create(airline);
      } catch (error) {
        console.warn(`Failed to seed airline ${airline.iataCode}:`, error);
      }
    }

    // Устанавливаем флаг инициализации V6
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['is_seeded_v6', 'true']
    );
  }

  /**
   * Проверить, была ли выполнена инициализация V7 (добавление URL регистрации)
   */
  async isInitializedV8(): Promise<boolean> {
    const db = await databaseService.getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      ['is_seeded_v8']
    );

    return result?.value === 'true';
  }

  /**
   * Хирургическое обновление данных (только URL регистрации) без удаления пользовательских данных
   */
  async updateUrlsSurgically(seedData: Omit<Airline, 'id' | 'updatedAt'>[]): Promise<void> {
    const db = await databaseService.getDatabase();
    const updatedAt = new Date().toISOString();



    for (const airline of seedData) {
      if (airline.registrationUrl) {
        // Обновляем, если ссылка пустая, null или короче 10 символов (явно не полный URL)
        await db.runAsync(
          `UPDATE airlines SET registration_url = ?, updated_at = ? 
           WHERE iata_code = ? AND (registration_url IS NULL OR length(registration_url) < 10)`,
          [airline.registrationUrl, updatedAt, airline.iataCode]
        );
      }
    }

    // Устанавливаем флаг инициализации V8
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['is_seeded_v8', 'true']
    );
  }

  /**
   * Заменить все авиакомпании (для восстановления из бэкапа)
   */
  async replaceAll(airlines: Airline[]): Promise<void> {
    const db = await databaseService.getDatabase();

    // Удаляем все существующие записи
    await db.runAsync('DELETE FROM airlines');

    // Добавляем новые
    for (const airline of airlines) {
      await db.runAsync(
        `INSERT INTO airlines (
          id, iata_code, icao_code, name, country, logo_url,
          registration_url, support_phone, check_in_hours_before, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          airline.id,
          airline.iataCode,
          airline.icaoCode,
          airline.name,
          airline.country,
          airline.logoUrl || null,
          airline.registrationUrl || null,
          airline.supportPhone || null,
          airline.checkInHoursBefore,
          airline.notes || null,
          airline.updatedAt,
        ]
      );
    }
  }

  /**
   * Валидация данных авиакомпании
   */
  private validateAirline(airline: Omit<Airline, 'id' | 'updatedAt'>): void {
    // Валидация IATA-кода (ровно 2 символа, буквенно-цифровые, верхний регистр)
    if (!/^[A-Z0-9]{2}$/.test(airline.iataCode.toUpperCase())) {
      throw new Error('DB_VALIDATION_ERROR: IATA code must be exactly 2 alphanumeric characters');
    }

    // Валидация ICAO-кода (ровно 3 символа, буквенно-цифровые, верхний регистр)
    if (!/^[A-Z0-9]{3}$/.test(airline.icaoCode.toUpperCase())) {
      throw new Error('DB_VALIDATION_ERROR: ICAO code must be exactly 3 alphanumeric characters');
    }

    // Валидация обязательных полей
    if (!airline.name || airline.name.trim().length === 0) {
      throw new Error('DB_VALIDATION_ERROR: Name is required');
    }

    if (!airline.country || airline.country.trim().length === 0) {
      throw new Error('DB_VALIDATION_ERROR: Country is required');
    }

    // Валидация checkInHoursBefore (1-720)
    if (airline.checkInHoursBefore < 1 || airline.checkInHoursBefore > 720) {
      throw new Error('DB_VALIDATION_ERROR: Check-in hours must be between 1 and 720');
    }

    // Валидация URL регистрации (должен начинаться с https://)
    if (airline.registrationUrl && !airline.registrationUrl.startsWith('https://')) {
      throw new Error('DB_VALIDATION_ERROR: Registration URL must start with https://');
    }
  }

  /**
   * Проверка дубликатов кодов IATA/ICAO
   */
  private async checkDuplicateCodes(
    iataCode: string,
    icaoCode: string,
    excludeId?: number
  ): Promise<void> {
    const db = await databaseService.getDatabase();

    // Проверка IATA
    const iataQuery = excludeId
      ? 'SELECT id FROM airlines WHERE iata_code = ? AND id != ? LIMIT 1'
      : 'SELECT id FROM airlines WHERE iata_code = ? LIMIT 1';
    const iataParams = excludeId ? [iataCode.toUpperCase(), excludeId] : [iataCode.toUpperCase()];
    const iataExists = await db.getFirstAsync<{ id: number }>(iataQuery, iataParams);

    if (iataExists) {
      throw new Error('DB_DUPLICATE_CODE: IATA code already exists');
    }

    // Проверка ICAO
    const icaoQuery = excludeId
      ? 'SELECT id FROM airlines WHERE icao_code = ? AND id != ? LIMIT 1'
      : 'SELECT id FROM airlines WHERE icao_code = ? LIMIT 1';
    const icaoParams = excludeId ? [icaoCode.toUpperCase(), excludeId] : [icaoCode.toUpperCase()];
    const icaoExists = await db.getFirstAsync<{ id: number }>(icaoQuery, icaoParams);

    if (icaoExists) {
      throw new Error('DB_DUPLICATE_CODE: ICAO code already exists');
    }
  }

  /**
   * Преобразование строки БД в объект Airline
   */
  private mapRowToAirline(row: any): Airline {
    return {
      id: row.id,
      iataCode: row.iata_code,
      icaoCode: row.icao_code,
      name: row.name,
      country: row.country,
      logoUrl: row.logo_url,
      registrationUrl: row.registration_url,
      supportPhone: row.support_phone,
      checkInHoursBefore: row.check_in_hours_before,
      notes: row.notes,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton экземпляр
export const airlineRepository = new AirlineRepository();
