import { AIProvider, getAIProviderConfig } from "../../config/ai-providers.ts";
import type { AIService } from "./AIService.interface.ts";

export class GeminiService implements AIService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(provider: AIProvider = "gemini") {
    const config = getAIProviderConfig(provider);
    console.log(`[GeminiService] Initialized with model: ${config.model} (v3 - MaxTokensFix)`);

    if (!config.apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    this.apiKey = config.apiKey;
    this.model = config.model;
    this.endpoint = config.endpoint;
  }

  async generateContent(prompt: string, systemPrompt?: string, _options?: { json?: boolean }): Promise<string> {
    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
              }
            ]
          }
        ],
        generation_config: {
          max_output_tokens: 16000, // Aumentado para evitar truncamiento
          temperature: 0.1
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async generateContentWithImage(
    prompt: string,
    base64Image: string,
    mimeType: string,
    systemPrompt?: string,
    _options?: { json?: boolean }
  ): Promise<string> {
    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generation_config: {
          max_output_tokens: 16000,
          temperature: 0.1
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}
