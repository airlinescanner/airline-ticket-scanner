/**
 * Интеграционный тест для проверки базы данных
 * Задача 6: Checkpoint — Проверка базы данных
 * 
 * Проверяет:
 * - Корректное создание таблиц
 * - Предзаполнение работает только при первом запуске
 * - Валидация кодов авиакомпаний
 */

import { databaseService } from './DatabaseService';
import { airlineRepository } from './AirlineRepository';
import { ticketRepository } from './TicketRepository';
import { seedAirlines } from '../../utils/seedData';
import { Airline } from '../../types/airline';

describe('Database Integration Tests (Checkpoint 6)', () => {
  beforeAll(async () => {
    // Очищаем базу перед всеми тестами
    await databaseService.clearAllData();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('1. Проверка создания таблиц', () => {
    it('должен создать все необходимые таблицы', async () => {
      const db = await databaseService.getDatabase();
      
      // Проверяем наличие всех таблиц
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      
      const tableNames = tables.map(t => t.name);
      
      expect(tableNames).toContain('airlines');
      expect(tableNames).toContain('tickets');
      expect(tableNames).toContain('app_meta');
    });

    it('должен создать таблицу airlines с правильной структурой', async () => {
      const db = await databaseService.getDatabase();
      
      const columns = await db.getAllAsync<{ name: string; type: string }>(
        "PRAGMA table_info(airlines)"
      );
      
      const columnNames = columns.map(c => c.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('iata_code');
      expect(columnNames).toContain('icao_code');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('country');
      expect(columnNames).toContain('check_in_hours_before');
      expect(columnNames).toContain('updated_at');
    });

    it('должен создать таблицу tickets с правильной структурой', async () => {
      const db = await databaseService.getDatabase();
      
      const columns = await db.getAllAsync<{ name: string; type: string }>(
        "PRAGMA table_info(tickets)"
      );
      
      const columnNames = columns.map(c => c.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('passenger_name');
      expect(columnNames).toContain('airline_code');
      expect(columnNames).toContain('flight_number');
      expect(columnNames).toContain('departure_date');
      expect(columnNames).toContain('scanned_at');
      expect(columnNames).toContain('notification_enabled');
    });

    it('должен создать все необходимые индексы', async () => {
      const db = await databaseService.getDatabase();
      
      const indexes = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      );
      
      const indexNames = indexes.map(i => i.name);
      
      // Индексы для airlines
      expect(indexNames).toContain('idx_airlines_iata');
      expect(indexNames).toContain('idx_airlines_icao');
      expect(indexNames).toContain('idx_airlines_name');
      
      // Индексы для tickets
      expect(indexNames).toContain('idx_tickets_scanned_at');
      expect(indexNames).toContain('idx_tickets_airline_code');
    });
  });

  describe('2. Проверка предзаполнения базы данных', () => {
    beforeEach(async () => {
      // Очищаем базу перед каждым тестом
      await databaseService.clearAllData();
    });

    it('должен предзаполнить базу данных при первом запуске', async () => {
      // Проверяем, что база пустая
      const beforeInit = await airlineRepository.findAll();
      expect(beforeInit).toHaveLength(0);
      
      // Инициализируем
      await airlineRepository.initialize(seedAirlines);
      
      // Проверяем, что данные добавлены
      const afterInit = await airlineRepository.findAll();
      expect(afterInit.length).toBe(seedAirlines.length);
      expect(afterInit.length).toBe(20); // Ожидаем 20 авиакомпаний
    });

    it('должен работать только при первом запуске (идемпотентность)', async () => {
      // Первая инициализация
      await airlineRepository.initialize(seedAirlines);
      const firstCount = (await airlineRepository.findAll()).length;
      
      // Вторая инициализация (не должна добавлять дубликаты)
      await airlineRepository.initialize(seedAirlines);
      const secondCount = (await airlineRepository.findAll()).length;
      
      expect(firstCount).toBe(secondCount);
      expect(firstCount).toBe(20);
    });

    it('должен установить флаг is_seeded после инициализации', async () => {
      expect(await airlineRepository.isInitialized()).toBe(false);
      
      await airlineRepository.initialize(seedAirlines);
      
      expect(await airlineRepository.isInitialized()).toBe(true);
    });

    it('должен содержать все ожидаемые авиакомпании после инициализации', async () => {
      await airlineRepository.initialize(seedAirlines);
      
      // Проверяем наличие нескольких ключевых авиакомпаний
      const aeroflot = await airlineRepository.findByCode('SU');
      expect(aeroflot).not.toBeNull();
      expect(aeroflot?.name).toBe('Aeroflot');
      
      const lufthansa = await airlineRepository.findByCode('LH');
      expect(lufthansa).not.toBeNull();
      expect(lufthansa?.name).toBe('Lufthansa');
      
      const emirates = await airlineRepository.findByCode('EK');
      expect(emirates).not.toBeNull();
      expect(emirates?.name).toBe('Emirates');
    });
  });

  describe('3. Проверка валидации кодов авиакомпаний', () => {
    beforeEach(async () => {
      await databaseService.clearAllData();
    });

    it('должен принимать валидный IATA-код (2 символа)', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      const created = await airlineRepository.create(airline);
      expect(created.iataCode).toBe('SU');
    });

    it('должен принимать валидный ICAO-код (3 символа)', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      const created = await airlineRepository.create(airline);
      expect(created.icaoCode).toBe('AFL');
    });

    it('должен отклонять IATA-код неправильной длины', async () => {
      const airline1: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'S', // 1 символ
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline1)).rejects.toThrow('IATA code');

      const airline2: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SUU', // 3 символа
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline2)).rejects.toThrow('IATA code');
    });

    it('должен отклонять ICAO-код неправильной длины', async () => {
      const airline1: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AF', // 2 символа
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline1)).rejects.toThrow('ICAO code');

      const airline2: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFLL', // 4 символа
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline2)).rejects.toThrow('ICAO code');
    });

    it('должен автоматически приводить коды к верхнему регистру', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'su', // нижний регистр
        icaoCode: 'afl', // нижний регистр
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      const created = await airlineRepository.create(airline);
      expect(created.iataCode).toBe('SU');
      expect(created.icaoCode).toBe('AFL');
    });

    it('должен отклонять дублирующиеся IATA-коды', async () => {
      const airline1: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Aeroflot',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await airlineRepository.create(airline1);

      const airline2: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU', // Дубликат
        icaoCode: 'XXX',
        name: 'Another Airline',
        country: 'USA',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline2)).rejects.toThrow('DB_DUPLICATE_CODE');
    });

    it('должен отклонять дублирующиеся ICAO-коды', async () => {
      const airline1: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Aeroflot',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await airlineRepository.create(airline1);

      const airline2: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'XX',
        icaoCode: 'AFL', // Дубликат
        name: 'Another Airline',
        country: 'USA',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline2)).rejects.toThrow('DB_DUPLICATE_CODE');
    });
  });

  describe('4. Интеграция AirlineRepository + TicketRepository', () => {
    beforeEach(async () => {
      await databaseService.clearAllData();
      await airlineRepository.initialize(seedAirlines);
    });

    it('должен сохранять билет с кодом существующей авиакомпании', async () => {
      // Проверяем, что авиакомпания существует
      const airline = await airlineRepository.findByCode('SU');
      expect(airline).not.toBeNull();

      // Сохраняем билет
      const ticket = await ticketRepository.save({
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.airlineCode).toBe('SU');
    });

    it('должен находить билеты по коду авиакомпании через индекс', async () => {
      // Создаём несколько билетов
      await ticketRepository.save({
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      await ticketRepository.save({
        passengerName: 'PETROV/PETR',
        airlineCode: 'LH',
        flightNumber: 'LH5678',
        departureDate: '2025-07-20T14:00:00Z',
        departureAirport: 'FRA',
        arrivalAirport: 'MUC',
        seat: '22B',
        serviceClass: 'Business',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      // Проверяем, что индекс работает (запрос должен быть быстрым)
      const db = await databaseService.getDatabase();
      const tickets = await db.getAllAsync<any>(
        'SELECT * FROM tickets WHERE airline_code = ?',
        ['SU']
      );

      expect(tickets).toHaveLength(1);
      expect(tickets[0].passenger_name).toBe('IVANOV/IVAN');
    });
  });

  describe('5. Проверка производительности индексов', () => {
    beforeEach(async () => {
      await databaseService.clearAllData();
      await airlineRepository.initialize(seedAirlines);
    });

    it('должен быстро находить авиакомпанию по IATA-коду через индекс', async () => {
      const startTime = Date.now();
      const airline = await airlineRepository.findByCode('SU');
      const endTime = Date.now();

      expect(airline).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Должно быть быстрее 100ms
    });

    it('должен быстро находить авиакомпанию по ICAO-коду через индекс', async () => {
      const startTime = Date.now();
      const airline = await airlineRepository.findByCode('AFL');
      const endTime = Date.now();

      expect(airline).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Должно быть быстрее 100ms
    });

    it('должен быстро выполнять поиск по названию через индекс', async () => {
      const startTime = Date.now();
      const results = await airlineRepository.search('Aeroflot');
      const endTime = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Должно быть быстрее 100ms
    });
  });
});
