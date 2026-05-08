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

      // Очищаем старые данные
      await airlineRepository.deleteAllAirlines();
      
      // Загружаем новые данные
      await airlineRepository.initializeV6(seedAirlines);

    }

    // ПРОВЕРКА V8: Обновление URL регистрации (хирургическое)
    const isV8Seeded = await airlineRepository.isInitializedV8();
    if (!isV8Seeded) {

      await airlineRepository.updateUrlsSurgically(seedAirlines);

    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}
