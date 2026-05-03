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
    
    if (isV6Seeded) {
      console.log('Database already initialized with V6 data, skipping seed');
      return;
    }

    console.log('Initializing database with new international seed data (v6)...');
    // Очищаем старые данные
    await airlineRepository.deleteAllAirlines();
    
    // Загружаем новые данные
    await airlineRepository.initializeV6(seedAirlines);
    console.log(`Database updated with ${seedAirlines.length} international airlines (v6)`);
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}
