import AsyncStorage from '@react-native-async-storage/async-storage';
import { airlineRepository } from './database/AirlineRepository';
import { aiService, AiProvider } from './AiService';
import { Airline } from '../types/airline';

const LAST_UPDATE_KEY = '@last_airline_update_date';

export interface UpdateChange {
  airlineName: string;
  field: 'hours' | 'url' | 'both';
  oldValue: string | number;
  newValue: string | number;
}

export interface UpdateReport {
  updatedCount: number;
  changes: UpdateChange[];
  failed: Array<{
    airlineName: string;
    reason: string;
    type: 'warning' | 'error';
  }>;
}

export class AirlineUpdateService {
  /**
   * Найти данные об авиакомпании в сети и сохранить в базу
   */
  async fetchAndSaveAirline(iataCode: string): Promise<Airline | null> {
    try {
      console.log(`[AirlineUpdateService] Fetching new airline info for: ${iataCode}`);
      const query = `official free online check-in opening window (hours before departure) for ${iataCode}. Example: 48, 24, 30.`;
      
      const searchResult = await aiService.searchWithTavily(query, 15000); // 15s timeout
      const prompt = `
        Analyze this search result and extract airline data for code ${iataCode}.
        SEARCH CONTEXT: ${searchResult}
        
        RETURN ONLY JSON:
        {
          "name": "Full Name",
          "country": "Country Name",
          "iataCode": "${iataCode}",
          "icaoCode": "XXX",
          "hours": 48,
          "url": "https://..." 
        }
        IMPORTANT: If a range is given (e.g., 48h to 30min), ALWAYS take the LARGEST number (48). 
        Be flexible with the URL, if not sure, keep it null.
      `;
      
      const response = await aiService.analyzeText(prompt, AiProvider.MISTRAL, 25000); // 25s timeout
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      if (!data.name || !data.hours) return null;

      return await airlineRepository.create({
        iataCode: data.iataCode || iataCode,
        icaoCode: data.icaoCode || 'UNK',
        name: data.name,
        country: data.country || 'Unknown',
        checkInHoursBefore: Math.round(data.hours),
        registrationUrl: data.url || null,
        logoUrl: null,
        supportPhone: null,
        notes: 'Auto-discovered via AI'
      });
    } catch (e) {
      console.error(`[AirlineUpdateService] Failed to fetch airline ${iataCode}:`, e);
      return null;
    }
  }


  /**
   * Запустить обновление вручную с детальным отчетом
   */
  async performUpdate(onProgress?: (progress: number, status: string) => void): Promise<UpdateReport> {
    const currentAirlines = await airlineRepository.findAll();
    if (currentAirlines.length === 0) {
      return { updatedCount: 0, changes: [], failed: [] };
    }

    const report: UpdateReport = {
      updatedCount: 0,
      changes: [],
      failed: []
    };

    const total = currentAirlines.length;
    const batchSize = 3; // Уменьшили батч для более глубокого анализа каждой авиакомпании

    for (let i = 0; i < currentAirlines.length; i += batchSize) {
      const batch = currentAirlines.slice(i, i + batchSize);
      const currentProgress = Math.round((i / total) * 100);
      
      onProgress?.(currentProgress, `Анализируем: ${batch.map(a => a.name).join(', ')}...`);

      const batchResults = await this.processBatch(batch);
      
      // Собираем результаты в общий отчет
      report.changes.push(...batchResults.changes);
      report.failed.push(...batchResults.failed);
      report.updatedCount += batchResults.changes.length;
    }

    onProgress?.(100, 'Обновление завершено!');
    await AsyncStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
    return report;
  }

  private async processBatch(airlines: Airline[]): Promise<Omit<UpdateReport, 'updatedCount'>> {
    const batchReport: Omit<UpdateReport, 'updatedCount'> = {
      changes: [],
      failed: []
    };

    let searchContext = '';

    // 1. Собираем контекст для всей пачки
    for (const airline of airlines) {
      const query = `airline online check-in opening hours before flight for ${airline.name} (${airline.iataCode}). Look for phrases like "check-in opens X hours before".`;
      
      try {
        const searchResult = await aiService.searchWithTavily(query, 10000); // 10s timeout per airline in batch
        searchContext += `\n--- AIRLINE: ${airline.name} (${airline.iataCode}) ---\n${searchResult}\n`;
      } catch (e) {
        console.error(`Search failed for ${airline.name}:`, e);
        batchReport.failed.push({ 
          airlineName: airline.name, 
          reason: 'Ошибка поиска в сети', 
          type: 'error' 
        });
      }
    }

    if (!searchContext) return batchReport;

    // 2. ИИ анализирует данные и выносит вердикт
    const prompt = `
      You are an Airline Data Auditor. Analyze the search context and provide updated rules.
      
      CONTEXT:
      ${searchContext}
      
      TASK:
      For each airline (${airlines.map(a => a.iataCode).join(', ')}):
      1. Find the FREE online check-in opening time (in hours before departure).
      2. If a range is mentioned (e.g., 23-48 hours), pick the EARLIEST opening time (the largest number, e.g., 48).
      3. ONLY set success to false if you find absolutely zero information about this airline.
      
      RETURN ONLY JSON ARRAY:
      [{
        "iataCode": "LH",
        "success": true,
        "hours": 48,
        "url": "https://...",
        "status": "ok"
      }]
    `;

    try {
      const response = await aiService.analyzeText(prompt, AiProvider.MISTRAL, 35000); // 35s for batch analysis
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let results: any;
      try {
        results = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error('[AirlineUpdateService] Raw AI Response:', response);
        throw new Error('Некорректный формат JSON от ИИ');
      }

      // Если ИИ прислал объект вместо массива, ищем массив внутри (частая ошибка ИИ)
      if (!Array.isArray(results) && typeof results === 'object' && results !== null) {
        const potentialArrayKey = Object.keys(results).find(k => Array.isArray(results[k]));
        if (potentialArrayKey) {
          results = results[potentialArrayKey];
        } else {
          // Если это просто один объект, превращаем в массив
          results = [results];
        }
      }

      if (!Array.isArray(results)) {
        throw new Error('ИИ не вернул список данных');
      }

      for (const result of results) {
        if (!result || typeof result !== 'object') continue;
        
        const iata = result.iataCode || result.iata;
        if (!iata) continue;

        const local = airlines.find(a => a.iataCode === iata);
        if (!local) continue;

        if (result.success === false) {
          batchReport.failed.push({ 
            airlineName: local.name, 
            reason: result.reason || 'Данные не найдены', 
            type: 'warning' 
          });
          continue;
        }

        const safeHours = (result.hours !== undefined && result.hours !== null) 
          ? Math.max(1, Math.min(720, Math.round(result.hours))) 
          : local.checkInHoursBefore;
        
        const hoursChanged = local.checkInHoursBefore !== safeHours;
        
        let finalUrl = result.url || local.registrationUrl;
        // Авто-исправление протокола
        if (finalUrl && !finalUrl.startsWith('http')) {
          finalUrl = 'https://' + finalUrl;
        }
        
        const urlChanged = finalUrl && local.registrationUrl !== finalUrl;

        if (hoursChanged || urlChanged) {
          // Обновляем в базе
          await airlineRepository.update(local.id, {
            checkInHoursBefore: safeHours,
            registrationUrl: finalUrl || local.registrationUrl,
            notes: `Auto-updated on ${new Date().toLocaleDateString()}`
          });

          if (hoursChanged && urlChanged) {
            batchReport.changes.push({
              airlineName: local.name,
              field: 'both',
              oldValue: `${local.checkInHoursBefore}h`,
              newValue: `${safeHours}h (link updated)`
            });
          } else if (hoursChanged) {
            batchReport.changes.push({
              airlineName: local.name,
              field: 'hours',
              oldValue: local.checkInHoursBefore,
              newValue: safeHours
            });
          } else if (urlChanged) {
            batchReport.changes.push({
              airlineName: local.name,
              field: 'url',
              oldValue: local.registrationUrl || 'отсутствует',
              newValue: finalUrl!
            });
          }
        }
      }
    } catch (e) {
      console.error('Batch analysis failed:', e);
      airlines.forEach(a => {
        if (!batchReport.failed.find(f => f.airlineName === a.name)) {
          batchReport.failed.push({ airlineName: a.name, reason: 'Ошибка анализа ИИ', type: 'error' });
        }
      });
    }

    return batchReport;
  }
}

export const airlineUpdateService = new AirlineUpdateService();
