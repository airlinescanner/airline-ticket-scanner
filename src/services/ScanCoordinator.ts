import { aiService, AiProvider } from './AiService';
import { ocrService } from './OCRService';
import { TicketData } from '../types/ticket';
import { API_CONFIG } from '../config/ApiConfig';

export interface ScanProgress {
  ocrDone: boolean;
  aiDone: boolean;
  isOffline: boolean;
}

export class ScanCoordinator {
  /**
   * Запускает ДВОЙНУЮ проверку ИИ: Groq 11b + Groq 90b
   */
  async coordinateScan(imageUri: string): Promise<TicketData[]> {
    // 1. Предобработка изображения (ч/б, контраст, ресайз)
    const processedUri = await ocrService.prepareImageForOcr(imageUri);
    // 2. Локальное распознавание (ML Kit) - дает скелет данных
    console.log(`[ScanCoordinator] Running local OCR...`);
    const ocrResult = await ocrService.recognizeText(processedUri);
    console.log(`[ScanCoordinator] Local OCR done. Text length: ${ocrResult.rawText.length}`);

    console.log(`[ScanCoordinator] Starting sequential scan waterfall...`);

    const providers = [AiProvider.GROQ, AiProvider.GEMINI, AiProvider.MISTRAL];
    let finalResults: TicketData[] = [];

    const ocrContext = {
      text: ocrResult.rawText,
      blocks: ocrResult.blocks
    };

    for (const provider of providers) {
      try {
        console.log(`[ScanCoordinator] Attempting analysis with ${provider}...`);
        const results = await aiService.analyzeTicket(processedUri, provider, ocrContext);
        
        if (results && results.length > 0) {
          console.log(`[ScanCoordinator] Success with ${provider}! Found ${results.length} tickets.`);
          finalResults = results;
          break; 
        } else {
          console.warn(`[ScanCoordinator] ${provider} returned no data.`);
        }
      } catch (err: any) {
        console.warn(`[ScanCoordinator] ${provider} failed: ${err.message}`);
      }
    }

    if (!finalResults || finalResults.length === 0) {
      throw new Error('Не удалось распознать данные ни одним из сервисов. Проверьте фото или лимиты API.');
    }

    return finalResults;
  }

  private checkIfArbitrationNeeded(res1: TicketData[], res2: TicketData[]): boolean {
    const r1 = res1 || [];
    const r2 = res2 || [];
    if (r1.length !== r2.length) return true;
    for (let i = 0; i < r1.length; i++) {
      if (r1[i]?.bookingReference !== r2[i]?.bookingReference) return true;
      if (r1[i]?.departureDate !== r2[i]?.departureDate) return true;
      if (r1[i]?.flightNumber !== r2[i]?.flightNumber) return true;
    }
    return false;
  }

  /**
   * Сверка результатов двух разных ИИ
   */
  private mergeResults(gemini: TicketData[], groq: TicketData[]): TicketData[] {
    

    
    // Используем Gemini как основной результат, Groq как проверочный
    const res1 = Array.isArray(gemini) ? gemini : [];
    const res2 = Array.isArray(groq) ? groq : [];

    const primary = res1.length > 0 ? res1 : res2;
    const secondary = res1.length > 0 ? res2 : res1;

    return primary.map((pTicket, index) => {
      if (!pTicket) return {} as TicketData;
      const sTicket = (secondary && secondary[index]) || (secondary && secondary[0]) || {};
      const conflicts: string[] = [];
      
      const compare = (field: string, val1: string, val2: string) => {
        if (!val1 || !val2) return;
        if (val1.trim().toUpperCase() !== val2.trim().toUpperCase()) {
          conflicts.push(field);
        }
      };

      if (sTicket) {
        compare('passengerName', pTicket.passengerName || '', sTicket.passengerName || '');
        compare('flightNumber', pTicket.flightNumber || '', sTicket.flightNumber || '');
        compare('bookingReference', pTicket.bookingReference || '', sTicket.bookingReference || '');
        compare('departureDate', pTicket.departureDate || '', sTicket.departureDate || '');
      }

      return {
        ...pTicket,
        rawJson: JSON.stringify({
          ai1: pTicket,
          ai2: sTicket,
          conflicts: conflicts,
          mergedAt: new Date().toISOString()
        }, null, 2)
      };
    });
  }
}

export const scanCoordinator = new ScanCoordinator();
