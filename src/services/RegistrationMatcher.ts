import i18next from 'i18next';
import { DateTime } from 'luxon';
import { Airline } from '../types/airline';
import { Ticket } from '../types/ticket';
import { airlineRepository } from './database/AirlineRepository';
import { timezoneService } from './TimezoneService';

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

    // Поиск авиакомпании по коду
    const airline = await airlineRepository.findByCode(ticket.airlineCode);
    if (!airline) return null;

    // 1. Определяем часовой пояс аэропорта вылета
    const timezone = timezoneService.getTimezone(
      ticket.departureAirport || '', 
      ticket.departureCity || ''
    );

    // 2. Рассчитываем момент открытия в UTC
    const openingUTC = timezoneService.getCheckInOpeningUTC(
      ticket.departureDate,
      ticket.departureTime,
      timezone,
      airline.checkInHoursBefore
    );

    // 3. Форматируем местное время открытия для пользователя
    const localOpening = openingUTC.setZone(timezone);
    const formattedDate = localOpening.toFormat('dd.MM.yyyy HH:mm');

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
}

// Singleton экземпляр
export const registrationMatcher = new RegistrationMatcher();
