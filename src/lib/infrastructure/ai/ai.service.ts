import { AIExtractedData } from '../../domain/entities/expense';

export interface AIProvider {
  name: string;
  extractExpenseData(imageBase64: string, mimeType: string): Promise<AIExtractedData>;
}

export class AIService {
  private providers: AIProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Providers will be added via addProvider method
  }

  addProvider(provider: AIProvider): void {
    this.providers.push(provider);
  }

  async extractExpenseData(imageBase64: string, mimeType: string): Promise<AIExtractedData> {
    if (this.providers.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        console.log(`Attempting AI extraction with provider: ${provider.name}`);
        const result = await provider.extractExpenseData(imageBase64, mimeType);
        console.log(`Successfully extracted data using provider: ${provider.name}`);
        return result;
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }
}
