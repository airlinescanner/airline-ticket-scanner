// Тесты для проверки локализации
// Требования: 9.1, 9.3, 9.6

import i18n from 'i18next';
import ukTranslations from './uk.json';
import ruTranslations from './ru.json';
import enTranslations from './en.json';
import deTranslations from './de.json';
import frTranslations from './fr.json';

// Рекурсивное получение всех ключей объекта
const getAllKeys = (obj: any, prefix = ''): string[] => {
  let keys: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
};

describe('i18n Configuration', () => {
  it('должен использовать украинский язык по умолчанию', () => {
    expect(i18n.language).toBe('uk');
  });

  it('должен иметь украинский как fallback язык', () => {
    expect(i18n.options.fallbackLng).toContain('uk');
  });

  it('должен содержать переводы для украинского языка', () => {
    expect(i18n.hasResourceBundle('uk', 'translation')).toBe(true);
  });

  it('должен содержать переводы для русского языка', () => {
    expect(i18n.hasResourceBundle('ru', 'translation')).toBe(true);
  });

  it('должен содержать переводы для английского языка', () => {
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
  });

  it('должен содержать переводы для немецкого языка', () => {
    expect(i18n.hasResourceBundle('de', 'translation')).toBe(true);
  });

  it('должен содержать переводы для французского языка', () => {
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(true);
  });

  it('должен корректно переводить ключи на украинском', () => {
    i18n.changeLanguage('uk');
    expect(i18n.t('demo.title')).toBe('Дизайн-система');
    expect(i18n.t('demo.light')).toBe('Світла');
    expect(i18n.t('demo.dark')).toBe('Темна');
    expect(i18n.t('ticket.customTime')).toBe('Зручний час');
    expect(i18n.t('registration.yourTime', { time: '12:00' })).toBe('За вашим часом: 12:00');
  });

  it('должен корректно переводить ключи на русском', () => {
    i18n.changeLanguage('ru');
    expect(i18n.t('demo.title')).toBe('Дизайн-система');
    expect(i18n.t('demo.light')).toBe('Светлая');
    expect(i18n.t('demo.dark')).toBe('Тёмная');
    expect(i18n.t('ticket.customTime')).toBe('Удобное время');
    expect(i18n.t('registration.yourTime', { time: '12:00' })).toBe('По вашему времени: 12:00');
  });

  it('должен корректно переводить ключи на английском', () => {
    i18n.changeLanguage('en');
    expect(i18n.t('demo.title')).toBe('Design System');
    expect(i18n.t('demo.light')).toBe('Light');
    expect(i18n.t('ticket.customTime')).toBe('Reminder time');
    expect(i18n.t('registration.yourTime', { time: '12:00' })).toBe('Your time: 12:00');
  });

  it('должен корректно переводить ключи на немецком', () => {
    i18n.changeLanguage('de');
    expect(i18n.t('demo.title')).toBe('Design-System');
    expect(i18n.t('demo.light')).toBe('Hell');
    expect(i18n.t('ticket.customTime')).toBe('Erinnerungszeit');
    expect(i18n.t('registration.yourTime', { time: '12:00' })).toBe('Ihre Zeit: 12:00');
  });

  it('должен корректно переводить ключи на французском', () => {
    i18n.changeLanguage('fr');
    expect(i18n.t('demo.title')).toBe('Système de design');
    expect(i18n.t('demo.light')).toBe('Clair');
    expect(i18n.t('ticket.customTime')).toBe("Heure d'alerte");
    expect(i18n.t('registration.yourTime', { time: '12:00' })).toBe('Votre heure : 12:00');
  });

  it('должен поддерживать интерполяцию', () => {
    i18n.changeLanguage('uk');
    expect(i18n.t('demo.switchTheme', { theme: 'темну' })).toBe('Переключити на темну тему');
  });

  it('должен возвращать ключ, если перевод не найден', () => {
    const missingKey = 'nonexistent.key';
    expect(i18n.t(missingKey)).toBe(missingKey);
  });
});

describe('Translation Coverage', () => {
  it('должен иметь идентичную структуру ключей во всех 5 языках', () => {
    const ukKeys = getAllKeys(ukTranslations).sort();
    const ruKeys = getAllKeys(ruTranslations).sort();
    const enKeys = getAllKeys(enTranslations).sort();
    const deKeys = getAllKeys(deTranslations).sort();
    const frKeys = getAllKeys(frTranslations).sort();

    // Проверяем соответствие каждого словаря эталонному украинскому
    expect(ruKeys).toEqual(ukKeys);
    expect(enKeys).toEqual(ukKeys);
    expect(deKeys).toEqual(ukKeys);
    expect(frKeys).toEqual(ukKeys);
  });

  it('должен содержать все необходимые секции во всех языках', () => {
    const bundles = [
      ukTranslations,
      ruTranslations,
      enTranslations,
      deTranslations,
      frTranslations
    ];
    
    const requiredSections = [
      'demo',
      'common',
      'theme',
      'language',
      'scanner',
      'ticket',
      'airline',
      'registration',
      'notification',
      'settings',
    ];

    bundles.forEach((bundle) => {
      requiredSections.forEach((section) => {
        expect(bundle).toHaveProperty(section);
      });
    });
  });
});
