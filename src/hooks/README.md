# Кастомні хуки (Custom Hooks)

Ця директорія містить переиспользуемі React-хуки для додатку Airline Ticket Scanner.

## Доступні хуки

### `useLanguage`
**Файл:** `useLanguage.ts`

Управління мовою інтерфейсу додатку.

**API:**
```typescript
const { currentLanguage, changeLanguage } = useLanguage();
```

**Параметри:**
- `currentLanguage: 'uk' | 'ru'` - поточна мова інтерфейсу
- `changeLanguage: (language: 'uk' | 'ru') => Promise<void>` - функція зміни мови

**Приклад:**
```typescript
import { useLanguage } from './hooks/useLanguage';

function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguage();
  
  return (
    <Button 
      onPress={() => changeLanguage(currentLanguage === 'uk' ? 'ru' : 'uk')}
      title={currentLanguage === 'uk' ? 'Переключити на російську' : 'Переключить на украинский'}
    />
  );
}
```

**Особливості:**
- Негайне застосування зміни мови без перезапуску
- Автоматичне збереження в AsyncStorage
- Українська мова за замовчуванням

---

## Майбутні хуки (з tasks.md)

### `useCamera` (Задача 12.1)
Управління камерою та запит дозволів.

### `useOCR` (Задача 7.1)
Інтеграція з Google ML Kit для розпізнавання тексту.

### `useNotifications` (Задача 8.3)
Управління push-уведомленнями.

---

## Правила написання хуків

1. **Іменування:** Всі хуки починаються з префіксу `use`
2. **Один файл - один хук:** Кожен хук в окремому файлі
3. **TypeScript:** Всі хуки повинні бути типізовані
4. **Коментарі:** Обов'язкові JSDoc-коментарі з описом та прикладами
5. **Тести:** Кожен хук повинен мати unit-тести (якщо можливо)

