import { airlineRepository } from './AirlineRepository';
import { seedAirlines } from '../../utils/seedData';

/**
 * Инициализация базы данных при первом запуске приложения
 * Идемпотентная операция - безопасно вызывать многократно
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Проверяем, была ли уже инициализация новой версии базы (v6)
    const isV6Seeded = await airlineRepository.isInitializedV6();
    
    if (!isV6Seeded) {
      // Загружаем новые данные безопасным способом (сохраняя пользовательские данные и авиакомпании)
      await airlineRepository.initializeV6Smart(seedAirlines);
    }

    // ПРОВЕРКА V8: Обновление URL регистрации (хирургическое)
    const isV8Seeded = await airlineRepository.isInitializedV8();
    if (!isV8Seeded) {
      await airlineRepository.updateUrlsSurgically(seedAirlines);
    }

    // Хирургическое добавление Discover Airlines (4Y), если её нет в БД
    const discoverAirlines = await airlineRepository.findByCode('4Y');
    if (!discoverAirlines) {
      console.log('[initializeDatabase] Discover Airlines (4Y) not found. Seeding surgically...');
      await airlineRepository.create({
        iataCode: '4Y',
        icaoCode: 'OCN',
        name: 'Discover Airlines',
        country: 'Germany',
        logoUrl: null,
        registrationUrl: 'https://www.discover-airlines.com/en/check-in/',
        supportPhone: '',
        checkInHoursBefore: 30,
        notes: 'Surgically seeded on startup'
      });
    } else if (discoverAirlines.checkInHoursBefore !== 30) {
      console.log('[initializeDatabase] Correcting Discover Airlines checkInHoursBefore to 30...');
      await airlineRepository.update(discoverAirlines.id, {
        checkInHoursBefore: 30,
        registrationUrl: 'https://www.discover-airlines.com/en/check-in/'
      });
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}
