// Инициализация i18next для локализации приложения
// Требования: 9.1, 9.3, 9.6

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Импорт файлов переводов
import uk from './uk.json';
import ru from './ru.json';

// Ключ для сохранения выбранного языка в AsyncStorage
const LANGUAGE_KEY = '@airline_scanner:language';

/**
 * Инициализация i18next
 * 
 * Конфигурация:
 * - Украинский язык (uk) — основной (fallback)
 * - Русский язык (ru) — второй язык
 * - Сохранение выбранного языка в AsyncStorage
 * - Восстановление языка при запуске приложения
 */

// Функция для загрузки сохранённого языка
const loadSavedLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    return savedLanguage || 'uk'; // Украинский по умолчанию (Требование 9.5)
  } catch (error) {
    console.error('Ошибка загрузки языка из AsyncStorage:', error);
    return 'uk';
  }
};

// Функция для сохранения выбранного языка
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Ошибка сохранения языка в AsyncStorage:', error);
  }
};

// Инициализация i18next
const initI18n = async () => {
  const savedLanguage = await loadSavedLanguage();

  i18n
    .use(initReactI18next) // Интеграция с React
    .init({
      resources: {
        uk: { translation: uk },
        ru: { translation: ru },
      },
      lng: savedLanguage, // Язык по умолчанию из AsyncStorage
      fallbackLng: 'uk', // Украинский как fallback (Требование 9.1)
      interpolation: {
        escapeValue: false, // React уже защищает от XSS
      },
      compatibilityJSON: 'v4', // Совместимость с i18next v4
    });
};

// Запускаем инициализацию
initI18n();

export default i18n;
