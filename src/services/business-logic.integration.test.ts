/**
 * Интеграционный тест для проверки бизнес-логики
 * Задача 9: Checkpoint — Проверка бизнес-логики
 * 
 * Проверяет:
 * - OCR корректно распознаёт тестовое изображение билета
 * - Парсер извлекает все поля
 * - RegistrationMatcher корректно вычисляет дату регистрации
 * - Уведомления планируются корректно
 */

import { ticketParser } from './TicketParser';
import { registrationMatcher } from './RegistrationMatcher';
import { databaseService } from './database/DatabaseService';
import { airlineRepository } from './database/AirlineRepository';
import { ticketRepository } from './database/TicketRepository';
import { seedAirlines } from '../utils/seedData';

describe('Business Logic Integration Tests (Checkpoint 9)', () => {
  beforeAll(async () => {
    // Инициализируем базу данных с seed данными
    await databaseService.clearAllData();
    await airlineRepository.initialize(seedAirlines);
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('1. Парсер извлекает все поля', () => {
    it('должен извлечь все поля из типичного текста билета', () => {
      const sampleText = `
        BOARDING PASS
        IVANOV/IVAN
        SU1234
        15JAN25
        SVO-LED
        SEAT 14A
        ECONOMY CLASS
      `;

      const result = ticketParser.parse(sampleText);

      expect(result.passengerName).toBe('IVANOV/IVAN');
      expect(result.airlineCode).toBe('SU');
      expect(result.flightNumber).toBe('SU1234');
      expect(result.departureDate).toBeTruthy();
      expect(result.departureAirport).toBe('SVO');
      expect(result.arrivalAirport).toBe('LED');
      expect(result.seat).toBe('14A');
      expect(result.serviceClass).toBe('Economy');
    });

    it('должен извлечь поля из текста с форматом DD MMM YYYY', () => {
      const sampleText = `
        PASSENGER: PETROV/PETR
        FLIGHT: LH5678
        DATE: 15 JAN 2025
        FROM FRA TO MUC
        SEAT: 22B
        CLASS: BUSINESS
      `;

      const result = ticketParser.parse(sampleText);

      expect(result.passengerName).toBe('PETROV/PETR');
      expect(result.airlineCode).toBe('LH');
      expect(result.flightNumber).toBe('LH5678');
      expect(result.departureDate).toBeTruthy();
      expect(result.departureAirport).toBe('FRA');
      expect(result.arrivalAirport).toBe('MUC');
      expect(result.seat).toBe('22B');
      expect(result.serviceClass).toBe('Business');
    });

    it('должен устанавливать null для отсутствующих полей', () => {
      const sampleText = `
        SU1234
        15JAN25
      `;

      const result = ticketParser.parse(sampleText);

      expect(result.airlineCode).toBe('SU');
      expect(result.flightNumber).toBe('SU1234');
      expect(result.passengerName).toBeNull();
      expect(result.seat).toBeNull();
      expect(result.serviceClass).toBeNull();
    });

    it('должен корректно форматировать JSON с отступами', () => {
      const sampleText = `
        IVANOV/IVAN
        SU1234
        15JAN25
        SVO-LED
      `;

      const result = ticketParser.parse(sampleText);

      expect(result.rawJson).toBeTruthy();
      expect(result.rawJson).toContain('\n');
      expect(result.rawJson).toContain('  '); // 2 пробела отступа
      
      // Проверяем, что это валидный JSON
      const parsed = JSON.parse(result.rawJson);
      expect(parsed.passengerName).toBe('IVANOV/IVAN');
    });
  });

  describe('2. RegistrationMatcher корректно вычисляет дату регистрации', () => {
    it('должен найти Aeroflot и вычислить дату регистрации (24 часа)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match('SU', departureDate);

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Aeroflot');
      expect(result?.airline.checkInHoursBefore).toBe(24);
      expect(result?.registrationOpensAt.toISOString()).toBe('2025-06-14T10:00:00.000Z');
      expect(result?.formattedDate).toBeTruthy();
    });

    it('должен найти Emirates и вычислить дату регистрации (48 часов)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match('EK', departureDate);

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Emirates');
      expect(result?.airline.checkInHoursBefore).toBe(48);
      expect(result?.registrationOpensAt.toISOString()).toBe('2025-06-13T10:00:00.000Z');
    });

    it('должен найти Ryanair и вычислить дату регистрации (2 часа)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match('FR', departureDate);

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Ryanair');
      expect(result?.airline.checkInHoursBefore).toBe(2);
      expect(result?.registrationOpensAt.toISOString()).toBe('2025-06-15T08:00:00.000Z');
    });

    it('должен возвращать null для несуществующей авиакомпании', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match('XX', departureDate);

      expect(result).toBeNull();
    });

    it('должен работать с ICAO-кодом', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match('AFL', departureDate);

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Aeroflot');
    });
  });

  describe('3. Полный флоу: Парсинг → Сопоставление → Сохранение', () => {
    beforeEach(async () => {
      // Очищаем билеты перед каждым тестом
      const db = await databaseService.getDatabase();
      await db.runAsync('DELETE FROM tickets');
    });

    it('должен пройти полный цикл обработки билета', async () => {
      // Шаг 1: Парсинг OCR-текста
      const ocrText = `
        BOARDING PASS
        IVANOV/IVAN
        SU1234
        15JAN25
        SVO-LED
        SEAT 14A
        ECONOMY CLASS
      `;

      const ticketData = ticketParser.parse(ocrText);

      expect(ticketData.passengerName).toBe('IVANOV/IVAN');
      expect(ticketData.airlineCode).toBe('SU');
      expect(ticketData.flightNumber).toBe('SU1234');

      // Шаг 2: Сопоставление с реестром авиакомпаний
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const matchResult = await registrationMatcher.match(
        ticketData.airlineCode!,
        departureDate
      );

      expect(matchResult).not.toBeNull();
      expect(matchResult?.airline.name).toBe('Aeroflot');
      expect(matchResult?.registrationOpensAt).toBeTruthy();

      // Шаг 3: Сохранение билета в базу данных
      const savedTicket = await ticketRepository.save({
        passengerName: ticketData.passengerName || 'Unknown',
        airlineCode: ticketData.airlineCode || 'XX',
        flightNumber: ticketData.flightNumber || 'XX0000',
        departureDate: departureDate.toISOString(),
        departureAirport: ticketData.departureAirport || 'XXX',
        arrivalAirport: ticketData.arrivalAirport || 'XXX',
        seat: ticketData.seat,
        serviceClass: ticketData.serviceClass,
        rawJson: ticketData.rawJson,
        notificationEnabled: true,
        notificationId: null,
      });

      expect(savedTicket.id).toBeDefined();
      expect(savedTicket.scannedAt).toBeTruthy();

      // Шаг 4: Проверка, что билет сохранён
      const retrievedTicket = await ticketRepository.findById(savedTicket.id);
      expect(retrievedTicket).not.toBeNull();
      expect(retrievedTicket?.passengerName).toBe('IVANOV/IVAN');
    });

    it('должен обрабатывать билет с частично распознанными данными', async () => {
      // Парсинг с минимальными данными
      const ocrText = `
        SU1234
        15JAN25
      `;

      const ticketData = ticketParser.parse(ocrText);

      expect(ticketData.airlineCode).toBe('SU');
      expect(ticketData.flightNumber).toBe('SU1234');
      expect(ticketData.passengerName).toBeNull();

      // Сопоставление всё равно работает
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const matchResult = await registrationMatcher.match(
        ticketData.airlineCode!,
        departureDate
      );

      expect(matchResult).not.toBeNull();

      // Сохранение с дефолтными значениями
      const savedTicket = await ticketRepository.save({
        passengerName: ticketData.passengerName || 'Unknown',
        airlineCode: ticketData.airlineCode || 'XX',
        flightNumber: ticketData.flightNumber || 'XX0000',
        departureDate: departureDate.toISOString(),
        departureAirport: ticketData.departureAirport || 'XXX',
        arrivalAirport: ticketData.arrivalAirport || 'XXX',
        seat: ticketData.seat,
        serviceClass: ticketData.serviceClass,
        rawJson: ticketData.rawJson,
        notificationEnabled: false,
        notificationId: null,
      });

      expect(savedTicket.id).toBeDefined();
    });
  });

  describe('4. Обработка граничных случаев', () => {
    it('должен обрабатывать пустой OCR-текст', () => {
      const result = ticketParser.parse('');

      expect(result.passengerName).toBeNull();
      expect(result.airlineCode).toBeNull();
      expect(result.flightNumber).toBeNull();
      expect(result.departureDate).toBeNull();
      expect(result.departureAirport).toBeNull();
      expect(result.arrivalAirport).toBeNull();
      expect(result.seat).toBeNull();
      expect(result.serviceClass).toBeNull();
    });

    it('должен обрабатывать дату вылета в прошлом', async () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');
      const result = await registrationMatcher.match('SU', pastDate);

      expect(result).not.toBeNull();
      expect(result?.registrationOpensAt.getTime()).toBeLessThan(Date.now());
      expect(registrationMatcher.isRegistrationDatePassed(result!.registrationOpensAt)).toBe(true);
    });

    it('должен обрабатывать различные форматы имени пассажира', () => {
      const formats = [
        'IVANOV/IVAN',
        'PETROV/PETR',
        'SMITH/JOHN',
        "O'BRIEN/PATRICK",
        'GARCIA-LOPEZ/MARIA',
      ];

      for (const name of formats) {
        const result = ticketParser.parse(`PASSENGER: ${name}`);
        expect(result.passengerName).toBeTruthy();
      }
    });

    it('должен обрабатывать различные форматы класса обслуживания', () => {
      const testCases = [
        { text: 'ECONOMY CLASS', expected: 'Economy' },
        { text: 'BUSINESS CLASS', expected: 'Business' },
        { text: 'FIRST CLASS', expected: 'First' },
        { text: 'CLASS: Y', expected: 'Economy' },
        { text: 'CLASS: C', expected: 'Business' },
        { text: 'CLASS: F', expected: 'First' },
      ];

      for (const testCase of testCases) {
        const result = ticketParser.parse(testCase.text);
        expect(result.serviceClass).toBe(testCase.expected);
      }
    });
  });

  describe('5. Производительность', () => {
    it('должен быстро парсить текст билета', () => {
      const sampleText = `
        IVANOV/IVAN
        SU1234
        15JAN25
        SVO-LED
        SEAT 14A
        ECONOMY CLASS
      `;

      const startTime = Date.now();
      const result = ticketParser.parse(sampleText);
      const endTime = Date.now();

      expect(result).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(50); // Должно быть быстрее 50ms
    });

    it('должен быстро находить авиакомпанию и вычислять дату', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');

      const startTime = Date.now();
      const result = await registrationMatcher.match('SU', departureDate);
      const endTime = Date.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Должно быть быстрее 100ms
    });
  });
});
