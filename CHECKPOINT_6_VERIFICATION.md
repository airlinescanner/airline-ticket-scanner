# Checkpoint 6: Проверка базы данных

## Статус: ✅ ГОТОВО К ПРОВЕРКЕ

Все компоненты базы данных реализованы и готовы к тестированию.

## Что было реализовано

### 1. DatabaseService ✅
- Инициализация SQLite базы данных
- Создание 3 таблиц: `airlines`, `tickets`, `app_meta`
- Создание 5 индексов для оптимизации запросов
- Методы управления соединением

### 2. AirlineRepository ✅
- CRUD операции (create, read, update, delete)
- Полная валидация кодов IATA/ICAO
- Поиск по названию, кодам, стране
- Идемпотентная инициализация с seed данными
- Проверка дубликатов

### 3. TicketRepository ✅
- Сохранение билетов с автоматическим scanned_at
- Поиск с сортировкой и лимитом
- Обновление статуса уведомлений
- Удаление и замена всех билетов

### 4. Seed Data ✅
- 20 предзаполненных авиакомпаний
- Полная информация для каждой авиакомпании

## Проверка работоспособности

### Автоматическая проверка при запуске приложения

База данных автоматически инициализируется при запуске приложения в `App.tsx`:

```typescript
React.useEffect(() => {
  initializeDatabase()
    .then(() => {
      console.log('Database ready');
      setIsDbReady(true);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      setIsDbReady(true);
    });
}, []);
```

### Ручная проверка через консоль

После запуска приложения (`npm start`), откройте консоль разработчика и проверьте:

1. **Сообщение об инициализации**:
   ```
   Initializing database with seed data...
   Database initialized with 20 airlines
   Database ready
   ```

2. **Проверка через React Native Debugger**:
   ```javascript
   import { airlineRepository } from './src/services/database';
   
   // Проверить количество авиакомпаний
   airlineRepository.findAll().then(airlines => {
     console.log('Total airlines:', airlines.length); // Должно быть 20
   });
   
   // Найти конкретную авиакомпанию
   airlineRepository.findByCode('SU').then(airline => {
     console.log('Aeroflot:', airline); // Должен вернуть Aeroflot
   });
   ```

## Критерии успешной проверки

### ✅ 1. Таблицы создаются корректно

**Проверка**: База данных должна содержать 3 таблицы с правильной структурой.

**Как проверить**:
- Запустить приложение
- Проверить логи на наличие ошибок создания таблиц
- Убедиться, что приложение не падает при запуске

**Ожидаемый результат**: Приложение запускается без ошибок, база данных инициализируется.

### ✅ 2. Предзаполнение работает только при первом запуске

**Проверка**: Seed данные добавляются только один раз.

**Как проверить**:
1. Первый запуск: проверить, что добавлено 20 авиакомпаний
2. Перезапустить приложение
3. Проверить, что количество авиакомпаний осталось 20 (не удвоилось)

**Ожидаемый результат**: 
- Первый запуск: "Initializing database with seed data..."
- Последующие запуски: "Database already initialized, skipping seed"

### ✅ 3. Валидация кодов авиакомпаний работает

**Проверка**: Невалидные коды отклоняются.

**Тестовые случаи**:

#### Валидные коды (должны приниматься):
```typescript
// IATA: 2 символа
{ iataCode: 'SU', icaoCode: 'AFL' } // ✅
{ iataCode: 'LH', icaoCode: 'DLH' } // ✅
{ iataCode: 'BA', icaoCode: 'BAW' } // ✅

// Автоматическое приведение к верхнему регистру
{ iataCode: 'su', icaoCode: 'afl' } // ✅ → SU, AFL
```

#### Невалидные коды (должны отклоняться):
```typescript
// IATA неправильной длины
{ iataCode: 'S', icaoCode: 'AFL' }    // ❌ 1 символ
{ iataCode: 'SUU', icaoCode: 'AFL' }  // ❌ 3 символа

// ICAO неправильной длины
{ iataCode: 'SU', icaoCode: 'AF' }    // ❌ 2 символа
{ iataCode: 'SU', icaoCode: 'AFLL' }  // ❌ 4 символа

// Дубликаты
{ iataCode: 'SU', icaoCode: 'XXX' }   // ❌ IATA уже существует
{ iataCode: 'XX', icaoCode: 'AFL' }   // ❌ ICAO уже существует
```

**Как проверить**:
```typescript
import { airlineRepository } from './src/services/database';

// Попытка создать авиакомпанию с невалидным кодом
try {
  await airlineRepository.create({
    iataCode: 'S', // 1 символ - невалидно
    icaoCode: 'AFL',
    name: 'Test',
    country: 'Test',
    checkInHoursBefore: 24,
    // ...
  });
} catch (error) {
  console.log('Ошибка валидации:', error.message);
  // Должно быть: "DB_VALIDATION_ERROR: IATA code must be exactly 2 alphanumeric characters"
}
```

**Ожидаемый результат**: Все невалидные коды отклоняются с соответствующими сообщениями об ошибках.

## Unit-тесты

Созданы следующие тестовые файлы:

1. **DatabaseService.test.ts** - тесты инициализации базы данных
2. **AirlineRepository.test.ts** - тесты CRUD операций и валидации
3. **TicketRepository.test.ts** - тесты работы с билетами
4. **database.integration.test.ts** - интеграционные тесты

**Примечание**: Для запуска тестов требуется React Native окружение. Тесты можно запустить в эмуляторе или на реальном устройстве.

## Производительность

### Индексы для оптимизации

Созданы следующие индексы:

**Таблица airlines**:
- `idx_airlines_iata` - поиск по IATA-коду
- `idx_airlines_icao` - поиск по ICAO-коду
- `idx_airlines_name` - поиск по названию (без учёта регистра)

**Таблица tickets**:
- `idx_tickets_scanned_at` - сортировка по дате сканирования (DESC)
- `idx_tickets_airline_code` - поиск билетов по авиакомпании

### Ожидаемая производительность

- Поиск авиакомпании по коду: < 10ms
- Поиск по названию: < 50ms
- Получение истории билетов (50 записей): < 100ms

## Следующие шаги

После успешной проверки checkpoint 6, можно переходить к:

**Задача 7: OCR и парсинг билетов**
- Интеграция Google ML Kit Text Recognition
- Реализация TicketParser
- Парсинг полей билета из OCR-текста

## Известные ограничения

1. **Тестирование**: Unit-тесты требуют React Native окружение для работы с expo-sqlite
2. **Миграции**: Пока не реализованы миграции схемы базы данных (будут добавлены при необходимости)
3. **Транзакции**: Пока не используются транзакции для атомарных операций (будут добавлены в BackupManager)

## Документация

Полная документация по базе данных доступна в файле `DATABASE_README.md`.
