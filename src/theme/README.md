# Theme System

Система управления темой оформления приложения с поддержкой светлой, темной и системной темы.

## Компоненты

### ThemeProvider

Провайдер контекста темы. Оборачивает корневой компонент приложения.

```tsx
import { ThemeProvider } from './theme/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### useTheme

Хук для доступа к текущей теме и управления ею.

```tsx
import { useTheme } from './theme/ThemeContext';

function MyComponent() {
  const { tokens, mode, setMode, resolvedTheme } = useTheme();

  return (
    <View style={{ backgroundColor: tokens.colors.background.app }}>
      <Text style={{ color: tokens.colors.text.primary }}>
        Текущая тема: {resolvedTheme}
      </Text>
      <Button 
        title="Переключить на темную" 
        onPress={() => setMode('dark')}
      />
    </View>
  );
}
```

## Режимы темы

- **`light`** — светлая тема
- **`dark`** — темная тема
- **`system`** — автоматическое следование системной теме устройства

## Токены

Все цвета, отступы и другие параметры дизайна определены в `tokens.ts`:

```tsx
const { tokens } = useTheme();

// Цвета
tokens.colors.background.app
tokens.colors.background.card
tokens.colors.accent.primary
tokens.colors.text.primary
tokens.colors.text.secondary
tokens.colors.button.primary.background
tokens.colors.icon.active

// Отступы
tokens.spacing.horizontal  // 16
tokens.spacing.vertical    // 12

// Радиусы
tokens.borderRadius.card   // 12

// Шрифты
tokens.typography.fontFamily.ios      // 'SF Pro'
tokens.typography.fontFamily.android  // 'Roboto'
```

## Требования

Реализация покрывает следующие требования из спецификации:

- **8.1** — Поддержка светлой и темной темы
- **8.2** — Немедленное применение темы без перезапуска
- **8.3** — Сохранение и восстановление выбранной темы
- **8.4** — Опция "Системная" для автоматического следования теме ОС
- **8.5** — Автоматическое переключение при изменении системной темы
- **8.6** — Светлая тема по умолчанию
- **12.1.1-12.1.5** — Единый файл токенов с цветовыми значениями

## Особенности реализации

1. **Подписка на системную тему**: Использует `Appearance.addChangeListener` из React Native для отслеживания изменений системной темы в реальном времени.

2. **Персистентность**: Выбранная тема сохраняется в `AsyncStorage` и автоматически восстанавливается при запуске приложения.

3. **Типобезопасность**: Полная поддержка TypeScript с типизированными токенами и режимами темы.

4. **Плавные переходы**: Изменение темы применяется немедленно ко всем компонентам через React Context.
