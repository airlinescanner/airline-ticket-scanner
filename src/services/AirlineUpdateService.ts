import AsyncStorage from '@react-native-async-storage/async-storage';
import { airlineRepository } from './database/AirlineRepository';
import { aiService, AiProvider } from './AiService';
import { Airline } from '../types/airline';

const LAST_UPDATE_KEY = '@last_airline_update_date';

export interface UpdateChange {
  airlineName: string;
  oldHours: number;
  newHours: number;
}

export class AirlineUpdateService {
  /**
   * Проверить необходимость автоматического обновления (раз в неделю)
   */
  async checkAutoUpdate(): Promise<UpdateChange[] | null> {
    const lastUpdate = await AsyncStorage.getItem(LAST_UPDATE_KEY);
    const now = new Date();

    if (lastUpdate) {
      const lastDate = new Date(lastUpdate);
      const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
      
      if (diffDays < 7) {
        return null; // Еще не прошла неделя
      }
    }

    return await this.performUpdate();
  }

  /**
   * Запустить обновление вручную
   */
  async performUpdate(onProgress?: (progress: number, status: string) => void): Promise<UpdateChange[]> {

    
    // 1. Получаем список всех авиакомпаний из нашей базы
    const currentAirlines = await airlineRepository.findAll();
    if (currentAirlines.length === 0) return [];

    const total = currentAirlines.length;
    const changes: UpdateChange[] = [];
    const batchSize = 5;

    for (let i = 0; i < currentAirlines.length; i += batchSize) {
      const batch = currentAirlines.slice(i, i + batchSize);
      
      // Сообщаем о начале обработки пачки
      const currentProgress = Math.round((i / total) * 100);
      const batchNames = batch.map(a => a.name).join(', ');
      onProgress?.(currentProgress, `Checking: ${batchNames}...`);

      const batchChanges = await this.processBatch(batch, (status) => {
        // Уточняем статус внутри пачки, если нужно
        onProgress?.(currentProgress, status);
      });
      
      changes.push(...batchChanges);
    }

    // Завершение
    onProgress?.(100, 'Done!');
    await AsyncStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
    return changes;
  }

  private async processBatch(
    airlines: Airline[], 
    onStatus?: (status: string) => void
  ): Promise<UpdateChange[]> {

    
    let combinedSearchContext = '';

    // 1. Собираем информацию из интернета для каждой авиакомпании через Tavily
    for (let idx = 0; idx < airlines.length; idx++) {
      const airline = airlines[idx];
      const query = `official online check-in opening time for ${airline.name} (${airline.iataCode}) ${airline.registrationUrl || ''} 2024 2025`;

      onStatus?.(`Searching: ${airline.name}...`);
      const searchResult = await aiService.searchWithTavily(query);
      combinedSearchContext += `\n--- DATA FOR ${airline.name} (${airline.iataCode}) ---\n${searchResult}\n`;
    }

    onStatus?.('Analyzing found data...');
    // 2. Формируем промпт для Mistral на основе найденных данных
    const prompt = `
      You are an EXPERT DATA EXTRACTOR. Below is the web search data for several airlines regarding their online check-in opening times.
      
      SEARCH CONTEXT:
      ${combinedSearchContext}
      
      YOUR TASK:
      1. Analyze the context above and find:
         - The EXACT check-in opening hours before departure.
         - The OFFICIAL online check-in URL.
      2. If multiple windows exist (paid vs free), use the FREE window (usually 24h for LCCs).
      3. Return ONLY a JSON array of objects for the following airlines: ${airlines.map(a => a.iataCode).join(', ')}.
      
      FORMAT:
      [{"iataCode": "LH", "hours": 30, "url": "https://www.lufthansa.com/check-in"}, ...]
    `;

    try {

      const response = await aiService.analyzeText(prompt, AiProvider.MISTRAL);

      
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const updates: { iataCode: string; hours: number; url?: string }[] = JSON.parse(cleanJson);

      const batchChanges: UpdateChange[] = [];

      for (let idx = 0; idx < updates.length; idx++) {
        const update = updates[idx];
        const localAirline = airlines.find(a => a.iataCode === update.iataCode);
        
        if (localAirline && typeof update.hours === 'number' && !isNaN(update.hours)) {
          const hasHoursChanged = localAirline.checkInHoursBefore !== update.hours;
          const hasUrlChanged = !localAirline.registrationUrl && update.url;

          if (hasHoursChanged || hasUrlChanged) {

            
            try {
              await airlineRepository.update(localAirline.id, { 
                checkInHoursBefore: update.hours,
                registrationUrl: localAirline.registrationUrl || update.url || null,
                notes: `Verified via Tavily+Mistral on ${new Date().toLocaleDateString()}` 
              });
              
              if (hasHoursChanged) {
                batchChanges.push({
                  airlineName: localAirline.name,
                  oldHours: localAirline.checkInHoursBefore,
                  newHours: update.hours
                });
              }
            } catch (updateError) {
              console.error(`[AirlineUpdateService] Failed to update ${localAirline.name}:`, updateError);
            }
          }
        } else {

        }
      }

      return batchChanges;
    } catch (e) {
      console.error('[AirlineUpdateService] Failed to process batch:', e);
      return [];
    }
  }
}

export const airlineUpdateService = new AirlineUpdateService();
