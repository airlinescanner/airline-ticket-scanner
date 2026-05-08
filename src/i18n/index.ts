import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import uk from './uk.json';
import ru from './ru.json';
import en from './en.json';

const LANGUAGE_KEY = 'user-language';

const resources = {
  uk: { translation: uk },
  ru: { translation: ru },
  en: { translation: en },
};

// Функция инициализации
export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  
  if (!savedLanguage) {
    const locales = Localization.getLocales();
    const locale = locales && locales.length > 0 ? locales[0].languageCode : 'uk';
    savedLanguage = (locale && resources.hasOwnProperty(locale)) ? locale : 'uk';
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'uk',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      }
    });
};

// Функция для сохранения выбранного языка
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Функция получения текущего языка
export const getCurrentLanguage = (): string => {
  return i18n.language || 'uk';
};

// Запускаем инициализацию
export const i18nReady = initI18n();

export default i18n;
