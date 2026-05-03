# Зависимости проекта

## Основные зависимости

### Платформа и UI
- `expo` — платформа для React Native разработки
- `react` — библиотека для построения UI
- `react-native` — фреймворк для мобильной разработки

### Навигация
- `@react-navigation/native` — основная библиотека навигации
- `@react-navigation/bottom-tabs` — нижняя навигационная панель
- `@react-navigation/native-stack` — стековая навигация
- `react-native-screens` — оптимизация экранов
- `react-native-safe-area-context` — безопасные зоны (челки, вырезы)

### База данных и хранилище
- `expo-sqlite` — локальная SQLite база данных
- `@react-native-async-storage/async-storage` — хранилище настроек

### OCR и камера
- `@react-native-ml-kit/text-recognition` — Google ML Kit для распознавания текста (on-device)
- `react-native-vision-camera` — работа с камерой устройства

### Уведомления
- `expo-notifications` — локальные push-уведомления

### Локализация
- `i18next` — библиотека интернационализации
- `react-i18next` — React-интеграция для i18next

### Резервное копирование
- `expo-sharing` — Share API для экспорта файлов
- `expo-document-picker` — выбор файлов для импорта

### Тестирование
- `fast-check` — property-based testing библиотека
- `jest` — фреймворк для unit-тестов (включен в Expo)
- `@testing-library/react-native` — тестирование React Native компонентов

## Структура зависимостей по модулям

### Scanner (Сканирование)
- `react-native-vision-camera` — захват изображения
- `@react-native-ml-kit/text-recognition` — OCR

### Database (База данных)
- `expo-sqlite` — SQLite для хранения авиакомпаний и билетов

### Theme (Темизация)
- `@react-native-async-storage/async-storage` — сохранение выбранной темы

### Localization (Локализация)
- `i18next` + `react-i18next` — поддержка украинского и русского языков

### Notifications (Уведомления)
- `expo-notifications` — планирование уведомлений о регистрации

### Backup (Резервное копирование)
- `expo-sharing` — экспорт JSON-файла
- `expo-document-picker` — импорт JSON-файла

## Версии (установленные)

Все зависимости установлены в последних совместимых версиях через npm.
Для просмотра точных версий см. `package.json`.
