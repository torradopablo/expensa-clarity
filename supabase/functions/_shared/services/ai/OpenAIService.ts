import type { AIService, AIRequestOptions } from "./AIService.interface.ts";
import { getAIProviderConfig } from "../../config/ai-providers.ts";

export class OpenAIService implements AIService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor() {
    const config = getAIProviderConfig("openai");
    this.apiKey = config.apiKey!;
    this.model = config.model;
    this.endpoint = config.endpoint;
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt || "" },
          { role: "user", content: prompt }
        ],
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async generateContentWithImage(
    prompt: string, 
    base64Image: string, 
    mimeType: string, 
    systemPrompt?: string
  ): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt || ""
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}
