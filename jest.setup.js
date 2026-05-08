// Jest setup file
import '@testing-library/jest-native/extend-expect';

// Mock expo package to avoid winter runtime errors
jest.mock('expo', () => ({
  registerRootComponent: jest.fn(),
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  locale: 'uk-UA',
  getLocales: jest.fn(() => [{ languageCode: 'uk', regionCode: 'UA' }]),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(Text, {}, props.name),
    MaterialIcons: (props) => React.createElement(Text, {}, props.name),
  };
});

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn(() => true),
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

// Mock i18next with actual translations for testing
const ukTranslations = require('./src/i18n/uk.json');
const ruTranslations = require('./src/i18n/ru.json');
const enTranslations = require('./src/i18n/en.json');

const tMock = (key, options = {}) => {
  const lang = mockI18n.language || 'uk';
  const translations = lang === 'ru' ? ruTranslations : (lang === 'en' ? enTranslations : ukTranslations);
  
  const parts = key.split('.');
  let val = translations;
  for (const part of parts) {
    if (val && val[part]) val = val[part];
    else {
        val = key;
        break;
    }
  }
  
  if (typeof val === 'string' && options) {
      Object.keys(options).forEach(optKey => {
          val = val.replace(`{{${optKey}}}`, String(options[optKey]));
      });
  }
  return typeof val === 'string' ? val : key;
};

const mockI18n = {
  t: jest.fn().mockImplementation(tMock),
  language: 'uk',
  changeLanguage: jest.fn().mockImplementation(async (lang) => {
    mockI18n.language = lang;
    return undefined;
  }),
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockResolvedValue(undefined),
  getResourceBundle: jest.fn().mockImplementation((lang) => {
    if (lang === 'uk') return ukTranslations;
    if (lang === 'ru') return ruTranslations;
    if (lang === 'en') return enTranslations;
    return {};
  }),
  hasResourceBundle: jest.fn().mockImplementation((lang) => true),
  options: {
    fallbackLng: ['uk'],
  },
};

jest.mock('i18next', () => mockI18n);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockI18n.t,
    i18n: mockI18n,
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

// Mock expo-sqlite with a stateful in-memory mock for data tests
const DB_STATE = {
  airlines: [],
  tickets: [],
  trips: [],
  app_meta: []
};

const mockDb = {
  execAsync: jest.fn().mockImplementation(async (query) => {
    const q = query.toUpperCase();
    if (q.includes('DELETE FROM AIRLINES')) { DB_STATE.airlines.length = 0; }
    if (q.includes('DELETE FROM TICKETS')) { DB_STATE.tickets.length = 0; }
    if (q.includes('DELETE FROM TRIPS')) { DB_STATE.trips.length = 0; }
    if (q.includes('DELETE FROM APP_META')) { DB_STATE.app_meta.length = 0; }
    return undefined;
  }),
  runAsync: jest.fn().mockImplementation(async (query, params = []) => {
    const q = query.toUpperCase();
    
    if (q.includes('DELETE FROM TICKETS')) { DB_STATE.tickets.length = 0; return { changes: 1 }; }
    if (q.includes('DELETE FROM AIRLINES')) { DB_STATE.airlines.length = 0; return { changes: 1 }; }
    if (q.includes('DELETE FROM APP_META')) { DB_STATE.app_meta.length = 0; return { changes: 1 }; }

    if (q.includes('INSERT INTO AIRLINES')) {
      const iata = params[0]?.toUpperCase();
      const icao = params[1]?.toUpperCase();
      if (DB_STATE.airlines.some(a => a.iata_code === iata || a.icao_code === icao)) {
        throw new Error('DB_DUPLICATE_CODE');
      }
      const airline = {
        id: DB_STATE.airlines.length + 1,
        iata_code: iata,
        icao_code: icao,
        name: params[2],
        country: params[3],
        logo_url: params[4],
        registration_url: params[5],
        support_phone: params[6],
        check_in_hours_before: params[7],
        notes: params[8],
        updated_at: params[9]
      };
      DB_STATE.airlines.push(airline);
      return { lastInsertRowId: airline.id, changes: 1 };
    }
    
    if (q.includes('INSERT INTO TICKETS')) {
      const offset = params.length === 23 ? 1 : 0;
      const ticket = {
        id: offset === 1 ? params[0] : (DB_STATE.tickets.length + 1),
        passenger_name: params[0 + offset],
        airline_name: params[1 + offset],
        airline_code: params[2 + offset],
        flight_number: params[3 + offset],
        departure_date: params[4 + offset],
        departure_time: params[5 + offset],
        departure_city: params[6 + offset],
        departure_country: params[7 + offset],
        departure_airport: params[8 + offset],
        arrival_airport: params[9 + offset],
        arrival_city: params[10 + offset],
        arrival_country: params[11 + offset],
        seat: params[12 + offset],
        service_class: params[13 + offset],
        raw_json: params[14 + offset],
        scanned_at: params[15 + offset],
        notification_enabled: params[16 + offset] ? 1 : 0,
        notification_id: params[17 + offset],
        booking_reference: params[18 + offset],
        trip_id: params[19 + offset],
        operating_airline_name: params[20 + offset],
        operating_airline_code: params[21 + offset]
      };
      DB_STATE.tickets.push(ticket);
      return { lastInsertRowId: ticket.id, changes: 1 };
    }
    
    if (q.includes('UPDATE TICKETS')) {
        const id = params[params.length - 1];
        const ticket = DB_STATE.tickets.find(t => t.id === id);
        if (ticket) {
            // SET notification_enabled = ?, notification_id = ? WHERE id = ?
            if (q.includes('NOTIFICATION_ENABLED = ?')) ticket.notification_enabled = params[0] ? 1 : 0;
            if (q.includes('NOTIFICATION_ID = ?')) ticket.notification_id = params[1];
        }
        return { lastInsertRowId: id, changes: 1 };
    }

    if (q.includes('INSERT OR REPLACE INTO APP_META')) {
      const key = params[0];
      const value = params[1];
      const existing = DB_STATE.app_meta.find(m => m.key === key);
      if (existing) existing.value = value;
      else DB_STATE.app_meta.push({ key, value });
      return { lastInsertRowId: 0, changes: 1 };
    }
    return { lastInsertRowId: 1, changes: 1 };
  }),
  getFirstAsync: jest.fn().mockImplementation(async (query, params = []) => {
    const q = query.toUpperCase();
    if (q.includes('FROM APP_META') && q.includes('KEY = ?')) {
        return DB_STATE.app_meta.find(m => m.key === params[0]) || null;
    }
    if (q.includes('FROM AIRLINES')) {
        if (q.includes('IATA_CODE = ?')) {
            return DB_STATE.airlines.find(a => a.iata_code === params[0]) || null;
        }
        if (q.includes('ICAO_CODE = ?')) {
            return DB_STATE.airlines.find(a => a.icao_code === params[0]) || null;
        }
    }
    if (q.includes('FROM TICKETS') && q.includes('ID = ?')) {
        const t = DB_STATE.tickets.find(t => t.id === params[0]);
        if (!t) return null;
        return {
            ...t,
            passengerName: t.passenger_name,
            airlineName: t.airline_name,
            airlineCode: t.airline_code,
            flightNumber: t.flight_number,
            departureDate: t.departure_date,
            departureTime: t.departure_time,
            departureCity: t.departure_city,
            departureCountry: t.departure_country,
            departureAirport: t.departure_airport,
            arrivalAirport: t.arrival_airport,
            arrivalCity: t.arrival_city,
            arrivalCountry: t.arrival_country,
            notificationEnabled: t.notification_enabled === 1,
            notificationId: t.notification_id,
            bookingReference: t.booking_reference,
            tripId: t.trip_id,
            operatingAirlineName: t.operating_airline_name,
            operatingAirlineCode: t.operating_airline_code,
            scannedAt: t.scanned_at,
            rawJson: t.raw_json
        };
    }
    return null;
  }),
  getAllAsync: jest.fn().mockImplementation(async (query, params = []) => {
    const q = query.toUpperCase();
    
    if (q.includes('PRAGMA TABLE_INFO')) {
      if (q.includes('AIRLINES')) {
        return [
          { name: 'id' }, { name: 'iata_code' }, { name: 'icao_code' },
          { name: 'name' }, { name: 'country' }, { name: 'logo_url' },
          { name: 'registration_url' }, { name: 'support_phone' },
          { name: 'check_in_hours_before' }, { name: 'notes' }, { name: 'updated_at' }
        ];
      }
      if (q.includes('TICKETS')) {
        return [
          { name: 'id' }, { name: 'passenger_name' }, { name: 'airline_name' },
          { name: 'airline_code' }, { name: 'flight_number' }, { name: 'departure_date' },
          { name: 'departure_time' }, { name: 'departure_city' }, { name: 'departure_country' },
          { name: 'departure_airport' }, { name: 'arrival_airport' }, { name: 'arrival_city' },
          { name: 'arrival_country' }, { name: 'seat' }, { name: 'service_class' },
          { name: 'raw_json' }, { name: 'scanned_at' }, { name: 'notification_enabled' },
          { name: 'notification_id' }, { name: 'booking_reference' }, { name: 'trip_id' },
          { name: 'operating_airline_name' }, { name: 'operating_airline_code' }
        ];
      }
    }
    
    if (q.includes('SQLITE_MASTER')) {
      if (q.includes("TYPE='TABLE'")) {
        return [{ name: 'airlines' }, { name: 'tickets' }, { name: 'app_meta' }, { name: 'trips' }];
      }
      if (q.includes("TYPE='INDEX'")) {
        return [
            { name: 'idx_airlines_iata' }, { name: 'idx_airlines_icao' }, { name: 'idx_airlines_name' },
            { name: 'idx_tickets_scanned_at' }, { name: 'idx_tickets_airline_code' }
        ];
      }
    }
    
    if (q.includes('FROM AIRLINES')) {
        if (q.includes('IATA_CODE = ? OR ICAO_CODE = ?')) {
            const code = params[0];
            return DB_STATE.airlines.filter(a => a.iata_code === code || a.icao_code === code);
        }
        if (q.includes('LIKE ?')) {
            const s = params[0].replace(/%/g, '').toLowerCase();
            return DB_STATE.airlines.filter(a => 
                (a.name?.toLowerCase().includes(s)) || (a.iata_code?.toLowerCase().includes(s)) ||
                (a.icao_code?.toLowerCase().includes(s)) || (a.country?.toLowerCase().includes(s))
            );
        }
        return DB_STATE.airlines;
    }
    
    if (q.includes('FROM TICKETS')) {
        let filtered = [...DB_STATE.tickets];
        if (q.includes('WHERE AIRLINE_CODE = ?')) {
            filtered = filtered.filter(t => t.airline_code === params[0]);
        }
        
        let limit = filtered.length;
        if (q.includes('LIMIT ?')) {
            limit = params[params.length - 1];
        }
        
        return filtered.reverse().slice(0, limit).map(t => ({
            ...t,
            passengerName: t.passenger_name,
            airlineName: t.airline_name,
            airlineCode: t.airline_code,
            flightNumber: t.flight_number,
            departureDate: t.departure_date,
            departureTime: t.departure_time,
            departureCity: t.departure_city,
            departureCountry: t.departure_country,
            departureAirport: t.departure_airport,
            arrivalAirport: t.arrival_airport,
            arrivalCity: t.arrival_city,
            arrivalCountry: t.arrival_country,
            notificationEnabled: t.notification_enabled === 1,
            notificationId: t.notification_id,
            bookingReference: t.booking_reference,
            tripId: t.trip_id,
            operatingAirlineName: t.operating_airline_name,
            operatingAirlineCode: t.operating_airline_code,
            scannedAt: t.scanned_at,
            rawJson: t.raw_json
        }));
    }
    return [];
  }),
  withTransactionAsync: jest.fn((callback) => callback()),
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
}));

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  })),
  NativeModulesProxy: {},
  requireNativeModule: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notif-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
}));
