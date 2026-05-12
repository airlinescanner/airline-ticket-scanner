import * as FileSystem from 'expo-file-system';
import { TicketData } from "../types/ticket";
import { API_CONFIG } from "../config/ApiConfig";
import { secretService } from './SecretService';
import { fetchWithTimeout } from '../utils/networkUtils';

export enum AiProvider {
  GROQ = 'GROQ',
  MISTRAL = 'MISTRAL',
  GEMINI = 'GEMINI'
}

export class AiService {
  
  async analyzeTicket(imageUri: string, provider?: AiProvider, ocrData?: { text: string; blocks?: any[] }, modelName?: string, timeoutMs: number = 30000): Promise<TicketData[]> {
    const groqKey = await secretService.getGroqApiKey();
    const mistralKey = await secretService.getMistralApiKey();
    const geminiKey = await secretService.getGeminiApiKey(); 

    if (provider === AiProvider.GEMINI) {
      if (!geminiKey) throw new Error('Gemini API Key is missing.');
      console.log('[AiService] Using Gemini for ticket analysis');
      return await this.executeGeminiAnalysis(geminiKey, imageUri, ocrData, timeoutMs);
    }

    if (provider === AiProvider.MISTRAL) {
      if (!mistralKey) {
        throw new Error('Mistral API Key is missing. Please set it in Settings.');
      }
      console.log('[AiService] Using Mistral for ticket analysis');
      return await this.executeMistralAnalysis(mistralKey, imageUri, ocrData, timeoutMs);
    }

    if (!groqKey) {
      throw new Error('Groq API Key is missing. Please set it in Settings.');
    }

    const selectedModel = modelName || API_CONFIG.GROQ_MODELS[0];
    console.log('[AiService] Using Groq model:', selectedModel);
    return await this.executeGroqAnalysis(groqKey, imageUri, selectedModel, ocrData, timeoutMs);
  }

  /**
   * Анализ текстового промпта (без картинки)
   */
  async analyzeText(prompt: string, provider?: AiProvider, timeoutMs: number = 30000): Promise<string> {
    const groqKey = await secretService.getGroqApiKey();
    const mistralKey = await secretService.getMistralApiKey();

    const useProvider = provider || AiProvider.GROQ;
    
    const apiKey = useProvider === AiProvider.MISTRAL ? mistralKey : groqKey;
    const url = useProvider === AiProvider.MISTRAL 
      ? "https://api.mistral.ai/v1/chat/completions" 
      : "https://api.groq.com/openai/v1/chat/completions";
    const model = useProvider === AiProvider.MISTRAL 
      ? API_CONFIG.MISTRAL_MODEL 
      : API_CONFIG.GROQ_MODELS[0];

    if (!apiKey) throw new Error('API Key is missing');

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    }, timeoutMs);

    const data = await response.json();
    return data.choices[0]?.message?.content || '[]';
  }

  /**
   * Поиск в интернете через Tavily
   */
  async searchWithTavily(query: string, timeoutMs: number = 30000): Promise<string> {
    const apiKey = await secretService.getTavilyApiKey();
    if (!apiKey) throw new Error('Tavily API Key is missing');

    try {
      const response = await fetchWithTimeout("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "basic",
          max_results: 5
        })
      }, timeoutMs);

      const data = await response.json();
      // Превращаем результаты поиска в один текстовый блок для ИИ
      const resultsText = data.results?.map((r: any) => 
        `Source: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}\n`
      ).join('\n---\n');

      return resultsText || 'No search results found.';
    } catch (error) {
      console.error('[AiService] Tavily search error:', error);
      return 'Error performing search.';
    }
  }

  /**
   * Арбитраж: когда два ИИ разошлись во мнениях, просим основной ИИ рассудить
   */
  async arbitrateMismatches(imageUri: string, result1: TicketData[], result2: TicketData[], customModel?: string): Promise<TicketData[]> {
    const groqKey = await secretService.getGroqApiKey();
    const modelName = customModel || API_CONFIG.GROQ_MODELS[0]; // Используем самую мощную модель как судью

    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    
    const prompt = `
      You are the SUPREME JUDGE of FLIGHT DATA. 
      Two other models disagreed on the data from this ticket. 
      
      DISPUTED DATA:
      Model 1: ${JSON.stringify(result1, null, 2)}
      Model 2: ${JSON.stringify(result2, null, 2)}
      
      YOUR MANDATORY STEPS:
      1. TRANSCRIPTION: Transcribe the EXACT lines from the image that contain the Passenger Name, Flight Number, Date, and Booking Code.
      2. JUDGMENT: Compare your transcription with the disputed data.
      3. OUTPUT: Provide the final, corrected JSON array of objects.
      
      RULES:
      - Be 100% literal with the image.
      - If both models were wrong, you must find the correct value yourself.
      - Return ONLY the JSON after your transcription.
    `;
    try {
      const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      }, 45000); // More time for arbitration

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[AiService] Judge (Groq) rate limited. Falling back to Mistral for arbitration.');
          const mistralKey = await secretService.getMistralApiKey();
          return await this.executeMistralAnalysis(mistralKey, imageUri); // Note: this uses default prompt, not judge prompt
        }
        const errorData = await response.json();
        throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) return result1;
      return this.parseResponse(content);
    } catch (err) {
      console.warn('[AiService] Groq arbitration failed, using first result as fallback:', err);
      return result1;
    }
  }

  private async executeMistralAnalysis(apiKey: string, imageUri: string, ocrData?: { text: string; blocks?: any[] }, timeoutMs: number = 30000): Promise<TicketData[]> {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    
    const response = await fetchWithTimeout("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: API_CONFIG.MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: this.getMistralPrompt(ocrData?.text) },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 0.1
      })
    }, timeoutMs);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    console.log(`[AiService] Mistral response:`, content ? content.substring(0, 100) + '...' : 'EMPTY');

    if (!content) return [];
    return this.parseResponse(content);
  }

  private async executeGeminiAnalysis(apiKey: string, imageUri: string, ocrData?: { text: string; blocks?: any[] }, timeoutMs: number = 30000): Promise<TicketData[]> {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: this.getPrompt(ocrData?.text) },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    }, timeoutMs);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log(`[AiService] Gemini response received`);

    if (!content) return [];
    return this.parseResponse(content);
  }

  private getMistralPrompt(ocrText?: string): string {
    const ocrContext = ocrText ? `LOCAL OCR TEXT (from phone): ${ocrText}\n\n` : '';
    return `
      ${ocrContext}
      Extract airline ticket data from this image.
      Return ONLY a JSON array of objects.
      Fields: passengerName, airlineName, airlineCode, flightNumber, departureDate (YYYY-MM-DD), departureTime (HH:mm), departureCity, departureAirport (3-letter), arrivalCity, arrivalAirport (3-letter), bookingReference (PNR).
      Return ONLY the JSON array. No extra text.
    `;
  }

  private async executeGroqAnalysis(apiKey: string, imageUri: string, modelName: string, ocrData?: { text: string; blocks?: any[] }, timeoutMs: number = 30000): Promise<TicketData[]> {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    
    // Проверяем, поддерживает ли модель vision
    const name = modelName || '';
    const isVisionModel = name.includes('vision') || name.includes('scout') || name.includes('-vl');
    
    const requestBody: any = {
      model: name || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1
    };

    if (isVisionModel) {
      requestBody.messages = [
        {
          role: "user",
          content: [
            { type: "text", text: this.getPrompt(ocrData?.text) },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            }
          ]
        }
      ];
    } else {
      throw new Error('Модель не поддерживает vision.');
    }
    
    const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }, timeoutMs);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Groq API Error: ${data?.error?.message || response.statusText}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return [];
    
    return this.parseResponse(content);
  }

  private getPrompt(ocrText?: string): string {
    const currentYear = new Date().getFullYear();
    const ocrContext = ocrText ? `
      LOCAL OCR TRANSCRIPTION (FROM PHONE SCANNER):
      ---
      ${ocrText}
      ---
      Use the transcription above as a primary guide, but verify with the image.
    ` : '';

    return `
      You are a HIGH-PRECISION OCR FLIGHT DATA EXTRACTOR. 
      ${ocrContext}
      Follow these steps EXACTLY to ensure 100% accuracy, especially for monitor screen photos.

      STEP 1: TRANSCRIPTION
      First, transcribe every single word and character you see on the ticket image, line by line. 
      Pay extreme attention to:
      - Passenger names (look for markers like Traveler, Passenger, Mr/Mrs).
      - Flight numbers (e.g., LH2274, OS720).
      - Booking codes (PNR, Reservation code - usually 6 alphanumeric chars).
      - Departure details (dates, times, airports).
      
      STEP 2: EXTRACTION
      Based ONLY on your transcription from Step 1, generate a JSON array of objects.
      
      JSON FIELDS:
      - passengerName: Full name without titles (MR, MRS, MS). Replace "/" with space.
      - airlineName: Full airline name.
      - airlineCode: 2-letter IATA code (e.g., OS, LH).
      - flightNumber: Airline code + digits (e.g., OS720).
      - departureDate: YYYY-MM-DD. (Current year is ${currentYear}).
      - departureTime: HH:mm.
      - departureCity: Full name of the departure city.
      - departureCountry: Full name of the departure country.
      - departureAirport: 3-letter IATA code (e.g., VIE, KIV).
      - arrivalCity: Full name of the arrival city.
      - arrivalCountry: Full name of the arrival country.
      - arrivalAirport: 3-letter IATA code.
      - bookingReference: PNR code (6 chars).
      - operatingAirlineName: Only if "Operated by" is different.
      - operatingAirlineCode: 2-letter code for the operating carrier.
      - confidence: An object with scores (0.0 to 1.0) for each field above.
      - confidenceScore: Overall confidence score (0.0 to 1.0).
      - sourceText: The raw text line you used to extract this ticket.

      CRITICAL RULES:
      1. IGNORE all data after the word "Arrival" when looking for Departure date/time.
      2. If you see "Operated by" and the carrier is different, fill operatingAirlineName and operatingAirlineCode.
      3. Names must NOT contain digits or airline names.
      4. City and Country fields are MANDATORY if visible. Look for them near the airports.
      5. If a field is uncertain, set its confidence low (e.g., 0.4) and explain why in a "warnings" field.
      6. Passenger name MUST NOT contain aircraft types (Airbus, Boeing, etc.), equipment info, or seat numbers. If you see these words near a name, EXCLUDE them.
      7. Return ONLY the final JSON array after your transcription.
    `;
  }

  private buildSourceText(item: any): string {
    const parts = [
      item?.sourceText,
      item?.rawText,
      item?.ocrText,
      item?.ticketText,
      item?.text,
      item?.raw_json,
      item?.rawJson,
    ].filter((v) => typeof v === 'string' && v.trim().length > 0);

    if (parts.length === 0) {
      return JSON.stringify(item);
    }

    return parts.join('\n');
  }

  private sanitizePassengerName(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const withoutSlash = raw.replace(/[\/|]/g, ' ');
    const withoutTitles = withoutSlash.replace(/\b(MRS|MR|MS|MISS|MSTR)\b\.?/gi, ' ');
    // Удаляем всё, что начинается с технических ключей или названий авиакомпаний
    const trashKeywords = [
      'Airlines?', 'Austrian', 'Lufthansa', 'Ryanair', 'Wizz', 'Turkish', 'Air', 'Fly', 'Carrier', 
      'Operated', 'Flight', 'Booking', 'PNR', 'Reservation', 'Equipment', 'Airbus', 'Boeing', 'Aircraft',
      'A320', 'A321', 'A330', 'A350', 'B737', 'B747', 'B777', 'B787',
      'airlineName', 'airlineCode', 'flightNumber', 'departureDate', 'departureTime', 
      'departureCity', 'departureCountry', 'departureAirport', 'arrivalCity', 'arrivalCountry', 
      'arrivalAirport', 'bookingReference', 'operatingAirlineName', 'operatingAirlineCode', 
      'confidence', 'confidenceScore', 'sourceText'
    ];
    const regex = new RegExp(`\\b(${trashKeywords.join('|')})\\b`, 'i');
    const withoutAirlineInfo = withoutTitles.split(regex)[0];
    
    const cleaned = withoutAirlineInfo
      .replace(/[^\p{L}\s'\-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length < 2) return null;
    return cleaned;
  }

  private normalizePnr(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (normalized.length < 5 || normalized.length > 6) return null;
    if (/^[A-Z]{2,3}\d{2,4}[A-Z]?$/.test(normalized)) return null;
    return normalized;
  }

  private normalizeFlightNumber(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (normalized.length < 3 || normalized.length > 8) return null;
    if (!/[A-Z]/.test(normalized) || !/\d/.test(normalized)) return null;
    if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalized)) return null;
    return normalized;
  }

  private normalizeTime(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const match = raw.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) return null;
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private normalizeAirportCode(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = raw.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) return null;
    return normalized;
  }

  private normalizeAirlineCode(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!/^[A-Z0-9]{2,3}$/.test(normalized)) return null;
    return normalized;
  }

  private hasTicketKeywords(raw: string | null | undefined): boolean {
    if (!raw) return false;
    return /\b(FLIGHT|BOOKING|PNR|DEPARTURE|ARRIVAL|SEAT|GATE|TERMINAL|AIRLINE|RESERVATION|REIS|РЕЙС|БРОН|КОД)\b/i.test(raw);
  }

  private isValidPassengerName(raw: string | null | undefined): boolean {
    if (!raw) return false;
    if (this.hasTicketKeywords(raw)) return false;
    if (/\d/.test(raw)) return false;
    const cleaned = this.sanitizePassengerName(raw);
    if (!cleaned) return false;
    if (this.normalizeFlightNumber(cleaned)) return false;
    if (this.normalizePnr(cleaned)) return false;
    return true;
  }

  private extractFlightNumberByAnchors(sourceText: string): string | null {
    const patterns = [
      /Flight\s*(?:No|Number|№)?\s*[:\-]?\s*([A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?)/i,
      /Рейс\s*[:\-]?\s*([A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?)/i,
    ];

    for (const pattern of patterns) {
      const match = sourceText.match(pattern);
      if (!match?.[1]) continue;
      const normalized = this.normalizeFlightNumber(match[1]);
      if (normalized) return normalized;
    }

    return null;
  }

  private extractPassengerNameByAnchors(sourceText: string): string | null {
    const patterns = [
      /Traveler\s*[:\-]?\s*([^\n\r]+)/i,
      /Passenger\s*Name\s*[:\-]?\s*([^\n\r]+)/i,
      /\b(?:Mrs|Mr|Ms|Miss|Mstr)\b\.?\s+([^\n\r]+)/i,
    ];

    for (const pattern of patterns) {
      const match = sourceText.match(pattern);
      if (!match?.[1]) continue;
      
      // Останавливаемся, как только встретили ключевые слова других полей или авиакомпании
      const candidate = match[1].split(/\b(?:Booking|PNR|Departure|Arrival|Flight|Seat|Gate|Terminal|Reservation|Airlines?|Operated|Carrier)\b/i)[0];
      const normalized = this.sanitizePassengerName(candidate);
      if (normalized) return normalized;
    }

    return null;
  }

  private extractPnrByAnchors(sourceText: string): string | null {
    const patterns = [
      /RESERVATION\s*CODE\s*[:\-]?\s*([A-Z0-9]{5,8})/i,
      /Booking\s*ref(?:erence)?\s*[:\-]?\s*([A-Z0-9]{5,8})/i,
      /LH\s*\(Lufthansa\)\s*[:\-]?\s*([A-Z0-9]{5,8})/i,
      /OS\s*\(Austrian\s*Airlines\)\s*[:\-]?\s*([A-Z0-9]{5,8})/i,
      /\bLH\b\s*[:\-]?\s*([A-Z0-9]{5,8})/i,
      /\bOS\b\s*[:\-]?\s*([A-Z0-9]{5,8})/i,
    ];

    for (const pattern of patterns) {
      const match = sourceText.match(pattern);
      if (!match?.[1]) continue;
      const normalized = this.normalizePnr(match[1]);
      if (normalized) return normalized;
    }

    return null;
  }

  private formatIsoDate(year: number, month: number, day: number): string {
    const y = `${year}`.padStart(4, '0');
    const m = `${month}`.padStart(2, '0');
    const d = `${day}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private extractDepartureByAnchor(
    sourceText: string
  ): { departureDate: string | null; departureTime: string | null } {
    // Берем только ту часть текста, которая идет ПОСЛЕ Departure, но ДО Arrival
    const parts = sourceText.split(/Arrival/i);
    const departureOnlyText = parts[0].split(/Departure/i)[1] || '';
    
    if (!departureOnlyText.trim()) return { departureDate: null, departureTime: null };

    const candidate = departureOnlyText.trim();
    const timeMatch = candidate.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    const departureTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

    const numericDateMatch = candidate.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
    if (numericDateMatch) {
      const day = Number(numericDateMatch[1]);
      const month = Number(numericDateMatch[2]);
      const rawYear = numericDateMatch[3] ? Number(numericDateMatch[3]) : new Date().getFullYear();
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return { departureDate: this.formatIsoDate(year, month, day), departureTime };
      }
    }

    const monthMap: Record<string, number> = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    const textDateMatch = candidate.match(
      /\b(\d{1,2})\s+(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)(?:\s+(\d{4}))?\b/i
    );

    if (textDateMatch) {
      const day = Number(textDateMatch[1]);
      const monthToken = textDateMatch[2].toLowerCase();
      const month = monthMap[monthToken];
      const year = textDateMatch[3] ? Number(textDateMatch[3]) : new Date().getFullYear();
      if (month && day >= 1 && day <= 31) {
        return { departureDate: this.formatIsoDate(year, month, day), departureTime };
      }
    }

    return { departureDate: null, departureTime };
  }

  private applyAnchorRules(item: any): any {
    if (!item || typeof item !== 'object') return null; // Защита от пустых данных
    
    const sourceText = this.buildSourceText(item);

    const anchoredPassenger = this.extractPassengerNameByAnchors(sourceText);
    const anchoredPnr = this.extractPnrByAnchors(sourceText);
    const anchoredFlight = this.extractFlightNumberByAnchors(sourceText);
    const anchoredDeparture = this.extractDepartureByAnchor(sourceText);

    const aiPassenger = this.sanitizePassengerName(item.passengerName);
    const passengerFromAnchor = anchoredPassenger && this.isValidPassengerName(anchoredPassenger) ? anchoredPassenger : null;
    let passengerName = passengerFromAnchor || (this.isValidPassengerName(aiPassenger) ? aiPassenger : null);

    // Дополнительная очистка: если в имя попало название авиакомпании или код
    if (passengerName) {
      if (item.airlineName) {
        const airlineNameStr = String(item.airlineName);
        const airlineEscaped = airlineNameStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        passengerName = passengerName.replace(new RegExp(`\\b${airlineEscaped}\\b`, 'gi'), '').trim();
      }
      if (item.airlineCode) {
        const airlineCodeStr = String(item.airlineCode);
        passengerName = passengerName.replace(new RegExp(`\\b${airlineCodeStr}\\b`, 'gi'), '').trim();
      }
      // Убираем висящие союзы и обрывки слов
      passengerName = passengerName.replace(/\b(by|and|for|at|on|of)\b$/i, '').trim();
    }

    const flightNumber = anchoredFlight || this.normalizeFlightNumber(item.flightNumber) || null;
    const bookingReference = anchoredPnr || this.normalizePnr(item.bookingReference) || null;
    const departureDate = anchoredDeparture.departureDate || item.departureDate || null;
    const departureTime = anchoredDeparture.departureTime || this.normalizeTime(item.departureTime) || null;
    const departureAirport = this.normalizeAirportCode(item.departureAirport) || item.departureAirport || null;
    const arrivalAirport = this.normalizeAirportCode(item.arrivalAirport) || item.arrivalAirport || null;
    const airlineCode = this.normalizeAirlineCode(item.airlineCode) || item.airlineCode || null;

    // Anti-mix защита: имя не может совпадать с рейсом или PNR
    if (passengerName) {
      const passengerToken = passengerName.replace(/\s+/g, '').toUpperCase();
      if ((flightNumber && passengerToken === flightNumber) || (bookingReference && passengerToken === bookingReference)) {
        passengerName = null;
      }
    }

    const confidence = {
      passengerName: passengerFromAnchor ? 0.98 : passengerName ? (item.confidence?.passengerName || 0.7) : 0,
      flightNumber: anchoredFlight ? 0.95 : flightNumber ? (item.confidence?.flightNumber || 0.7) : 0,
      bookingReference: anchoredPnr ? 0.98 : bookingReference ? (item.confidence?.bookingReference || 0.68) : 0,
      departureDate: anchoredDeparture.departureDate ? 0.95 : departureDate ? (item.confidence?.departureDate || 0.65) : 0,
      departureTime: anchoredDeparture.departureTime ? 0.92 : departureTime ? (item.confidence?.departureTime || 0.62) : 0,
      departureAirport: departureAirport ? (this.normalizeAirportCode(departureAirport) ? 0.8 : 0.4) : 0,
      arrivalAirport: arrivalAirport ? (this.normalizeAirportCode(arrivalAirport) ? 0.8 : 0.4) : 0,
      airlineName: item.airlineName ? (item.confidence?.airlineName || 0.8) : 0,
      airlineCode: item.airlineCode ? (item.confidence?.airlineCode || 0.8) : 0,
      departureCity: item.departureCity ? (item.confidence?.departureCity || 0.7) : 0,
      arrivalCity: item.arrivalCity ? (item.confidence?.arrivalCity || 0.7) : 0,
      operatingAirlineCode: item.operatingAirlineCode ? (item.confidence?.operatingAirlineCode || 0.8) : 0,
      operatingAirlineName: item.operatingAirlineName ? (item.confidence?.operatingAirlineName || 0.8) : 0,
    };

    const rawPassenger = typeof item.passengerName === 'string' ? item.passengerName : '';
    const rawPassengerToken = rawPassenger.replace(/\s+/g, '').toUpperCase();

    const normalized = {
      ...item,
      passengerName,
      flightNumber,
      airlineName: item.airlineName || null,
      airlineCode: airlineCode,
      bookingReference,
      departureDate,
      departureTime,
      departureAirport,
      arrivalAirport,
      operatingAirlineName: item.operatingAirlineName || null,
      operatingAirlineCode: this.normalizeAirlineCode(item.operatingAirlineCode) || item.operatingAirlineCode || null,
      confidence,
    };

    return {
      ...normalized,
      rawJson: JSON.stringify(
        {
          ...normalized,
          _anchorRules: {
            passengerNameFromAnchor: Boolean(anchoredPassenger),
            flightNumberFromAnchor: Boolean(anchoredFlight),
            bookingReferenceFromAnchor: Boolean(anchoredPnr),
            departureFromAnchor: Boolean(anchoredDeparture.departureDate || anchoredDeparture.departureTime),
          },
          _quality: {
            confidence,
            invalidPassengerDropped: !passengerName && Boolean(item.passengerName),
            antiMixTriggered: Boolean(
              passengerName === null && rawPassenger &&
              ((flightNumber && rawPassengerToken === flightNumber) || (bookingReference && rawPassengerToken === bookingReference))
            ),
          },
        },
        null,
        2
      ),
    };
  }

  private parseResponse(text: string): TicketData[] {
    // Чистим текст от markdown разметки ```json ... ```
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Ищем начало массива [, если ИИ добавил лишний текст
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }

    try {
      let parsed = JSON.parse(cleanText);
      if (!parsed) return []; // Если JSON пустой (null/undefined)
      
      if (!Array.isArray(parsed)) {
        if (parsed.tickets) parsed = parsed.tickets;
        else parsed = [parsed];
      }

      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item: any) => this.applyAnchorRules(item))
        .filter(Boolean); // Убираем null результаты
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      throw new Error("ИИ прислал данные в неверном формате. Попробуйте еще раз.");
    }
  }
}

export const aiService = new AiService();
