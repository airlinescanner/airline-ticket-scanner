import { databaseService } from './DatabaseService';

describe('DatabaseService', () => {
  afterAll(async () => {
    await databaseService.close();
  });

  it('должен инициализировать базу данных', async () => {
    const db = await databaseService.getDatabase();
    expect(db).toBeDefined();
  });

  it('должен создать таблицы airlines, tickets, app_meta', async () => {
    const db = await databaseService.getDatabase();
    
    // Проверяем наличие таблиц
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('airlines', 'tickets', 'app_meta')"
    );
    
    expect(tables).toHaveLength(3);
    expect(tables.map(t => t.name).sort()).toEqual(['airlines', 'app_meta', 'tickets']);
  });

  it('должен создать индексы для оптимизации', async () => {
    const db = await databaseService.getDatabase();
    
    // Проверяем наличие индексов
    const indexes = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
    );
    
    expect(indexes.length).toBeGreaterThanOrEqual(5); // 3 для airlines + 2 для tickets
  });
});
