import type { AIService } from "./AIService.interface.ts";
import { getAIProviderConfig } from "../../config/ai-providers.ts";

export class GeminiService implements AIService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor() {
    const config = getAIProviderConfig("gemini");
    console.log("Gemini config:", { 
      hasApiKey: !!config.apiKey, 
      model: config.model, 
      endpoint: config.endpoint 
    });
    
    if (!config.apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.endpoint = config.endpoint;
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
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
        generationConfig: {
          maxOutputTokens: 2500,
          temperature: 0.1,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
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
    systemPrompt?: string
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
        generationConfig: {
          maxOutputTokens: 2500,
          temperature: 0.1,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      const errorText = await response.text();
      throw new Error(`Gemini error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}
