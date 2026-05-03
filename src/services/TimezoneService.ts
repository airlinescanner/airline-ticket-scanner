import { DateTime } from 'luxon';

/**
 * TimezoneService - сервис для определения часовых поясов по кодам аэропортов или городам
 */
export class TimezoneService {
  // Маппинг популярных кодов IATA в IANA Timezone IDs
  private airportTimezones: Record<string, string> = {
    // Украина
    'KBP': 'Europe/Kyiv',
    'IEV': 'Europe/Kyiv',
    'ODS': 'Europe/Kyiv',
    'LWO': 'Europe/Kyiv',
    
    // Польша
    'WAW': 'Europe/Warsaw',
    'WMI': 'Europe/Warsaw',
    'KRK': 'Europe/Warsaw',
    'GDN': 'Europe/Warsaw',
    
    // Германия
    'FRA': 'Europe/Berlin',
    'MUC': 'Europe/Berlin',
    'BER': 'Europe/Berlin',
    'HAM': 'Europe/Berlin',
    
    // Франция
    'CDG': 'Europe/Paris',
    'ORY': 'Europe/Paris',
    'LYS': 'Europe/Paris',
    'NCE': 'Europe/Paris',
    
    // Великобритания
    'LHR': 'Europe/London',
    'LGW': 'Europe/London',
    'STN': 'Europe/London',
    'MAN': 'Europe/London',
    
    // Италия
    'FCO': 'Europe/Rome',
    'MXP': 'Europe/Rome',
    
    // Испания
    'MAD': 'Europe/Madrid',
    'BCN': 'Europe/Madrid',
    
    // Чехия
    'PRG': 'Europe/Prague',
    
    // Швейцария
    'ZRH': 'Europe/Zurich',
    
    // Австрия
    'VIE': 'Europe/Vienna',
    
    // Бельгия
    'BRU': 'Europe/Brussels',
    
    // Нидерланды
    'AMS': 'Europe/Amsterdam',
    
    // ОАЭ
    'DXB': 'Asia/Dubai',
    'DWC': 'Asia/Dubai',
    'AUH': 'Asia/Dubai',
    
    // Турция
    'IST': 'Europe/Istanbul',
    'SAW': 'Europe/Istanbul',
    'AYT': 'Europe/Istanbul',
    
    // Казахстан
    'ALA': 'Asia/Almaty',
    'NQZ': 'Asia/Almaty',
    
    // Узбекистан
    'TAS': 'Asia/Tashkent',
    
    // Азербайджан
    'GYD': 'Asia/Baku',
    
    // Грузия
    'TBS': 'Asia/Tbilisi',
    'BUS': 'Asia/Tbilisi',
  };

  /**
   * Получить ID часового пояса по коду аэропорта или названию города
   */
  getTimezone(airportCode: string, city: string = ''): string {
    const code = airportCode.toUpperCase();
    
    // 1. По коду аэропорта (самый точный способ)
    if (this.airportTimezones[code]) {
      return this.airportTimezones[code];
    }

    // 2. По названию города (эвристика)
    const normalizedCity = city.toLowerCase();
    if (normalizedCity.includes('warsaw') || normalizedCity.includes('варшава')) return 'Europe/Warsaw';
    if (normalizedCity.includes('kyiv') || normalizedCity.includes('киев')) return 'Europe/Kyiv';
    if (normalizedCity.includes('berlin') || normalizedCity.includes('берлин')) return 'Europe/Berlin';
    if (normalizedCity.includes('paris') || normalizedCity.includes('париж')) return 'Europe/Paris';
    if (normalizedCity.includes('london') || normalizedCity.includes('лондон')) return 'Europe/London';
    if (normalizedCity.includes('dubai') || normalizedCity.includes('дубай')) return 'Asia/Dubai';
    if (normalizedCity.includes('istanbul') || normalizedCity.includes('стамбул')) return 'Europe/Istanbul';

    // 3. Фолбэк на Киев, если ничего не нашли (или можно на UTC)
    // Но лучше вернуть пояс пользователя
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Рассчитать момент открытия регистрации в UTC
   * 
   * @param departureDate Дата вылета (YYYY-MM-DD)
   * @param departureTime Время вылета (HH:mm)
   * @param timezone Часовой пояс аэропорта вылета
   * @param hoursBefore За сколько часов открывается регистрация
   */
  getCheckInOpeningUTC(
    departureDate: string,
    departureTime: string,
    timezone: string,
    hoursBefore: number
  ): DateTime {
    // 1. Создаем объект даты-времени в местном поясе аэропорта
    const localDeparture = DateTime.fromFormat(`${departureDate} ${departureTime}`, 'yyyy-MM-dd HH:mm', {
      zone: timezone,
    });

    // 2. Отнимаем часы до открытия регистрации
    const localOpening = localDeparture.minus({ hours: hoursBefore });

    // 3. Возвращаем в UTC (Luxon автоматически обрабатывает DST/переходы)
    return localOpening.toUTC();
  }
}

export const timezoneService = new TimezoneService();
