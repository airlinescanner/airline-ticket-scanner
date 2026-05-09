/**
 * Stubbed OCRService to maintain compilation without MLKit.
 * Current implementation uses Cloud AI via ScanCoordinator.
 */
export interface OCRResult {
  rawText: string;
  confidence: number;
}

export interface OCRError {
  code: 'OCR_FAILED' | 'PERMISSION_DENIED' | 'LOW_QUALITY';
  message: string;
}

export class OCRService {
  async recognizeText(imageUri: string): Promise<OCRResult> {
    console.warn('Local OCR is disabled. Using Cloud AI.');
    return {
      rawText: 'Local OCR disabled',
      confidence: 1.0,
    };
  }

  async checkImageQuality(imageUri: string): Promise<boolean> {
    return true;
  }
}

export const ocrService = new OCRService();
