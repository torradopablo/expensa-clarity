export interface AIService {
  generateContent(prompt: string, systemPrompt?: string, options?: { json?: boolean }): Promise<string>;
  generateContentWithImage(prompt: string, base64Image: string, mimeType: string, systemPrompt?: string, options?: { json?: boolean }): Promise<string>;
}

export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}
