// Тесты для проверки локализации
// Требования: 9.1, 9.3, 9.6

import i18n from './index';

describe('i18n Configuration', () => {
  it('должен использовать украинский язык по умолчанию', () => {
    expect(i18n.language).toBe('uk');
  });

  it('должен иметь украинский как fallback язык', () => {
    expect(i18n.options.fallbackLng).toEqual('uk');
  });

  it('должен содержать переводы для украинского языка', () => {
    expect(i18n.hasResourceBundle('uk', 'translation')).toBe(true);
  });

  it('должен содержать переводы для русского языка', () => {
    expect(i18n.hasResourceBundle('ru', 'translation')).toBe(true);
  });

  it('должен корректно переводить ключи на украинском', () => {
    i18n.changeLanguage('uk');
    expect(i18n.t('demo.title')).toBe('Дизайн-система');
    expect(i18n.t('demo.light')).toBe('Світла');
    expect(i18n.t('demo.dark')).toBe('Темна');
  });

  it('должен корректно переводить ключи на русском', () => {
    i18n.changeLanguage('ru');
    expect(i18n.t('demo.title')).toBe('Дизайн-система');
    expect(i18n.t('demo.light')).toBe('Светлая');
    expect(i18n.t('demo.dark')).toBe('Тёмная');
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
  const ukTranslations = i18n.getResourceBundle('uk', 'translation');
  const ruTranslations = i18n.getResourceBundle('ru', 'translation');

  it('должен иметь одинаковые ключи в обоих языках', () => {
    const ukKeys = Object.keys(ukTranslations || {});
    const ruKeys = Object.keys(ruTranslations || {});
    
    expect(ukKeys.sort()).toEqual(ruKeys.sort());
  });

  it('должен содержать все необходимые секции', () => {
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

    requiredSections.forEach((section) => {
      expect(ukTranslations).toHaveProperty(section);
      expect(ruTranslations).toHaveProperty(section);
    });
  });
});
