import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/ApiConfig';

const STORAGE_KEYS = {
  CUSTOM_API_KEY: 'custom_gemini_api_key',
  GROQ_API_KEY: 'custom_groq_api_key',
  MISTRAL_API_KEY: 'custom_mistral_api_key',
  TAVILY_API_KEY: 'custom_tavily_api_key',
};

/**
 * Сервис для управления секретами и настройками API
 */
export class SecretService {
  /**
   * Получить Gemini API ключ
   */
  async getGeminiApiKey(): Promise<string> {
    try {
      const customKey = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_API_KEY);
      return customKey || API_CONFIG.GEMINI_API_KEY;
    } catch (e) {
      return API_CONFIG.GEMINI_API_KEY;
    }
  }

  /**
   * Получить Groq API ключ
   */
  async getGroqApiKey(): Promise<string> {
    try {
      const customKey = await AsyncStorage.getItem(STORAGE_KEYS.GROQ_API_KEY);
      return customKey || API_CONFIG.GROQ_API_KEY;
    } catch (e) {
      return API_CONFIG.GROQ_API_KEY;
    }
  }

  /**
   * Получить Mistral API ключ
   */
  async getMistralApiKey(): Promise<string> {
    try {
      const customKey = await AsyncStorage.getItem(STORAGE_KEYS.MISTRAL_API_KEY);
      return customKey || API_CONFIG.MISTRAL_API_KEY;
    } catch (e) {
      return API_CONFIG.MISTRAL_API_KEY;
    }
  }

  /**
   * Получить Tavily API ключ
   */
  async getTavilyApiKey(): Promise<string> {
    try {
      const customKey = await AsyncStorage.getItem(STORAGE_KEYS.TAVILY_API_KEY);
      return customKey || API_CONFIG.TAVILY_API_KEY;
    } catch (e) {
      return API_CONFIG.TAVILY_API_KEY;
    }
  }

  /**
   * Сохранить пользовательский API ключ
   */
  async setCustomApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_API_KEY, key);
  }

  /**
   * Сохранить Groq API ключ
   */
  async setGroqApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GROQ_API_KEY, key);
  }

  /**
   * Сохранить Mistral API ключ
   */
  async setMistralApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MISTRAL_API_KEY, key);
  }

  /**
   * Сохранить Tavily API ключ
   */
  async setTavilyApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TAVILY_API_KEY, key);
  }

  /**
   * Удалить пользовательский ключ (вернуться к системному)
   */
  async resetApiKey(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CUSTOM_API_KEY);
  }

  /**
   * Удалить все пользовательские ключи
   */
  async resetAllApiKeys(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.GROQ_API_KEY,
      STORAGE_KEYS.MISTRAL_API_KEY,
      STORAGE_KEYS.TAVILY_API_KEY,
    ]);
  }
}

export const secretService = new SecretService();
