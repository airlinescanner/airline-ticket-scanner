// Экспорт всех сервисов
export { ocrService, OCRService, OCRResult, OCRError } from './OCRService';
export { ticketParser, TicketParser } from './TicketParser';
export { registrationMatcher, RegistrationMatcher, RegistrationResult } from './RegistrationMatcher';
export { notificationScheduler, NotificationScheduler } from './NotificationScheduler';
export { backupManager, BackupManager } from './BackupManager';

// Экспорт database сервисов
export {
  databaseService,
  airlineRepository,
  AirlineRepository,
  ticketRepository,
  TicketRepository,
  initializeDatabase,
} from './database';
