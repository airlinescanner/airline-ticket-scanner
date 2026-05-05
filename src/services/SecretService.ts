import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/ApiConfig';

const STORAGE_KEYS = {
  CUSTOM_API_KEY: 'custom_gemini_api_key',
};

/**
 * Сервис для управления секретами и настройками API
 */
export class SecretService {
  /**
   * Получить актуальный API ключ (пользовательский или системный)
   */
  async getApiKey(): Promise<string> {
    try {
      const customKey = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_API_KEY);
      return customKey || API_CONFIG.GEMINI_API_KEY;
    } catch (e) {
      return API_CONFIG.GEMINI_API_KEY;
    }
  }

  /**
   * Сохранить пользовательский API ключ
   */
  async setCustomApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_API_KEY, key);
  }

  /**
   * Удалить пользовательский ключ (вернуться к системному)
   */
  async resetApiKey(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CUSTOM_API_KEY);
  }
}

export const secretService = new SecretService();
