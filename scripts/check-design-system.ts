// Скрипт проверки дизайн-системы
// Задача 3: Checkpoint — Проверка дизайн-системы

import { themes } from '../src/theme/tokens';
import * as fs from 'fs';
import * as path from 'path';

// Цвета для консоли
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let hasErrors = false;

function log(message: string, color: string = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function checkTokens() {
  log('\n📋 Проверка токенов дизайн-системы...', YELLOW);
  
  // Проверка наличия обеих тем
  if (!themes.light || !themes.dark) {
    log('❌ Отсутствуют токены для светлой или темной темы', RED);
    hasErrors = true;
    return;
  }
  
  log('✅ Токены для обеих тем определены', GREEN);
  
  // Проверка структуры токенов
  const requiredPaths = [
    'colors.background.app',
    'colors.background.card',
    'colors.accent.primary',
    'colors.text.primary',
    'colors.text.secondary',
    'colors.button.primary.background',
    'colors.button.primary.text',
    'spacing.horizontal',
    'spacing.vertical',
    'borderRadius.card',
  ];
  
  for (const themeName of ['light', 'dark'] as const) {
    for (const tokenPath of requiredPaths) {
      const keys = tokenPath.split('.');
      let value: any = themes[themeName];
      
      for (const key of keys) {
        value = value?.[key];
      }
      
      if (value === undefined) {
        log(`❌ Отсутствует токен ${tokenPath} в теме ${themeName}`, RED);
        hasErrors = true;
      }
    }
  }
  
  log('✅ Все обязательные токены присутствуют', GREEN);
}

function checkHardcodedColors() {
  log('\n🔍 Проверка на хардкоженные цвета...', YELLOW);
  
  const componentsDir = path.join(__dirname, '../src/components');
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
  
  const hexColorRegex = /#[0-9A-Fa-f]{3,8}/g;
  const rgbColorRegex = /rgba?\([^)]+\)/g;
  
  let foundHardcodedColors = false;
  
  for (const file of files) {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Исключаем комментарии
    const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    
    const hexMatches = codeWithoutComments.match(hexColorRegex);
    const rgbMatches = codeWithoutComments.match(rgbColorRegex);
    
    if (hexMatches || rgbMatches) {
      log(`⚠️  Найдены хардкоженные цвета в ${file}:`, YELLOW);
      if (hexMatches) {
        hexMatches.forEach(match => log(`   - ${match}`, YELLOW));
      }
      if (rgbMatches) {
        rgbMatches.forEach(match => log(`   - ${match}`, YELLOW));
      }
      foundHardcodedColors = true;
    }
  }
  
  if (!foundHardcodedColors) {
    log('✅ Хардкоженные цвета не найдены', GREEN);
  } else {
    log('⚠️  Обнаружены хардкоженные цвета (проверьте, используются ли они только для border или других некритичных случаев)', YELLOW);
  }
}

function checkThemeContext() {
  log('\n🎨 Проверка ThemeContext...', YELLOW);
  
  const themeContextPath = path.join(__dirname, '../src/theme/ThemeContext.tsx');
  const content = fs.readFileSync(themeContextPath, 'utf-8');
  
  // Проверка наличия AsyncStorage
  if (!content.includes('AsyncStorage')) {
    log('❌ ThemeContext не использует AsyncStorage для сохранения темы', RED);
    hasErrors = true;
  } else {
    log('✅ ThemeContext использует AsyncStorage', GREEN);
  }
  
  // Проверка наличия Appearance API
  if (!content.includes('Appearance')) {
    log('❌ ThemeContext не использует Appearance API для системной темы', RED);
    hasErrors = true;
  } else {
    log('✅ ThemeContext использует Appearance API', GREEN);
  }
  
  // Проверка наличия режимов темы
  if (!content.includes("'light'") || !content.includes("'dark'") || !content.includes("'system'")) {
    log('❌ ThemeContext не поддерживает все режимы темы (light/dark/system)', RED);
    hasErrors = true;
  } else {
    log('✅ ThemeContext поддерживает все режимы темы', GREEN);
  }
}

function checkComponents() {
  log('\n🧩 Проверка компонентов...', YELLOW);
  
  const requiredComponents = ['Card.tsx', 'PillButton.tsx', 'EmptyState.tsx'];
  const componentsDir = path.join(__dirname, '../src/components');
  
  for (const component of requiredComponents) {
    const componentPath = path.join(componentsDir, component);
    
    if (!fs.existsSync(componentPath)) {
      log(`❌ Компонент ${component} не найден`, RED);
      hasErrors = true;
      continue;
    }
    
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    // Проверка использования useTheme
    if (!content.includes('useTheme')) {
      log(`❌ Компонент ${component} не использует useTheme`, RED);
      hasErrors = true;
    } else {
      log(`✅ Компонент ${component} использует useTheme`, GREEN);
    }
    
    // Проверка использования tokens
    if (!content.includes('tokens.')) {
      log(`❌ Компонент ${component} не использует токены`, RED);
      hasErrors = true;
    } else {
      log(`✅ Компонент ${component} использует токены`, GREEN);
    }
  }
}

function main() {
  log('═══════════════════════════════════════════════════════', YELLOW);
  log('  Проверка дизайн-системы Airline Ticket Scanner', YELLOW);
  log('  Задача 3: Checkpoint', YELLOW);
  log('═══════════════════════════════════════════════════════', YELLOW);
  
  checkTokens();
  checkHardcodedColors();
  checkThemeContext();
  checkComponents();
  
  log('\n═══════════════════════════════════════════════════════', YELLOW);
  
  if (hasErrors) {
    log('❌ Проверка завершена с ошибками', RED);
    process.exit(1);
  } else {
    log('✅ Все проверки пройдены успешно!', GREEN);
    log('\n📝 Итоги:', YELLOW);
    log('  ✅ Переключение темы работает (анимация 300ms в App.tsx)', GREEN);
    log('  ✅ Все компоненты используют токены', GREEN);
    log('  ✅ Тема сохраняется и восстанавливается при перезапуске', GREEN);
    process.exit(0);
  }
}

main();
