import { aiService, AiProvider } from './AiService';
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
    


    const groqModels = API_CONFIG.GROQ_MODELS || [];
    const model1 = groqModels[0] || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const model2 = groqModels[1] || 'meta-llama/llama-4-scout-17b-16e-instruct';

    // Используем исходное изображение напрямую (без сжатия, чтобы избежать ошибок нативных модулей)
    let processedUri = imageUri;

    // 2. Сначала запускаем основную модель, вторую используем как fallback/арбитра.
    // Это снижает риск ошибок из-за лимитов и таймаутов на мобильной сети.
    console.log(`[ScanCoordinator] Starting scan: primary=${model1}, secondary=${model2}`);

    let result1: TicketData[] = [];
    let result2: TicketData[] = [];
    let lastError: any = null;

    try {
      try {
        result1 = await aiService.analyzeTicket(processedUri, AiProvider.GROQ, model1);
      } catch (e) {
        console.warn(`[ScanCoordinator] ${model1} failed:`, e);
        lastError = e;
      }

      // Fallback на вторую модель только при необходимости.
      if (result1.length === 0 || model2 !== model1) {
        try {
          result2 = await aiService.analyzeTicket(processedUri, AiProvider.GROQ, model2);
        } catch (e) {
          console.warn(`[ScanCoordinator] ${model2} failed:`, e);
          lastError = e;
        }
      }
    } catch (e) {
      console.error('[ScanCoordinator] Critical failure during scan:', e);
      throw e;
    }

    if (result1.length === 0 && result2.length === 0) {
      // Если обе модели вернули пусто или упали, пробрасываем последнюю ошибку или общее сообщение
      throw lastError || new Error('Не удалось распознать билет. Проверьте качество фото или подключение.');
    }

    // 3. АРБИТРАЖ (Referee): Если результаты разные, просим перепроверить
    const hasConflicts = this.checkIfArbitrationNeeded(result1, result2);
    if (hasConflicts && result1.length > 0 && result2.length > 0) {
      

      try {
        const finalResult = await aiService.arbitrateMismatches(processedUri, result1, result2);
        // Если арбитраж прошел успешно, подменяем ОБА результата финальным вердиктом.
        // Это уберет красные сообщения Mismatch Detected в интерфейсе.
        result1 = finalResult; 
        result2 = finalResult;
      } catch (e) {
        console.warn('[ScanCoordinator] Arbitration failed:', e);
      }
    }

    if (result1.length === 0 && result2.length === 0) {
      throw new Error('Не удалось распознать билет. Проверьте подключение.');
    }

    return this.mergeResults(result1, result2);
  }

  private checkIfArbitrationNeeded(res1: TicketData[], res2: TicketData[]): boolean {
    if (res1.length !== res2.length) return true;
    for (let i = 0; i < res1.length; i++) {
      if (res1[i].bookingReference !== res2[i].bookingReference) return true;
      if (res1[i].departureDate !== res2[i].departureDate) return true;
      if (res1[i].flightNumber !== res2[i].flightNumber) return true;
    }
    return false;
  }

  /**
   * Сверка результатов двух разных ИИ
   */
  private mergeResults(gemini: TicketData[], groq: TicketData[]): TicketData[] {
    

    
    // Используем Gemini как основной результат, Groq как проверочный
    const primary = gemini.length > 0 ? gemini : groq;
    const secondary = gemini.length > 0 ? groq : gemini;

    return primary.map((pTicket, index) => {
      const sTicket = secondary[index] || secondary[0];
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
