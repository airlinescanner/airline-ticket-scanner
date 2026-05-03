// Jest setup file
import '@testing-library/jest-native/extend-expect';

// Mock expo package to avoid winter runtime errors
jest.mock('expo', () => ({
  registerRootComponent: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Appearance API
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: jest.fn(() => 'light'),
  addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock i18next
jest.mock('i18next', () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockResolvedValue(undefined),
  changeLanguage: jest.fn().mockResolvedValue(undefined),
  language: 'uk',
  t: jest.fn((key) => key),
  getResourceBundle: jest.fn((lang, ns) => ({})),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: jest.fn((key) => key),
    i18n: {
      language: 'uk',
      changeLanguage: jest.fn().mockResolvedValue(undefined),
      getResourceBundle: jest.fn((lang, ns) => ({})),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: jest.fn(() => ({})),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn().mockResolvedValue(true),
  })),
  usePhotoOutput: jest.fn(() => ({
    capturePhotoToFile: jest.fn().mockResolvedValue({ filePath: 'test-path.jpg' }),
  })),
}));

// Mock @react-native-ml-kit/text-recognition
jest.mock('@react-native-ml-kit/text-recognition', () => ({
  recognize: jest.fn().mockResolvedValue({
    text: 'PASSENGER NAME/JOHN FLIGHT AB123 DATE 15JAN25 KBP LHR SEAT 14A CLASS Y',
    blocks: [{ text: 'TEST', confidence: 0.9 }],
  }),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest.fn((callback) => callback()),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));



