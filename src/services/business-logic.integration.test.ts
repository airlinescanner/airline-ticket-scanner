/**
 * Интеграционный тест для проверки бизнес-логики
 * Задача 9: Checkpoint — Проверка бизнес-логики
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
        LH1234
        15JAN25
        FRA-MUC
        SEAT 14A
        ECONOMY CLASS
      `;

      const [result] = ticketParser.parse(sampleText);

      expect(result.passengerName).toBe('IVANOV/IVAN');
      expect(result.airlineCode).toBe('LH');
      expect(result.flightNumber).toBe('LH1234');
      expect(result.departureAirport).toBe('FRA');
      expect(result.arrivalAirport).toBe('MUC');
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

      const [result] = ticketParser.parse(sampleText);

      expect(result.passengerName).toBe('PETROV/PETR');
      expect(result.airlineCode).toBe('LH');
      expect(result.flightNumber).toBe('LH5678');
      expect(result.departureAirport).toBe('FRA');
      expect(result.arrivalAirport).toBe('MUC');
      expect(result.seat).toBe('22B');
      expect(result.serviceClass).toBe('Business');
    });

    it('должен устанавливать null для отсутствующих полей', () => {
      const sampleText = `
        LH1234
        15JAN25
      `;

      const [result] = ticketParser.parse(sampleText);

      expect(result.airlineCode).toBe('LH');
      expect(result.flightNumber).toBe('LH1234');
      expect(result.passengerName).toBeNull();
      expect(result.seat).toBeNull();
      expect(result.serviceClass).toBeNull();
    });
  });

  describe('2. RegistrationMatcher корректно вычисляет дату регистрации', () => {
    it('должен найти Lufthansa и вычислить дату регистрации (30 часов)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'LH', departureDate: departureDate.toISOString().split('T')[0], departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Lufthansa');
      expect(result?.airline.checkInHoursBefore).toBe(30);
      // 10:00 - 30 hours = 04:00 previous day
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-14T(04|01):00:00.000Z/);
    });

    it('должен найти Emirates и вычислить дату регистрации (48 часов)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'EK', departureDate: departureDate.toISOString().split('T')[0], departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Emirates');
      expect(result?.airline.checkInHoursBefore).toBe(48);
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-13T(10|07):00:00.000Z/);
    });

    it('должен найти Ryanair и вычислить дату регистрации (2 часа)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'FR', departureDate: departureDate.toISOString().split('T')[0], departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Ryanair');
      expect(result?.airline.checkInHoursBefore).toBe(24);
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-14T(10|07):00:00.000Z/);
    });

    it('должен работать с ICAO-кодом', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'DLH', departureDate: departureDate.toISOString().split('T')[0], departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.airline.name).toBe('Lufthansa');
    });
  });

  describe('3. Полный флоу: Парсинг → Сопоставление → Сохранение', () => {
    it('должен пройти полный цикл обработки билета', async () => {
      const ocrText = `
        BOARDING PASS
        IVANOV/IVAN
        LH1234
        15JAN25
        FRA-MUC
        SEAT 14A
        ECONOMY CLASS
      `;

      const [ticketData] = ticketParser.parse(ocrText);
      const departureDate = new Date('2025-06-15T10:00:00Z');
      
      const matchResult = await registrationMatcher.match({
        airlineCode: ticketData.airlineCode!,
        departureDate: departureDate.toISOString().split('T')[0],
        departureTime: '10:00'
      });

      expect(matchResult).not.toBeNull();
      expect(matchResult?.airline.name).toBe('Lufthansa');

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
        airlineName: null,
        operatingAirlineName: null,
        operatingAirlineCode: null,
        departureTime: null,
        departureCity: null,
        departureCountry: null,
        arrivalCity: null,
        arrivalCountry: null,
        bookingReference: null,
        tripId: null,
      });

      expect(savedTicket.id).toBeDefined();
      const retrievedTicket = await ticketRepository.findById(savedTicket.id);
      expect(retrievedTicket?.passengerName).toBe('IVANOV/IVAN');
    });
  });

  describe('4. Обработка граничных случаев', () => {
    it('должен обрабатывать дату вылета в прошлом', async () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'LH', departureDate: pastDate.toISOString().split('T')[0], departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(registrationMatcher.isRegistrationDatePassed(result!.registrationOpensAt)).toBe(true);
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
        const [result] = ticketParser.parse(testCase.text);
        expect(result.serviceClass).toBe(testCase.expected);
      }
    });
  });
});
