import { Airline } from './airline';
import { Ticket } from './ticket';

/**
 * Настройки приложения
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'uk' | 'ru';
  lastBackupAt: string | null; // ISO 8601
}

/**
 * Структура файла резервной копии
 */
export interface BackupData {
  schemaVersion: number;      // Текущая версия: 1
  exportedAt: string;         // ISO 8601
  airlines: Airline[];
  tickets: Ticket[];
  settings: AppSettings;
}
