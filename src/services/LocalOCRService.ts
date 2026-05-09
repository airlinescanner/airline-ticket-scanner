import { TicketData } from '../types/ticket';

/**
 * Stubbed LocalOCRService to maintain compilation without MLKit.
 * Current implementation uses Cloud AI via ScanCoordinator.
 */
export class LocalOCRService {
  async recognize(imageUri: string): Promise<TicketData[]> {
    console.warn('Local OCR is disabled. Using Cloud AI.');
    return [];
  }
}

export const localOCRService = new LocalOCRService();
