import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * Результат OCR-распознавания
 */
export interface OCRResult {
  rawText: string;
  confidence: number;
}

/**
 * Ошибка OCR
 */
export interface OCRError {
  code: 'OCR_FAILED' | 'PERMISSION_DENIED' | 'LOW_QUALITY';
  message: string;
}

/**
 * OCRService - сервис для распознавания текста с изображений
 * 
 * Использует Google ML Kit Text Recognition (on-device)
 * Работает полностью офлайн, без отправки данных на сервер
 */
export class OCRService {
  /**
   * Распознать текст с изображения
   * 
   * @param imageUri - URI изображения (file://, content://, или base64)
   * @returns Promise с распознанным текстом и уровнем уверенности
   * @throws OCRError при ошибке распознавания
   */
  async recognizeText(imageUri: string): Promise<OCRResult> {
    try {
      // Проверка качества изображения (минимум 720p)
      // Примечание: эта проверка упрощённая, в реальном приложении нужно проверять размеры изображения
      if (!imageUri || imageUri.trim().length === 0) {
        throw this.createError('OCR_FAILED', 'Image URI is empty');
      }

      // Распознавание текста через ML Kit
      const result = await TextRecognition.recognize(imageUri);

      // Проверка, что текст был распознан
      if (!result || !result.text || result.text.trim().length === 0) {
        throw this.createError('LOW_QUALITY', 'No text recognized. Image may be blurry or low contrast.');
      }

      // Вычисление среднего уровня уверенности
      // ML Kit возвращает confidence для каждого блока текста
      const confidence = this.calculateAverageConfidence(result);

      return {
        rawText: result.text,
        confidence,
      };
    } catch (error: any) {
      // Обработка различных типов ошибок
      if (error.code) {
        // Уже OCRError
        throw error;
      }

      // Проверка на ошибку разрешений
      if (error.message && error.message.includes('permission')) {
        throw this.createError('PERMISSION_DENIED', 'Camera or storage permission denied');
      }

      // Общая ошибка OCR
      throw this.createError('OCR_FAILED', `OCR recognition failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Вычислить средний уровень уверенности из результата ML Kit
   */
  private calculateAverageConfidence(result: any): number {
    // ML Kit возвращает структуру с блоками текста
    // Каждый блок может иметь свой confidence
    if (!result.blocks || result.blocks.length === 0) {
      return 0.5; // Значение по умолчанию, если нет информации о confidence
    }

    let totalConfidence = 0;
    let count = 0;

    for (const block of result.blocks) {
      if (block.confidence !== undefined) {
        totalConfidence += block.confidence;
        count++;
      }
    }

    return count > 0 ? totalConfidence / count : 0.5;
  }

  /**
   * Создать объект ошибки OCR
   */
  private createError(code: OCRError['code'], message: string): OCRError {
    return {
      code,
      message,
    };
  }

  /**
   * Проверить качество изображения перед распознаванием
   * 
   * @param imageUri - URI изображения
   * @returns true если качество достаточное, false иначе
   */
  async checkImageQuality(imageUri: string): Promise<boolean> {
    // Примечание: это упрощённая проверка
    // В реальном приложении нужно проверять:
    // - Размеры изображения (минимум 720p)
    // - Контрастность
    // - Резкость (blur detection)
    
    try {
      // Пробуем распознать текст
      const result = await this.recognizeText(imageUri);
      
      // Если confidence низкий, качество недостаточное
      return result.confidence > 0.3;
    } catch (error: any) {
      if (error.code === 'LOW_QUALITY') {
        return false;
      }
      throw error;
    }
  }
}

// Singleton экземпляр
export const ocrService = new OCRService();
