import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from 'expo-file-system/legacy';
import { TicketData } from "../types/ticket";
import { API_CONFIG } from "../config/ApiConfig";
import { secretService } from "./SecretService";

export class GeminiService {
  
  async analyzeTicket(imageUri: string): Promise<TicketData[]> {
    const apiKey = await secretService.getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    
    let lastError = null;

    for (const modelName of API_CONFIG.MODELS) {
      // Пробуем модель с 3 попытками (на случай ошибки 429)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[GeminiService] Attempt ${attempt} for model: ${modelName}`);
          const result = await this.executeAnalysis(genAI, modelName, imageUri);
          if (result) return result;
        } catch (error: any) {
          lastError = error;
          
          // Если это ошибка лимита (429), ждем и пробуем еще раз
          if (error.message?.includes('429') && attempt < 3) {
            console.warn(`[GeminiService] Rate limited. Waiting 2s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          // Если ключ неверный, выходим сразу
          if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('403')) {
            throw new Error("API Key Error: Ваш ключ недействителен.");
          }
          
          // В остальных случаях (404 и т.д.) пробуем следующую модель из списка
          break; 
        }
      }
    }

    throw lastError || new Error("Не удалось распознать билет. Попробуйте позже.");
  }

  private async executeAnalysis(genAI: any, modelName: string, imageUri: string): Promise<TicketData[]> {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Оставляем дефолтное поведение SDK
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Extract flight details from this ticket image.
      passengerName, airlineName, airlineCode, flightNumber, 
      departureDate (YYYY-MM-DD), departureTime, 
      departureCity, departureCountry, departureAirport, 
      arrivalCity, arrivalCountry, arrivalAirport, 
      seat, serviceClass, bookingReference.
      Return JSON array ONLY.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsedData = JSON.parse(text);
      return parsedData.map((item: any) => ({
        ...item,
        rawJson: JSON.stringify(item, null, 2)
      }));
    } catch (e) {
      throw new Error("AI returned invalid JSON.");
    }
  }
}

export const geminiService = new GeminiService();
