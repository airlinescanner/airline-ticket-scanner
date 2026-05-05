import TextRecognition from '@react-native-ml-kit/text-recognition';
import { TicketData } from '../types/ticket';

/**
 * Локальный сервис распознавания текста (MLKit)
 * Используется как резервный вариант, если Gemini недоступен
 */
export class LocalOCRService {
  async recognize(imageUri: string): Promise<TicketData[]> {
    try {
      console.log('[LocalOCRService] Starting local recognition...');
      const result = await TextRecognition.recognize(imageUri);
      
      if (!result || !result.text) {
        throw new Error('Текст не найден на изображении');
      }

      // Базовый парсинг текста (очень упрощенный)
      // В идеале тут должна быть логика поиска ключевых слов (Flight, Date, и т.д.)
      // Но для начала мы просто вернем один объект с "сырым" текстом, 
      // чтобы пользователь мог отредактировать его вручную
      
      const text = result.text;
      
      // Попробуем вытащить хоть что-то регулярками
      const flightMatch = text.match(/([A-Z]{2}|[A-Z]\d)\s?\d{3,4}/);
      const pnrMatch = text.match(/[A-Z0-9]{6}/);
      
      return [{
        passengerName: 'ПОТРЕБУЄ РУЧНОГО ВВОДУ',
        airlineName: 'Локальне розпізнавання',
        airlineCode: flightMatch ? flightMatch[1] : '',
        flightNumber: flightMatch ? flightMatch[0] : '',
        departureDate: new Date().toISOString().split('T')[0], // Сегодня как заглушка
        departureTime: '00:00',
        departureCity: '',
        departureAirport: '',
        arrivalAirport: '',
        bookingReference: pnrMatch ? pnrMatch[0] : '',
        rawJson: text // Сохраняем весь текст в rawJson для справки
      }];
    } catch (error) {
      console.error('[LocalOCRService] Error:', error);
      throw error;
    }
  }
}

export const localOCRService = new LocalOCRService();
