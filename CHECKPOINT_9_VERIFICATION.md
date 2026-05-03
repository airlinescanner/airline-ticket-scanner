# Checkpoint 9: Проверка бизнес-логики

## Статус: ✅ ГОТОВО К ПРОВЕРКЕ

Вся бизнес-логика реализована и готова к тестированию.

## Что было реализовано

### 1. OCRService ✅
- Интеграция с Google ML Kit Text Recognition (on-device)
- Распознавание текста с изображений
- Обработка ошибок: OCR_FAILED, PERMISSION_DENIED, LOW_QUALITY
- Проверка качества изображения

### 2. TicketParser ✅
- Извлечение всех полей билета из OCR-текста
- Поддержка форматов дат IATA: DDMMMYY и DD MMM YYYY
- Поддержка кодов IATA (2 символа) и ICAO (3 символа)
- Извлечение: имени пассажира, номера рейса, аэропортов, места, класса
- Pretty_Printer для форматирования JSON с отступами в 2 пробела
- Установка null для отсутствующих полей

### 3. RegistrationMatcher ✅
- Поиск авиакомпании по IATA или ICAO коду
- Вычисление даты открытия регистрации
- Форматирование даты в DD.MM.YYYY HH:MM
- Проверка, находится ли дата в прошлом
- Вычисление времени до открытия регистрации

### 4. NotificationScheduler ✅
- Планирование локальных push-уведомлений
- Запрос разрешения на уведомления
- Отмена уведомлений
- Проверка, что уведомления не планируются для дат в прошлом

## Критерии успешной проверки

### ✅ 1. OCR корректно распознаёт тестовое изображение билета

**Проверка**: OCRService должен извлекать текст из изображения билета.

**Тестовый сценарий**:
```typescript
import { ocrService } from './src/services/OCRService';

// Тестовое изображение билета
const imageUri = 'file:///path/to/test-ticket.jpg';

const result = await ocrService.recognizeText(imageUri);
console.log('Распознанный текст:', result.rawText);
console.log('Уровень уверенности:', result.confidence);
```

**Ожидаемый результат**:
- `result.rawText` содержит распознанный текст
- `result.confidence` > 0.3
- Текст содержит ключевые элементы билета (номер рейса, дата, аэропорты)

**Примечание**: Для полноценного тестирования OCR требуется React Native окружение и реальное изображение билета.

### ✅ 2. Парсер извлекает все поля

**Проверка**: TicketParser должен корректно извлекать все поля из OCR-текста.

**Тестовые случаи**:

#### Случай 1: Полный билет
```typescript
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

// Ожидаемые результаты:
result.passengerName === 'IVANOV/IVAN'
result.airlineCode === 'SU'
result.flightNumber === 'SU1234'
result.departureDate === '2025-01-15T00:00:00Z'
result.departureAirport === 'SVO'
result.arrivalAirport === 'LED'
result.seat === '14A'
result.serviceClass === 'Economy'
```

#### Случай 2: Формат DD MMM YYYY
```typescript
const sampleText = `
  PASSENGER: PETROV/PETR
  FLIGHT: LH5678
  DATE: 15 JAN 2025
  FROM FRA TO MUC
`;

const result = ticketParser.parse(sampleText);

// Ожидаемые результаты:
result.passengerName === 'PETROV/PETR'
result.airlineCode === 'LH'
result.flightNumber === 'LH5678'
result.departureDate === '2025-01-15T00:00:00Z'
```

#### Случай 3: Частичные данные
```typescript
const sampleText = `
  SU1234
  15JAN25
`;

const result = ticketParser.parse(sampleText);

// Ожидаемые результаты:
result.airlineCode === 'SU'
result.flightNumber === 'SU1234'
result.passengerName === null
result.seat === null
```

**Ожидаемый результат**: Все тесты проходят успешно.

### ✅ 3. RegistrationMatcher корректно вычисляет дату регистрации

**Проверка**: Дата регистрации вычисляется по формуле: `departureDate - checkInHoursBefore * 3600 * 1000`

**Тестовые случаи**:

#### Aeroflot (24 часа)
```typescript
const departureDate = new Date('2025-06-15T10:00:00Z');
const result = await registrationMatcher.match('SU', departureDate);

// Ожидаемые результаты:
result.airline.name === 'Aeroflot'
result.airline.checkInHoursBefore === 24
result.registrationOpensAt === new Date('2025-06-14T10:00:00Z')
```

#### Emirates (48 часов)
```typescript
const departureDate = new Date('2025-06-15T10:00:00Z');
const result = await registrationMatcher.match('EK', departureDate);

// Ожидаемые результаты:
result.airline.name === 'Emirates'
result.airline.checkInHoursBefore === 48
result.registrationOpensAt === new Date('2025-06-13T10:00:00Z')
```

#### Ryanair (2 часа)
```typescript
const departureDate = new Date('2025-06-15T10:00:00Z');
const result = await registrationMatcher.match('FR', departureDate);

// Ожидаемые результаты:
result.airline.name === 'Ryanair'
result.airline.checkInHoursBefore === 2
result.registrationOpensAt === new Date('2025-06-15T08:00:00Z')
```

**Ожидаемый результат**: Все вычисления корректны.

### ✅ 4. Уведомления планируются корректно

**Проверка**: NotificationScheduler должен планировать уведомления и не планировать для дат в прошлом.

**Тестовые случаи**:

#### Случай 1: Дата в будущем
```typescript
const ticket = {
  id: 1,
  flightNumber: 'SU1234',
  airlineCode: 'SU',
  departureAirport: 'SVO',
  arrivalAirport: 'LED',
  // ...
};

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Завтра
const notificationId = await notificationScheduler.schedule(ticket, futureDate);

// Ожидаемые результаты:
notificationId !== null
await notificationScheduler.isScheduled(notificationId) === true
```

#### Случай 2: Дата в прошлом
```typescript
const pastDate = new Date('2020-01-01T00:00:00Z');
const notificationId = await notificationScheduler.schedule(ticket, pastDate);

// Ожидаемые результаты:
notificationId === null // Уведомление не планируется
```

#### Случай 3: Отмена уведомления
```typescript
const notificationId = await notificationScheduler.schedule(ticket, futureDate);
await notificationScheduler.cancel(notificationId);

// Ожидаемые результаты:
await notificationScheduler.isScheduled(notificationId) === false
```

**Ожидаемый результат**: Все сценарии работают корректно.

## Полный флоу обработки билета

### Сценарий: Пользователь сканирует билет

1. **Сканирование**:
   ```typescript
   const imageUri = await camera.takePicture();
   ```

2. **OCR-распознавание**:
   ```typescript
   const ocrResult = await ocrService.recognizeText(imageUri);
   ```

3. **Парсинг**:
   ```typescript
   const ticketData = ticketParser.parse(ocrResult.rawText);
   ```

4. **Сопоставление с реестром**:
   ```typescript
   const matchResult = await registrationMatcher.match(
     ticketData.airlineCode,
     ticketData.departureDate
   );
   ```

5. **Сохранение билета**:
   ```typescript
   const savedTicket = await ticketRepository.save({
     ...ticketData,
     notificationEnabled: true,
   });
   ```

6. **Планирование уведомления**:
   ```typescript
   const notificationId = await notificationScheduler.schedule(
     savedTicket,
     matchResult.registrationOpensAt
   );
   
   await ticketRepository.updateNotification(
     savedTicket.id,
     true,
     notificationId
   );
   ```

**Ожидаемый результат**: Билет сохранён, уведомление запланировано.

## Граничные случаи

### 1. Пустой OCR-текст
```typescript
const result = ticketParser.parse('');
// Все поля должны быть null
```

### 2. Авиакомпания не найдена
```typescript
const result = await registrationMatcher.match('XX', departureDate);
// result === null
```

### 3. Дата вылета в прошлом
```typescript
const pastDate = new Date('2020-01-01T00:00:00Z');
const result = await registrationMatcher.match('SU', pastDate);
// result.registrationOpensAt в прошлом
// registrationMatcher.isRegistrationDatePassed(result.registrationOpensAt) === true
```

### 4. Частично распознанные данные
```typescript
const partialText = 'SU1234 15JAN25';
const result = ticketParser.parse(partialText);
// Некоторые поля null, но основные данные извлечены
```

## Производительность

### Ожидаемые показатели:

- **Парсинг текста**: < 50ms
- **Поиск авиакомпании**: < 100ms
- **Вычисление даты**: < 1ms
- **Планирование уведомления**: < 200ms

## Интеграционные тесты

Созданы следующие интеграционные тесты:

1. **business-logic.integration.test.ts**:
   - Парсинг различных форматов билетов
   - Вычисление даты регистрации для разных авиакомпаний
   - Полный флоу: Парсинг → Сопоставление → Сохранение
   - Обработка граничных случаев
   - Проверка производительности

**Запуск тестов**:
```bash
npm test src/services/business-logic.integration.test.ts
```

## Следующие шаги

После успешной проверки checkpoint 9, можно переходить к:

**Задача 10: Резервное копирование и восстановление**
- BackupManager для экспорта/импорта данных
- Валидация структуры файла бэкапа
- Атомарная замена данных

## Известные ограничения

1. **OCR**: Требует React Native окружение для работы с Google ML Kit
2. **Уведомления**: Требуют разрешения пользователя
3. **Парсинг**: Зависит от качества OCR-распознавания
4. **Форматы**: Поддерживаются только форматы дат IATA

## Документация

- `DATABASE_README.md` - документация по базе данных
- `CHECKPOINT_6_VERIFICATION.md` - проверка базы данных
- Текущий файл - проверка бизнес-логики
