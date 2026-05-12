import * as ImageManipulator from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { withTimeout } from '../utils/networkUtils';

export interface OCRResult {
  rawText: string;
  confidence: number;
  blocks?: any[]; // Для передачи координат в AI
}

export interface OCRError {
  code: 'OCR_FAILED' | 'PERMISSION_DENIED' | 'LOW_QUALITY';
  message: string;
}

export class OCRService {
  /**
   * Подготавливает изображение для ИИ: оптимизирует размер и качество.
   */
  async prepareImageForOcr(imageUri: string): Promise<string> {
    try {
      console.log('[OCRService] Pre-processing image (Optimizing resolution for laptop screen)...');
      
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1600 } } // Увеличиваем до 1600 для лучшего распознавания мелкого текста
        ],
        { 
          compress: 0.9, // Меньше сжатия - больше деталей
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      return result.uri;
    } catch (error) {
      console.error('[OCRService] Pre-processing failed:', error);
      return imageUri;
    }
  }

  /**
   * Локальное распознавание текста через ML Kit (On-device)
   */
  async recognizeText(imageUri: string): Promise<OCRResult> {
    try {
      console.log('[OCRService] Running local ML Kit OCR...');
      const result = await withTimeout(
        TextRecognition.recognize(imageUri),
        15000,
        'OCR recognition timed out'
      );
      
      return {
        rawText: result.text,
        confidence: 0.95, // ML Kit обычно очень точен на тексте
        blocks: result.blocks
      };
    } catch (error) {
      console.error('[OCRService] Local OCR failed:', error);
      return {
        rawText: '',
        confidence: 0,
      };
    }
  }

  async checkImageQuality(imageUri: string): Promise<boolean> {
    // В будущем тут можно добавить проверку на размытость через OpenCV
    return true;
  }
}

export const ocrService = new OCRService();
