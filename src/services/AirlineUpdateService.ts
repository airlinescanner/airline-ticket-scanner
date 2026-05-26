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

const CENTRAL_DB_URL = process.env.EXPO_PUBLIC_CENTRAL_DB_URL || 'https://raw.githubusercontent.com/airlinescanner/airlinescanner/main/airlines_data.json';

export class AirlineUpdateService {
  /**
   * Найти данные об авиакомпании в сети и сохранить в базу
   */
  async fetchAndSaveAirline(iataCode: string, airlineName?: string | null): Promise<Airline | null> {
    try {
      console.log(`[AirlineUpdateService] Fetching new airline info for: ${iataCode} (${airlineName || 'No Name'})`);
      
      const query = airlineName 
        ? `when does online check-in open for ${airlineName} (${iataCode}) hours before departure`
        : `when does online check-in open for airline ${iataCode} hours before departure`;
      
      const searchResult = await aiService.searchWithTavily(query, 15000); // 15s timeout
      const prompt = `
        Analyze this search result and extract airline data for code ${iataCode}${airlineName ? ` (Airline Name: ${airlineName})` : ''}.
        SEARCH CONTEXT: ${searchResult}
        
        CRITICAL ACCURACY INSTRUCTIONS:
        1. PRIORITIZE OFFICIAL DOMAINS: Highly prioritize search results originating directly from the airline's official website (e.g. discover-airlines.com, lufthansa.com, ryanair.com).
        2. USE TRUSTWORTHY FALLBACKS: If the official domain results are missing, incomplete, or blocked (e.g. returning empty or 403 pages), you MUST fall back to reputable third-party travel websites.
        3. VERIFY DISCREPANCIES: Direct official domain information is the absolute source of truth.
        4. BE EXACT: Extract the EXACT number of hours stated for STANDARD flights. For example, Air France is 30 hours, Lufthansa is 23 hours. Do NOT guess or assume 24/48 if the text explicitly says 30 or 23. If the text says "30 hours before", return 30. If it says "24 hours", return 24.

        RETURN ONLY JSON:
        {
          "name": "${airlineName || 'Full Name'}",
          "country": "Country Name",
          "iataCode": "${iataCode}",
          "icaoCode": "XXX",
          "hours": 48,
          "url": "https://..." 
        }
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
   * Синхронизация локальной базы данных с центральным JSON на сервере GitHub
   */
  async performUpdate(onProgress?: (progress: number, status: string) => void): Promise<UpdateReport> {
    const report: UpdateReport = {
      updatedCount: 0,
      changes: [],
      failed: []
    };

    try {
      console.log(`[AirlineUpdateService] Fetching updates from central DB: ${CENTRAL_DB_URL}`);
      onProgress?.(10, 'Подключение к серверу...');
      
      const response = await fetch(CENTRAL_DB_URL, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка подключения: ${response.status}`);
      }

      onProgress?.(30, 'Анализ полученных данных...');
      const data = await response.json();
      
      if (!data || !Array.isArray(data.airlines)) {
        throw new Error('Неверный формат данных на сервере');
      }

      const remoteAirlines = data.airlines;
      const currentAirlines = await airlineRepository.findAll();
      const total = remoteAirlines.length;

      onProgress?.(50, 'Синхронизация локальной базы...');

      for (let i = 0; i < remoteAirlines.length; i++) {
        const remote = remoteAirlines[i];
        if (!remote.success) continue; // Пропускаем неудачные сканирования

        const local = currentAirlines.find(a => a.iataCode === remote.iataCode);
        if (!local) {
          // Если такой авиакомпании у нас почему-то нет в SQLite, мы ее создаем!
          try {
            await airlineRepository.create({
              iataCode: remote.iataCode,
              icaoCode: 'UNK',
              name: remote.iataCode, // Используем код как имя по умолчанию
              country: 'Unknown',
              checkInHoursBefore: Math.max(1, Math.min(720, remote.hours)),
              registrationUrl: remote.url,
              logoUrl: null,
              supportPhone: null,
              notes: 'Added via central sync'
            });
            report.changes.push({
              airlineName: `Новая авиакомпания (${remote.iataCode})`,
              field: 'both',
              oldValue: 'отсутствует',
              newValue: `${remote.hours}ч`
            });
          } catch (createErr) {
            console.error(`Failed to auto-create airline ${remote.iataCode}:`, createErr);
          }
          continue;
        }

        const safeHours = Math.max(1, Math.min(720, Math.round(remote.hours)));
        const hoursChanged = local.checkInHoursBefore !== safeHours;
        
        let finalUrl = remote.url || local.registrationUrl;
        if (finalUrl && !finalUrl.startsWith('http')) {
          finalUrl = 'https://' + finalUrl;
        }
        const urlChanged = finalUrl && local.registrationUrl !== finalUrl;

        if (hoursChanged || urlChanged) {
          await airlineRepository.update(local.id, {
            checkInHoursBefore: safeHours,
            registrationUrl: finalUrl || local.registrationUrl,
            notes: `Synced from central DB on ${new Date().toLocaleDateString()}`
          });

          if (hoursChanged && urlChanged) {
            report.changes.push({
              airlineName: local.name,
              field: 'both',
              oldValue: `${local.checkInHoursBefore}ч`,
              newValue: `${safeHours}ч (ссылка обновлена)`
            });
          } else if (hoursChanged) {
            report.changes.push({
              airlineName: local.name,
              field: 'hours',
              oldValue: local.checkInHoursBefore,
              newValue: safeHours
            });
          } else if (urlChanged) {
            report.changes.push({
              airlineName: local.name,
              field: 'url',
              oldValue: local.registrationUrl || 'отсутствует',
              newValue: finalUrl!
            });
          }
        }

        const progress = 50 + Math.round((i / total) * 50);
        onProgress?.(progress, `Синхронизация: ${Math.round((i / total) * 100)}%`);
      }

      report.updatedCount = report.changes.length;
      onProgress?.(100, 'Синхронизация завершена!');
      await AsyncStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());

    } catch (e: any) {
      console.error('[AirlineUpdateService] Central sync failed:', e);
      report.failed.push({
        airlineName: 'Центральный сервер',
        reason: e.message || 'Не удалось связаться с сервером',
        type: 'error'
      });
      onProgress?.(100, 'Ошибка синхронизации');
    }

    return report;
  }
}

export const airlineUpdateService = new AirlineUpdateService();
