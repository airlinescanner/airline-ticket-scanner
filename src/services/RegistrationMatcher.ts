import i18next from 'i18next';
import { DateTime } from 'luxon';
import { Airline } from '../types/airline';
import { Ticket } from '../types/ticket';
import { airlineRepository } from './database/AirlineRepository';
import { timezoneService } from './TimezoneService';
import { airlineUpdateService } from './AirlineUpdateService';

/**
 * Результат сопоставления с реестром авиакомпаний
 */
export interface RegistrationResult {
  airline: Airline;
  registrationOpensAt: Date; // UTC Date
  formattedDate: string;     // DD.MM.YYYY HH:MM (Local)
  timezone: string;          // Название часового пояса (e.g. Europe/Warsaw)
}

/**
 * RegistrationMatcher - сервис для сопоставления билета с реестром авиакомпаний
 * и вычисления даты открытия регистрации с учетом часовых поясов
 */
export class RegistrationMatcher {
  /**
   * Сопоставить билет с реестром авиакомпаний и вычислить дату регистрации
   */
  async match(ticket: Partial<Ticket>): Promise<RegistrationResult | null> {
    if (!ticket.airlineCode || !ticket.departureDate || !ticket.departureTime) {
      return null;
    }

    // Extract date part if it's a full ISO string
    const departureDate = ticket.departureDate.includes('T') 
      ? ticket.departureDate.split('T')[0] 
      : ticket.departureDate;

    // Поиск авиакомпании по коду (приоритет оперирующей компании)
    const targetCode = ticket.operatingAirlineCode || ticket.airlineCode;
    let airline = await airlineRepository.findByCode(targetCode);
    
    if (!airline) {
      console.log(`[RegistrationMatcher] Airline ${targetCode} not found in DB. Triggering on-the-fly discovery...`);
      airline = await airlineUpdateService.fetchAndSaveAirline(
        targetCode, 
        ticket.operatingAirlineName || ticket.airlineName
      );
    }

    if (!airline) return null;

    // 1. Определяем часовой пояс аэропорта вылета
    const timezone = timezoneService.getTimezone(
      ticket.departureAirport || '', 
      ticket.departureCity || ''
    );

    // 2. Рассчитываем момент открытия в UTC
    const openingUTC = timezoneService.getCheckInOpeningUTC(
      departureDate,
      ticket.departureTime,
      timezone,
      airline.checkInHoursBefore
    );

    // 3. Форматируем местное время открытия для пользователя
    const localOpening = openingUTC.setZone(timezone);
    const formattedDate = localOpening.toFormat('dd.MM.yyyy HH.mm');

    return {
      airline,
      registrationOpensAt: openingUTC.toJSDate(),
      formattedDate,
      timezone,
    };
  }

  /**
   * Проверить, находится ли дата регистрации в прошлом
   */
  isRegistrationDatePassed(registrationDate: Date): boolean {
    return registrationDate.getTime() < Date.now();
  }

  /**
   * Получить информацию о времени до открытия регистрации
   */
  getTimeUntilRegistration(registrationDate: Date): string {
    const now = DateTime.now();
    const target = DateTime.fromJSDate(registrationDate);
    
    if (target < now) {
      return i18next.t('registration.alreadyOpened');
    }

    const diff = target.diff(now, ['days', 'hours', 'minutes']).toObject();
    const days = Math.floor(diff.days || 0);
    const hours = Math.floor(diff.hours || 0);
    const minutes = Math.floor(diff.minutes || 0);

    if (days > 0) {
      return i18next.t('registration.timeLeftDays', { 
        days, 
        hours,
        count: days 
      });
    } else if (hours > 0) {
      return i18next.t('registration.timeLeftHours', { 
        hours, 
        minutes,
        count: hours
      });
    } else {
      return i18next.t('registration.timeLeftMinutes', { 
        minutes,
        count: minutes
      });
    }
  }

  /**
   * Вычислить дату регистрации (helper для тестов)
   */
  public computeRegistrationDate(departureDate: Date | string, hoursBefore: number): Date {
    const tz = 'UTC';
    let depDateStr = '';
    let depTimeStr = '00:00';
    
    if (typeof departureDate === 'string') {
        const dt = new Date(departureDate);
        depDateStr = dt.toISOString().split('T')[0];
        depTimeStr = dt.toISOString().split('T')[1].substring(0, 5);
    } else {
        depDateStr = departureDate.toISOString().split('T')[0];
        depTimeStr = departureDate.toISOString().split('T')[1].substring(0, 5);
    }

    return timezoneService.getCheckInOpeningUTC(
      depDateStr,
      depTimeStr,
      tz,
      hoursBefore
    ).toJSDate();
  }

  /**
   * Отформатировать дату (helper для тестов)
   */
  public formatDate(date: Date): string {
    return DateTime.fromJSDate(date).toFormat('dd.MM.yyyy HH:mm');
  }
}

// Singleton экземпляр
export const registrationMatcher = new RegistrationMatcher();
