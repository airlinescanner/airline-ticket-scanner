# База данных Airline Ticket Scanner

## Обзор

Приложение использует SQLite (expo-sqlite) для локального хранения данных. Все данные хранятся на устройстве пользователя, никаких внешних серверов.

## Структура базы данных

### Таблица `airlines`

Хранит информацию об авиакомпаниях.

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Первичный ключ (автоинкремент) |
| iata_code | TEXT | IATA-код (2 символа, уникальный) |
| icao_code | TEXT | ICAO-код (3 символа, уникальный) |
| name | TEXT | Название авиакомпании |
| country | TEXT | Страна |
| logo_url | TEXT | URL логотипа (опционально) |
| registration_url | TEXT | URL страницы регистрации (опционально) |
| support_phone | TEXT | Телефон поддержки (опционально) |
| check_in_hours_before | INTEGER | За сколько часов открывается регистрация (1-720) |
| notes | TEXT | Заметки (опционально) |
| updated_at | TEXT | Дата последнего обновления (ISO 8601) |

**Индексы:**
- `idx_airlines_iata` - по IATA-коду
- `idx_airlines_icao` - по ICAO-коду
- `idx_airlines_name` - по названию (без учёта регистра)

### Таблица `tickets`

Хранит отсканированные билеты.

| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Первичный ключ (автоинкремент) |
| passenger_name | TEXT | Имя пассажира |
| airline_code | TEXT | Код авиакомпании (IATA или ICAO) |
| flight_number | TEXT | Номер рейса |
| departure_date | TEXT | Дата вылета (ISO 8601) |
| departure_airport | TEXT | Аэропорт вылета (IATA-код) |
| arrival_airport | TEXT | Аэропорт прилёта (IATA-код) |
| seat | TEXT | Место (опционально) |
| service_class | TEXT | Класс обслуживания (опционально) |
| raw_json | TEXT | Исходный JSON билета |
| scanned_at | TEXT | Дата сканирования (ISO 8601) |
| notification_enabled | INTEGER | Включено ли уведомление (0/1) |
| notification_id | TEXT | ID запланированного уведомления (опционально) |

**Индексы:**
- `idx_tickets_scanned_at` - по дате сканирования (DESC)
- `idx_tickets_airline_code` - по коду авиакомпании

### Таблица `app_meta`

Служебная таблица для хранения метаданных приложения.

| Поле | Тип | Описание |
|------|-----|----------|
| key | TEXT | Ключ (первичный ключ) |
| value | TEXT | Значение |

**Используется для:**
- `is_seeded` - флаг инициализации базы данных
- `schema_version` - версия схемы базы данных

## Репозитории

### AirlineRepository

**Методы:**
- `findByCode(code: string)` - найти авиакомпанию по IATA или ICAO коду
- `findAll()` - получить все авиакомпании (сортировка по названию)
- `search(query: string)` - поиск по названию, кодам, стране
- `create(airline)` - создать новую авиакомпанию
- `update(id, data)` - обновить авиакомпанию
- `delete(id)` - удалить авиакомпанию
- `initialize(seedData)` - инициализация с предзаполненными данными (идемпотентная)
- `isInitialized()` - проверка, была ли выполнена инициализация
- `replaceAll(airlines)` - заменить все авиакомпании (для восстановления из бэкапа)

**Валидация:**
- IATA-код: ровно 2 буквенно-цифровых символа, верхний регистр
- ICAO-код: ровно 3 буквенно-цифровых символа, верхний регистр
- checkInHoursBefore: от 1 до 720
- registrationUrl: должен начинаться с `https://`
- Проверка дубликатов кодов IATA/ICAO

### TicketRepository

**Методы:**
- `save(ticket)` - сохранить новый билет (автоматически устанавливает scanned_at)
- `findAll(limit?)` - получить все билеты (сортировка по дате сканирования DESC, по умолчанию 50)
- `findById(id)` - найти билет по ID
- `updateNotification(id, enabled, notificationId?)` - обновить статус уведомления
- `delete(id)` - удалить билет
- `replaceAll(tickets)` - заменить все билеты (для восстановления из бэкапа)

## Инициализация базы данных

При первом запуске приложения база данных автоматически инициализируется с 20 предзаполненными авиакомпаниями:

- Aeroflot (SU/AFL)
- Lufthansa (LH/DLH)
- Emirates (EK/UAE)
- Turkish Airlines (TK/THY)
- Air France (AF/AFR)
- British Airways (BA/BAW)
- KLM (KL/KLM)
- Qatar Airways (QR/QTR)
- Singapore Airlines (SQ/SIA)
- Ryanair (FR/RYR)
- easyJet (U2/EZY)
- Wizz Air (W6/WZZ)
- Flydubai (FZ/FDB)
- S7 Airlines (S7/SBI)
- Ural Airlines (U6/SVR)
- Pobeda (DP/POB)
- Air Arabia (G9/ABY)
- Pegasus Airlines (PC/PGT)
- Vueling (VY/VLG)
- Norwegian (DY/NAX)

Инициализация идемпотентна - повторный вызов не добавит дубликаты.

## Использование

```typescript
import { airlineRepository, ticketRepository } from './src/services/database';

// Найти авиакомпанию
const airline = await airlineRepository.findByCode('SU');

// Сохранить билет
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

// Получить историю билетов
const tickets = await ticketRepository.findAll(50);
```

## Тестирование

Созданы unit-тесты для всех репозиториев:

```bash
npm test
```

**Покрытие:**
- DatabaseService: инициализация, создание таблиц, индексов
- AirlineRepository: CRUD операции, валидация, поиск, идемпотентность инициализации
- TicketRepository: сохранение, поиск, обновление уведомлений, удаление

## Обработка ошибок

Все ошибки валидации имеют префикс для идентификации:

- `DB_VALIDATION_ERROR` - ошибка валидации поля
- `DB_DUPLICATE_CODE` - дубликат IATA/ICAO кода

Пример:
```typescript
try {
  await airlineRepository.create(airline);
} catch (error) {
  if (error.message.includes('DB_DUPLICATE_CODE')) {
    // Обработка дубликата
  } else if (error.message.includes('DB_VALIDATION_ERROR')) {
    // Обработка ошибки валидации
  }
}
```

## Миграции

Текущая версия схемы: **1**

При необходимости изменения схемы:
1. Увеличить версию в `app_meta.schema_version`
2. Создать миграционный скрипт
3. Применить миграцию при запуске приложения

## Резервное копирование

Репозитории поддерживают методы `replaceAll()` для атомарной замены всех данных при восстановлении из резервной копии.

Формат резервной копии будет реализован в задаче 10 (BackupManager).
