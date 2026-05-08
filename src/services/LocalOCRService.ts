import TextRecognition from '@react-native-ml-kit/text-recognition';
import { TicketData } from '../types/ticket';

/**
 * Локальный сервис распознавания текста (MLKit)
 * Используется как резервный вариант, если Gemini недоступен
 */
export class LocalOCRService {
  async recognize(imageUri: string): Promise<TicketData[]> {
    try {

      const result = await TextRecognition.recognize(imageUri);
      
      if (!result || !result.text) {
        throw new Error('Текст не найден на изображении');
      }

      const text = result.text;
      const lines = text.split('\n');
      
      // Инициализируем объект данных
      let flightNumber = '';
      let airlineCode = '';
      let bookingReference = '';
      let passengerName = '';
      let seat = '';
      let departureDate = new Date().toISOString().split('T')[0];

      // ТРИГГЕРЫ СЛОВ (как просил пользователь)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineUpper = line.toUpperCase();
        
        // 1. Поиск рейса (Flight / Номер рейса)
        if (lineUpper.includes('FLIGHT') || lineUpper.includes('FLT')) {
          const match = lineUpper.match(/([A-Z]{2}|[A-Z]\d)\s?(\d{2,4})/);
          if (match) {
            airlineCode = match[1];
            flightNumber = match[0];
          }
        }

        // 2. Поиск PNR (Booking Ref / Confirmation)
        if (lineUpper.includes('BOOKING') || lineUpper.includes('CONFIRMATION') || lineUpper.includes('PNR') || lineUpper.includes('REF:')) {
          const parts = line.split(/REF|REFERENCE|PNR/i);
          const potentialPnr = parts[parts.length - 1].trim();
          const pnrMatch = potentialPnr.match(/[A-Z0-9]{6}/i);
          if (pnrMatch) bookingReference = pnrMatch[0].toUpperCase(); // PNR всегда в верхнем регистре
        }

        // 3. Поиск места (Seat)
        if (lineUpper.includes('SEAT')) {
          const seatMatch = lineUpper.match(/\d{1,3}[A-Z]/);
          if (seatMatch) seat = seatMatch[0];
        }

        // 4. Поиск имени (Passenger / Name / Traveler / Mr / Mrs / Ms)
        if (lineUpper.includes('PASSENGER') || lineUpper.includes('NAME') || lineUpper.includes('TRAVELER') || 
            lineUpper.includes('MRS') || lineUpper.includes('MR') || lineUpper.includes('MS') || lineUpper.includes('MISS')) {
          // Разбиваем строку, сохраняя регистр оригинальной строки
          const parts = line.split(/PASSENGER|NAME|TRAVELER|MRS|MR|MS|MISS/i);
          if (parts[parts.length - 1] && parts[parts.length - 1].trim().length > 3) {
            passengerName = parts[parts.length - 1].trim();
          } else if (lines[i+1]) {
            passengerName = lines[i+1].trim();
          }
        }
      }

      // Если триггеры не сработали, пробуем общие регулярки по всему тексту
      if (!flightNumber) {
        const flightMatch = text.match(/([A-Z]{2}|[A-Z]\d)\s?\d{3,4}/);
        if (flightMatch) {
          flightNumber = flightMatch[0];
          airlineCode = flightMatch[1];
        }
      }

      if (!bookingReference) {
        const pnrMatch = text.match(/\b[A-Z0-9]{6}\b/);
        if (pnrMatch) bookingReference = pnrMatch[0];
      }

      return [{
        passengerName: passengerName || 'ПОТРЕБУЄ РУЧНОГО ВВОДУ',
        airlineName: 'Локальне розпізнавання',
        airlineCode: airlineCode,
        flightNumber: flightNumber,
        departureDate: departureDate,
        departureTime: '00:00',
        departureCity: '',
        departureCountry: null,
        departureAirport: '',
        arrivalAirport: '',
        arrivalCity: null,
        arrivalCountry: null,
        seat: seat,
        serviceClass: null,
        bookingReference: bookingReference,
        rawJson: text
      }];
    } catch (error) {
      console.error('[LocalOCRService] Error:', error);
      throw error;
    }
  }
}

export const localOCRService = new LocalOCRService();
