import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from 'expo-file-system/legacy';
import { TicketData } from "../types/ticket";

// Исправил ключ (заменил l на I в конце)
const GEMINI_API_KEY = "AIzaSyBt3yHInwuViKOil6yQ-sZhSDdV_ZAIGfk";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export class GeminiService {
  async analyzeTicket(imageUri: string): Promise<TicketData[]> {
    try {
      // Используем прямое указание кодировки для стабильности
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Identify all flight segments from this airline ticket image.
        Extract the following information for EACH segment:
        - passengerName: Full name of the traveler (e.g. Mrs Tetiana Ostrikova Chmeruk)
        - airlineName: Full official name of the airline
        - airlineCode: 2-letter IATA code
        - flightNumber: Full flight number
        - departureDate: Date of departure in ISO 8601 format (YYYY-MM-DD). If year is missing, assume 2026.
        - departureTime: Time of departure in HH:mm format.
        - departureCity: Name of the departure city.
        - departureCountry: Name of the departure country.
        - departureAirport: 3-letter IATA code of departure airport.
        - arrivalAirport: 3-letter IATA code of arrival airport.
        - seat: Assigned seat number or null.
        - serviceClass: Class of service (Economy, Business, First).
        
        CRITICAL: Return ONLY a raw JSON array of objects. No markdown, no backticks, no extra text.
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

      const parsedData = JSON.parse(text);
      return parsedData.map((item: any) => ({
        ...item,
        rawJson: JSON.stringify(item, null, 2)
      }));

    } catch (error: any) {
      console.error("Gemini AI Error details:", error);
      throw new Error(`AI Analysis failed: ${error.message || 'Unknown error'}`);
    }
  }
}

export const geminiService = new GeminiService();
