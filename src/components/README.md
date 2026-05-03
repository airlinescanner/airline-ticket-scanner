# UI-компоненты

Базовые UI-компоненты приложения Airline Ticket Scanner, использующие токены дизайн-системы.

## Компоненты

### Card

Карточка с применением токенов дизайн-системы (borderRadius, elevation для Android, shadow для iOS).

**Требования:** 12.2.6, 12.2.7

**Использование:**
```tsx
import { Card } from '../components';

<Card>
  <Text>Контент карточки</Text>
</Card>
```

**Props:**
- `children: React.ReactNode` — содержимое карточки
- `style?: ViewStyle` — дополнительные стили

**Особенности:**
- В светлой теме применяется тень (elevation: 2 на Android, shadowOpacity: 0.08 на iOS)
- В тёмной теме тень не применяется
- Автоматически использует токены `borderRadius.card` и `colors.background.card`

---

### PillButton

Кнопка в форме таблетки (pill shape) с вариантами primary/secondary.

**Требования:** 12.2.9

**Использование:**
```tsx
import { PillButton } from '../components';

// Primary вариант (по умолчанию)
<PillButton 
  title="Сохранить" 
  onPress={() => console.log('Нажато')} 
/>

// Secondary вариант
<PillButton 
  title="Отмена" 
  onPress={() => console.log('Отмена')} 
  variant="secondary"
/>

// Отключенная кнопка
<PillButton 
  title="Недоступно" 
  onPress={() => {}} 
  disabled={true}
/>
```

**Props:**
- `title: string` — текст кнопки
- `onPress: () => void` — обработчик нажатия
- `variant?: 'primary' | 'secondary'` — вариант стиля (по умолчанию 'primary')
- `disabled?: boolean` — отключить кнопку (по умолчанию false)
- `style?: ViewStyle` — дополнительные стили

**Варианты:**
- **primary:** фон `#2979FF`, белый текст
- **secondary:** фон из токена `button.secondary.background`, текст primary

---

### EmptyState

Компонент для отображения пустых состояний списков.

**Требования:** 12.2.8, 12.2.10

**Использование:**
```tsx
import { EmptyState } from '../components';

// Простое сообщение
<EmptyState message="История билетов пуста" />

// С иконкой
<EmptyState 
  message="Авиакомпании не найдены" 
  icon="✈️" 
/>
```

**Props:**
- `message: string` — текст сообщения
- `icon?: string` — опциональная иконка (emoji или символ)

**Особенности:**
- Автоматически центрируется по вертикали и горизонтали
- Использует токен `colors.text.secondary` для текста
- Применяет системный шрифт платформы

---

## Принципы использования

Все компоненты:
- ✅ Используют **только токены** из `theme/tokens.ts` (никаких хардкоженных цветов)
- ✅ Применяют хук `useTheme()` для доступа к текущей теме
- ✅ Реагируют на переключение темы автоматически
- ✅ Используют `StyleSheet.create()` для оптимизации производительности
- ✅ Покрыты unit-тестами

## Тестирование

Запуск тестов компонентов:
```bash
npx jest --testPathPatterns="src/components"
```

Все компоненты имеют 100% покрытие тестами.
