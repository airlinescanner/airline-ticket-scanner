import * as FileSystem from 'expo-file-system';
import { TicketData } from "../types/ticket";
import { API_CONFIG } from "../config/ApiConfig";
import { secretService } from './SecretService';

export enum AiProvider {
  GROQ = 'GROQ',
  MISTRAL = 'MISTRAL'
}

export class AiService {
  
  async analyzeTicket(imageUri: string, provider?: AiProvider, modelName?: string): Promise<TicketData[]> {
    const groqKey = await secretService.getGroqApiKey();
    const mistralKey = await secretService.getMistralApiKey();

    if (provider === AiProvider.MISTRAL && mistralKey) {
      console.log('[AiService] Using Mistral for ticket analysis');
      return await this.executeMistralAnalysis(mistralKey, imageUri);
    }

    if (!groqKey) {
      throw new Error('Groq API Key is missing');
    }

    const selectedModel = modelName || API_CONFIG.GROQ_MODELS[0];
    console.log('[AiService] Using Groq model:', selectedModel);
    return await this.executeGroqAnalysis(groqKey, imageUri, selectedModel);
  }

  /**
   * Анализ текстового промпта (без картинки)
   */
  async analyzeText(prompt: string, provider?: AiProvider): Promise<string> {
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

    const response = await fetch(url, {
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
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || '[]';
  }

  /**
   * Поиск в интернете через Tavily
   */
  async searchWithTavily(query: string): Promise<string> {
    const apiKey = await secretService.getTavilyApiKey();
    if (!apiKey) throw new Error('Tavily API Key is missing');

    try {
      const response = await fetch("https://api.tavily.com/search", {
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
      });

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
  async arbitrateMismatches(imageUri: string, result1: TicketData[], result2: TicketData[]): Promise<TicketData[]> {
    const groqKey = await secretService.getGroqApiKey();
    const modelName = API_CONFIG.GROQ_MODELS[0]; // Используем самую мощную модель как судью

    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    
    const prompt = `
      You are the ULTIMATE TICKET AUDITOR. Two other AI models have scanned this ticket and provided different results for some fields.
      
      DISPUTED DATA:
      Model 1: ${JSON.stringify(result1, null, 2)}
      Model 2: ${JSON.stringify(result2, null, 2)}
      
      YOUR TASK:
      1. Examine the ticket image with EXTREME precision.
      2. For every field where the models disagreed, you MUST decide which one is correct or find the true value yourself.
      3. Your goal is to provide the SINGLE, FINAL, AND MOST ACCURATE version of the flight data.
      4. DO NOT mention the conflict. DO NOT add notes. Just return the clean, corrected JSON array of objects.
      
      Follow the standard flight JSON format.
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    
    if (!content) return result1; // Fallback to first result
    return this.parseResponse(content);
  }

  private async executeMistralAnalysis(apiKey: string, imageUri: string): Promise<TicketData[]> {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
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
              { type: "text", text: this.getPrompt() },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    
    if (!content) return [];
    return this.parseResponse(content);
  }

  private async executeGroqAnalysis(apiKey: string, imageUri: string, modelName: string): Promise<TicketData[]> {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    
    // Проверяем, поддерживает ли модель vision
    const isVisionModel = modelName.includes('vision') || modelName.includes('scout') || modelName.includes('-vl');
    
    const requestBody: any = {
      model: modelName,
      temperature: 0.1
    };

    if (isVisionModel) {
      // Для vision-моделей используем массив content
      requestBody.messages = [
        {
          role: "user",
          content: [
            { type: "text", text: this.getPrompt() },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            }
          ]
        }
      ];
    } else {
      // Для обычных моделей используем строку (fallback на OCR через другой сервис)
      throw new Error('Модель не поддерживает vision. Используйте llama-3.2-90b-vision-preview или llama-3.2-11b-vision-preview');
    }
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[AiService] Groq API Error Response:', JSON.stringify(data, null, 2));
      throw new Error(`Groq API Error: ${data.error?.message || response.statusText}`);
    }

    const content = data.choices[0]?.message?.content;
    console.log(`[AiService] Received response from ${modelName}:`, content ? content.substring(0, 100) + '...' : 'EMPTY');
    if (!content) return [];
    
    try {
      return this.parseResponse(content);
    } catch (e) {
      console.warn(`[AiService] Failed to parse Groq (${modelName}) response:`, e);
      return [];
    }
  }

  private getPrompt(): string {
    return `
      Extract flight details from this ticket image.
      Return ONLY a JSON array of objects. 
      Fields: passengerName, airlineName, airlineCode, flightNumber, departureDate (YYYY-MM-DD), departureTime, departureCity, departureCountry, departureAirport (MANDATORY 3-letter IATA code, e.g., KIV, VIE, MUC), arrivalCity, arrivalCountry, arrivalAirport (MANDATORY 3-letter IATA code, e.g., VIE, IBZ, NCE), seat, serviceClass, bookingReference, operatingAirlineName, operatingAirlineCode.
      
      CRITICAL RULES:
      1. CODESHARE (Operated by): If you see "Operated by" and the operating airline is DIFFERENT from the selling airline, extract its name to "operatingAirlineName" and its code to "operatingAirlineCode". 
         - If the operating airline is the SAME as the selling airline (e.g., "Lufthansa LH 2274 (Operated by Lufthansa, LH)"), leave operatingAirlineName and operatingAirlineCode as null.
         - EXAMPLE: "Austrian Airlines OS 720 (Operated by Air Baltic, BT)" -> operatingAirlineName: "Air Baltic", operatingAirlineCode: "BT".
         - EXAMPLE: "Lufthansa LH 2274 (Operated by Lufthansa, LH)" -> operatingAirlineName: null, operatingAirlineCode: null.
         - EXAMPLE: "Lufthansa LH 4293 (Operated by Discover Airlines, 4Y)" -> operatingAirlineName: "Discover Airlines", operatingAirlineCode: "4Y".
      2. bookingReference (PNR): EXACTLY 6 alphanumeric characters. 
         - STRICT HIERARCHY: 
           1. If you see "RESERVATION CODE" or "AIRLINE RESERVATION CODE", you MUST take the code immediately following it. This is your ONLY source if present.
           2. ONLY if "RESERVATION CODE" is NOT present, look for: "PNR", "Booking ref", "Airline Ref".
         - CRITICAL: PNR is a random-looking code (e.g., WMWVTI, 7BQ62H). It is NEVER a substring of the passenger's name. If you extracted letters from the name (e.g., LAZORE from LAZORENKO), you FAILED.
         - WARNING: Copy EXACTLY. "8" is not "B", "0" is not "O". 
      3. operatedBy: ONLY fill "operatingAirlineName" and "operatingAirlineCode" if you see the EXACT phrase "Operated by" or "Carrier: [different airline]". 
         - If the ticket does not mention a different operating carrier, you MUST return null for both fields. 
         - NEVER invent or guess the operating airline (e.g., do not invent "Air Baltic" if it's not written).
      6. departureDate and departureTime: 
         - THE CURRENT YEAR IS 2026. 
         - LOOK for departure after the word "Departure" (e.g., "Departure: 22 May 15:40").
         - LOOK for arrival after the word "Arrival" (e.g., "Arrival: 22 May 17:10").
         - If a segment only lists day and month, you MUST use the year from the main header (2026).
      7. passengerName: Extract the FULL name. 
         - LOOK for markers: "Traveler", "Passenger Name", "Name:".
         - DO NOT take names from "Agency", "Address", or "Telephone" fields.
         - If the name contains a slash "/", replace it with a single SPACE. 
         - REMOVE titles/honorifics (MR, MRS, MS, MISS, MSTR).
         - DO NOT repeat the name. DO NOT concatenate name and surname into one word.
         - EXAMPLE: "Traveler Mrs Tetiana Ostrikova Chmeruk" -> return ONLY "Tetiana Ostrikova Chmeruk".
         - EXAMPLE: "LAZORENKO/TARAS MR" -> return ONLY "LAZORENKO TARAS". 
         - Be 100% accurate with every single letter.
      8. Return ONLY valid JSON.
    `;
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
      if (!Array.isArray(parsed)) {
        if (parsed.tickets) parsed = parsed.tickets;
        else parsed = [parsed];
      }

      return parsed.map((item: any) => {
        // Пост-обработка PNR: должен быть РОВНО 6 символов
        let pnr = item.bookingReference;
        if (pnr && typeof pnr === 'string') {
          pnr = pnr.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          if (pnr.length > 6) pnr = pnr.substring(0, 6);
          if (pnr.length < 5) pnr = null; // Слишком короткий — явная ошибка
        }
        return {
          ...item,
          bookingReference: pnr || item.bookingReference,
          rawJson: JSON.stringify(item, null, 2)
        };
      });
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      throw new Error("ИИ прислал данные в неверном формате. Попробуйте еще раз.");
    }
  }
}

export const aiService = new AiService();
