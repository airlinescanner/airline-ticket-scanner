import { airlineRepository } from './AirlineRepository';
import { databaseService } from './DatabaseService';
import { Airline } from '../../types/airline';

describe('AirlineRepository', () => {
  beforeEach(async () => {
    // Очищаем базу перед каждым тестом
    await databaseService.clearAllData();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Валидация', () => {
    it('должен отклонять IATA-код из 1 символа', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'A',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline)).rejects.toThrow(
        'IATA code must be exactly 2 alphanumeric characters'
      );
    });

    it('должен отклонять IATA-код из 3 символов', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'ABC',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline)).rejects.toThrow(
        'IATA code must be exactly 2 alphanumeric characters'
      );
    });

    it('должен отклонять ICAO-код из 2 символов', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AF',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline)).rejects.toThrow(
        'ICAO code must be exactly 3 alphanumeric characters'
      );
    });

    it('должен отклонять checkInHoursBefore < 1', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 0,
        notes: null,
      };

      await expect(airlineRepository.create(airline)).rejects.toThrow(
        'Check-in hours must be between 1 and 720'
      );
    });

    it('должен отклонять checkInHoursBefore > 720', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 721,
        notes: null,
      };

      await expect(airlineRepository.create(airline)).rejects.toThrow(
        'Check-in hours must be between 1 and 720'
      );
    });

    it('должен отклонять невалидный URL регистрации', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Test Airline',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: 'bad',
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      };

      await expect(airlineRepository.create(airline)).rejects.toThrow(
        'DB_VALIDATION_ERROR: Invalid Registration URL format'
      );
    });
  });

  describe('CRUD операции', () => {
    it('должен создать авиакомпанию с автоматическим updated_at', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
        iataCode: 'SU',
        icaoCode: 'AFL',
        name: 'Aeroflot',
        country: 'Russia',
        logoUrl: null,
        registrationUrl: 'https://www.aeroflot.ru',
        supportPhone: '+7 (495) 223-55-55',
        checkInHoursBefore: 24,
        notes: null,
      };

      const created = await airlineRepository.create(airline);

      expect(created.id).toBeDefined();
      expect(created.iataCode).toBe('SU');
      expect(created.icaoCode).toBe('AFL');
      expect(created.updatedAt).toBeDefined();
      expect(new Date(created.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('должен находить авиакомпанию по IATA-коду', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
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

      await airlineRepository.create(airline);
      const found = await airlineRepository.findByCode('SU');

      expect(found).not.toBeNull();
      expect(found?.iataCode).toBe('SU');
    });

    it('должен находить авиакомпанию по ICAO-коду', async () => {
      const airline: Omit<Airline, 'id' | 'updatedAt'> = {
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

      await airlineRepository.create(airline);
      const found = await airlineRepository.findByCode('AFL');

      expect(found).not.toBeNull();
      expect(found?.icaoCode).toBe('AFL');
    });

    it('должен возвращать null для несуществующего кода', async () => {
      const found = await airlineRepository.findByCode('XX');
      expect(found).toBeNull();
    });

    it('должен отклонять дублирующийся IATA-код', async () => {
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

      await airlineRepository.create(airline1);
      await expect(airlineRepository.create(airline2)).rejects.toThrow('DB_DUPLICATE_CODE');
    });

    it('должен отклонять дублирующийся ICAO-код', async () => {
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

      await airlineRepository.create(airline1);
      await expect(airlineRepository.create(airline2)).rejects.toThrow('DB_DUPLICATE_CODE');
    });
  });

  describe('Поиск', () => {
    beforeEach(async () => {
      // Создаём несколько авиакомпаний для тестирования поиска
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
        iataCode: 'LH',
        icaoCode: 'DLH',
        name: 'Lufthansa',
        country: 'Germany',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 23,
        notes: null,
      });

      await airlineRepository.create({
        iataCode: 'BA',
        icaoCode: 'BAW',
        name: 'British Airways',
        country: 'UK',
        logoUrl: null,
        registrationUrl: null,
        supportPhone: null,
        checkInHoursBefore: 24,
        notes: null,
      });
    });

    it('должен находить по названию (без учёта регистра)', async () => {
      const results = await airlineRepository.search('aeroflot');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Aeroflot');
    });

    it('должен находить по IATA-коду', async () => {
      const results = await airlineRepository.search('su');
      expect(results).toHaveLength(1);
      expect(results[0].iataCode).toBe('SU');
    });

    it('должен находить по ICAO-коду', async () => {
      const results = await airlineRepository.search('dlh');
      expect(results).toHaveLength(1);
      expect(results[0].icaoCode).toBe('DLH');
    });

    it('должен находить по стране', async () => {
      const results = await airlineRepository.search('germany');
      expect(results).toHaveLength(1);
      expect(results[0].country).toBe('Germany');
    });

    it('должен возвращать пустой массив для несуществующего запроса', async () => {
      const results = await airlineRepository.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Инициализация', () => {
    it('должен быть идемпотентным при повторном вызове', async () => {
      const seedData: Omit<Airline, 'id' | 'updatedAt'>[] = [
        {
          iataCode: 'SU',
          icaoCode: 'AFL',
          name: 'Aeroflot',
          country: 'Russia',
          logoUrl: null,
          registrationUrl: null,
          supportPhone: null,
          checkInHoursBefore: 24,
          notes: null,
        },
      ];

      // Первая инициализация
      await airlineRepository.initialize(seedData);
      const firstCount = (await airlineRepository.findAll()).length;

      // Вторая инициализация (не должна добавлять дубликаты)
      await airlineRepository.initialize(seedData);
      const secondCount = (await airlineRepository.findAll()).length;

      expect(firstCount).toBe(secondCount);
    });

    it('должен устанавливать флаг is_seeded', async () => {
      const seedData: Omit<Airline, 'id' | 'updatedAt'>[] = [
        {
          iataCode: 'SU',
          icaoCode: 'AFL',
          name: 'Aeroflot',
          country: 'Russia',
          logoUrl: null,
          registrationUrl: null,
          supportPhone: null,
          checkInHoursBefore: 24,
          notes: null,
        },
      ];

      expect(await airlineRepository.isInitialized()).toBe(false);
      await airlineRepository.initialize(seedData);
      expect(await airlineRepository.isInitialized()).toBe(true);
    });
  });
});
