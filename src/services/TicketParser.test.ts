import { ticketParser } from './TicketParser';
import { scanCoordinator } from './ScanCoordinator';
import { aiService, AiProvider } from './AiService';

// Мокаем aiService, чтобы имитировать отказ всех сетевых ИИ-провайдеров
jest.mock('./AiService', () => {
  const originalModule = jest.requireActual('./AiService');
  return {
    ...originalModule,
    aiService: {
      analyzeTicket: jest.fn().mockImplementation(() => {
        throw new Error('Network request failed - Offline mode active');
      }),
    },
  };
});

describe('TicketParser (Offline Fallback & Performance)', () => {
  const sampleOcrTextAmadeus = `
ELECTRONIC TICKET ITINERARY
PASSENGER: MR JOHN SMITH
BOOKING REF: K8Y9P2
DATE: WEDNESDAY 07 JANUARY 2026
FLIGHT: LUFTHANSA LH 1234
CLASS: ECONOMY
FROM: FRANKFURT DE FRA
TO: MUNICH DE MUC
SEAT: 12B
STATUS: CONFIRMED
  `;

  const sampleOcrTextRyanair = `
RYANAIR BOARDING PASS
PASSENGER: MRS JANE DOE
FLIGHT: FR 5678
DATE: 12 FEB 2026
FROM: WAW
TO: LYS
SEAT: 24C
CLASS: ECONOMY
  `;

  it('должен корректно извлекать данные из макета Amadeus в офлайн-режиме', () => {
    const start = performance.now();
    const results = ticketParser.parse(sampleOcrTextAmadeus);
    const duration = performance.now() - start;

    console.log(`[Performance] Amadeus parser finished in ${duration.toFixed(2)} ms`);

    expect(results).toHaveLength(1);
    const ticket = results[0];
    
    expect(ticket.passengerName).toBe('JOHN SMITH');
    expect(ticket.airlineCode).toBe('LH');
    expect(ticket.flightNumber).toBe('LH1234');
    expect(ticket.departureAirport).toBe('FRA');
    expect(ticket.arrivalAirport).toBe('MUC');
    expect(ticket.seat).toBe('12B');
    expect(ticket.serviceClass).toBe('Economy');
    expect(duration).toBeLessThan(200); // Должно быть строго < 200 мс
  });

  it('должен корректно извлекать данные из макета Ryanair в офлайн-режиме', () => {
    const start = performance.now();
    const results = ticketParser.parse(sampleOcrTextRyanair);
    const duration = performance.now() - start;

    console.log(`[Performance] Ryanair parser finished in ${duration.toFixed(2)} ms`);

    expect(results).toHaveLength(1);
    const ticket = results[0];

    expect(ticket.passengerName).toBe('JANE DOE');
    expect(ticket.airlineCode).toBe('FR');
    expect(ticket.flightNumber).toBe('FR5678');
    expect(ticket.departureAirport).toBe('WAW');
    expect(ticket.arrivalAirport).toBe('LYS');
    expect(ticket.seat).toBe('24C');
    expect(ticket.serviceClass).toBe('Economy');
    expect(duration).toBeLessThan(200); // Должно быть строго < 200 мс
  });

  it('должен автоматически переключаться на офлайн-парсер при сетевом сбое ИИ-провайдеров и завершать разбор быстрее 200 мс', async () => {
    // Мокаем ocrService, чтобы возвращать текст
    const { ocrService } = require('./OCRService');
    const spyPrepare = jest.spyOn(ocrService, 'prepareImageForOcr').mockResolvedValue('file://mock-processed-image.jpg');
    const spyRecognize = jest.spyOn(ocrService, 'recognizeText').mockResolvedValue({
      rawText: sampleOcrTextRyanair,
      blocks: [],
    });

    const start = performance.now();
    const results = await scanCoordinator.coordinateScan('file://mock-original-image.jpg');
    const duration = performance.now() - start;

    console.log(`[Performance] Total E2E Scan Coordinator Fallback finished in ${duration.toFixed(2)} ms`);

    expect(results).toHaveLength(1);
    const ticket = results[0];
    expect(ticket.passengerName).toBe('JANE DOE');
    expect(ticket.airlineCode).toBe('FR');
    expect(ticket.flightNumber).toBe('FR5678');
    
    // Проверяем, что в сыром JSON есть флаг офлайн-парсера
    const rawData = JSON.parse(ticket.rawJson);
    expect(rawData.parserType).toBe('offline-regex-fallback');

    expect(duration).toBeLessThan(200); // Весь каскад должен уложиться в 200 мс при сбое

    spyPrepare.mockRestore();
    spyRecognize.mockRestore();
  });
});
