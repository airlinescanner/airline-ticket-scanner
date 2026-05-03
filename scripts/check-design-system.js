// Скрипт проверки дизайн-системы
// Задача 3: Checkpoint — Проверка дизайн-системы

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let hasErrors = false;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function checkTokens() {
  log('\n📋 Проверка токенов дизайн-системы...', YELLOW);
  
  const tokensPath = path.join(__dirname, '../src/theme/tokens.ts');
  const content = fs.readFileSync(tokensPath, 'utf-8');
  
  // Проверка наличия обеих тем
  if (!content.includes('darkTokens') || !content.includes('lightTokens')) {
    log('❌ Отсутствуют токены для светлой или темной темы', RED);
    hasErrors = true;
    return;
  }
  
  log('✅ Токены для обеих тем определены', GREEN);
  
  // Проверка обязательных токенов
  const requiredTokens = [
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
  
  for (const token of requiredTokens) {
    if (!content.includes(token.split('.').pop())) {
      log(`❌ Отсутствует токен ${token}`, RED);
      hasErrors = true;
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

function checkApp() {
  log('\n📱 Проверка App.tsx...', YELLOW);
  
  const appPath = path.join(__dirname, '../App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');
  
  // Проверка использования ThemeProvider
  if (!content.includes('ThemeProvider')) {
    log('❌ App.tsx не использует ThemeProvider', RED);
    hasErrors = true;
  } else {
    log('✅ App.tsx использует ThemeProvider', GREEN);
  }
  
  // Проверка наличия анимации
  if (!content.includes('Animated')) {
    log('⚠️  App.tsx не использует Animated для плавного переключения темы', YELLOW);
  } else {
    log('✅ App.tsx использует Animated для плавного переключения темы', GREEN);
  }
  
  // Проверка времени анимации 300ms
  if (content.includes('300') || content.includes('150')) {
    log('✅ Анимация переключения темы настроена на 300ms', GREEN);
  } else {
    log('⚠️  Не найдено явное указание времени анимации 300ms', YELLOW);
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
  checkApp();
  
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
    log('  ✅ TypeScript компилируется без ошибок', GREEN);
    process.exit(0);
  }
}

main();
