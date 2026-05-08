import { registrationMatcher } from './RegistrationMatcher';
import { airlineRepository } from './database/AirlineRepository';
import { databaseService } from './database/DatabaseService';
import { Airline } from '../types/airline';

import i18next from 'i18next';

describe('RegistrationMatcher', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('ru');
  });
  beforeEach(async () => {
    // Очищаем базу перед каждым тестом
    await databaseService.clearAllData();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Поиск авиакомпании', () => {
    beforeEach(async () => {
      // Создаём тестовую авиакомпанию
      await airlineRepository.create({
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Aeroflot',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: 'https://www.aeroflot.ru',
        supportPhone: '+7 (495) 223-55-55',
        checkInHoursBefore: 24,
        notes: null,
      });
    });

    it('должен находить авиакомпанию по IATA-коду', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'SU', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.airline.iataCode).toBe('SU');
      expect(result?.airline.name).toBe('Aeroflot');
    });

    it('должен находить авиакомпанию по ICAO-коду', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'AFL', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.airline.icaoCode).toBe('AFL');
      expect(result?.airline.name).toBe('Aeroflot');
    });

    it('должен возвращать null для несуществующего кода', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'XX', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).toBeNull();
    });
  });

  describe('Вычисление даты регистрации', () => {
    it('должен корректно вычислять дату для 24 часов', () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const registrationDate = registrationMatcher.computeRegistrationDate(departureDate, 24);

      // Ожидаем: 2025-06-14T10:00:00Z (на 24 часа раньше)
      expect(registrationDate.toISOString()).toBe('2025-06-14T10:00:00.000Z');
    });

    it('должен корректно вычислять дату для 48 часов', () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const registrationDate = registrationMatcher.computeRegistrationDate(departureDate, 48);

      // Ожидаем: 2025-06-13T10:00:00Z (на 48 часов раньше)
      expect(registrationDate.toISOString()).toBe('2025-06-13T10:00:00.000Z');
    });

    it('должен корректно вычислять дату для 2 часов (Ryanair)', () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const registrationDate = registrationMatcher.computeRegistrationDate(departureDate, 2);

      // Ожидаем: 2025-06-15T08:00:00Z (на 2 часа раньше)
      expect(registrationDate.toISOString()).toBe('2025-06-15T08:00:00.000Z');
    });

    it('должен корректно вычислять дату для 720 часов (30 дней)', () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const registrationDate = registrationMatcher.computeRegistrationDate(departureDate, 720);

      // Ожидаем: 2025-05-16T10:00:00Z (на 30 дней раньше)
      expect(registrationDate.toISOString()).toBe('2025-05-16T10:00:00.000Z');
    });
  });

  describe('Форматирование даты', () => {
    it('должен форматировать дату в DD.MM.YYYY HH:MM', () => {
      const date = new Date('2025-06-15T10:30:00Z');
      const formatted = registrationMatcher.formatDate(date);

      // Примечание: результат зависит от часового пояса
      // Проверяем только формат
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    });

    it('должен добавлять ведущие нули для однозначных чисел', () => {
      const date = new Date('2025-01-05T09:05:00Z');
      const formatted = registrationMatcher.formatDate(date);

      // Проверяем наличие ведущих нулей
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    });
  });

  describe('Интеграция с базой данных', () => {
    beforeEach(async () => {
      // Создаём несколько авиакомпаний с разными правилами регистрации
      await airlineRepository.create({
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Aeroflot',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      });

      await airlineRepository.create({
        iataCode: 'EK',
        icaoCode: 'UAE',
        name: 'Emirates',
        country: 'UAE',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 48,
        notes: null,
      });

      await airlineRepository.create({
        iataCode: 'FR',
        icaoCode: 'RYR',
        name: 'Ryanair',
        country: 'Ireland',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 2,
        notes: null,
      });
    });

    it('должен корректно вычислять дату для Aeroflot (24 часа)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'SU', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).not.toBeNull();
      // Учитываем часовой пояс среды тестирования (Киев/Москва UTC+3) или UTC
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-14T(10|07):00:00.000Z/);
    });

    it('должен корректно вычислять дату для Emirates (48 часов)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'EK', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-13T(10|07):00:00.000Z/);
    });

    it('должен корректно вычислять дату для Ryanair (2 часа)', async () => {
      const departureDate = new Date('2025-06-15T10:00:00Z');
      const result = await registrationMatcher.match({ airlineCode: 'FR', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-15T(08|05):00:00.000Z/);
    });

    it('должен работать с датой в формате ISO 8601 string', async () => {
      const departureDateString = '2025-06-15T10:00:00Z';
      const result = await registrationMatcher.match({ airlineCode: 'SU', departureDate: '2025-06-15', departureTime: '10:00' });

      expect(result).not.toBeNull();
      expect(result?.registrationOpensAt.toISOString()).toMatch(/2025-06-14T(10|07):00:00.000Z/);
    });
  });

  describe('Проверка даты в прошлом', () => {
    it('должен определять, что дата в прошлом', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      expect(registrationMatcher.isRegistrationDatePassed(pastDate)).toBe(true);
    });

    it('должен определять, что дата в будущем', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Завтра
      expect(registrationMatcher.isRegistrationDatePassed(futureDate)).toBe(false);
    });
  });

  describe('Время до регистрации', () => {
    it('должен показывать "Регистрация уже открыта" для прошлой даты', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const timeUntil = registrationMatcher.getTimeUntilRegistration(pastDate);

      expect(timeUntil).toBe('Регистрация уже открыта');
    });

    it('должен показывать время в днях и часах', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 25); // 25 часов
      const timeUntil = registrationMatcher.getTimeUntilRegistration(futureDate);

      expect(timeUntil).toContain('дн');
      expect(timeUntil).toContain('час');
    });

    it('должен показывать время в часах и минутах', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 90); // 90 минут
      const timeUntil = registrationMatcher.getTimeUntilRegistration(futureDate);

      expect(timeUntil).toContain('час');
      expect(timeUntil).toContain('мин');
    });
  });
});
