// Кастомний хук для управління мовою інтерфейсу
// Задача 4.2: Реалізувати LocalizationManager
// Вимоги: 9.2, 9.4, 9.5

import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../i18n';

/**
 * Хук для управління мовою інтерфейсу
 * 
 * Функціонал:
 * - Отримання поточної мови
 * - Перемикання мови з негайним застосуванням
 * - Збереження вибраної мови в AsyncStorage
 * 
 * @returns {Object} Об'єкт з поточною мовою та функцією перемикання
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();

  /**
   * Перемикає мову інтерфейсу
   * 
   * @param language - Код мови ('uk' або 'ru')
   * 
   * Вимога 9.2: Негайне застосування вибраної мови без перезапуску
   * Вимога 9.4: Збереження вибраної мови в AsyncStorage
   */
  const changeLanguage = async (language: 'uk' | 'ru') => {
    try {
      // Змінюємо мову в i18next (негайне застосування)
      await i18n.changeLanguage(language);
      
      // Зберігаємо вибір в AsyncStorage для відновлення при наступному запуску
      await saveLanguage(language);
    } catch (error) {
      console.error('Помилка зміни мови:', error);
    }
  };

  /**
   * Поточна мова інтерфейсу
   * 
   * Вимога 9.5: Українська мова за замовчуванням
   */
  const currentLanguage = i18n.language as 'uk' | 'ru';

  return {
    currentLanguage,
    changeLanguage,
  };
};

