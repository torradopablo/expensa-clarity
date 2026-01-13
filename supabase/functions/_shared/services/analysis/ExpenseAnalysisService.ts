import type { AIProvider } from "../../config/ai-providers.ts";
import type { AIResponse } from "../../types/analysis.types.ts";
import { OpenAIService } from "../ai/OpenAIService.ts";
import { GeminiService } from "../ai/GeminiService.ts";
import { getAIProvider } from "../../config/ai-providers.ts";

export class ExpenseAnalysisService {
  private aiService: OpenAIService | GeminiService;

  constructor() {
    const provider = getAIProvider();
    console.log(`Initializing ExpenseAnalysisService with provider: ${provider}`);

    if (provider === "lovable" || provider === "openai") {
      this.aiService = new OpenAIService(provider);
    } else {
      this.aiService = new GeminiService(provider);
    }
  }

  async analyzeExpenseFile(
    base64Content: string,
    mimeType: string,
    isPDF: boolean
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(isPDF);
    const prompt = this.getAnalysisPrompt(isPDF);

    const content = await this.aiService.generateContentWithImage(
      prompt,
      base64Content,
      mimeType,
      systemPrompt
    );

    return this.parseAIResponse(content);
  }

  async analyzeExpenseText(
    text: string
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(true);

    // Protection against extremely large texts
    const truncatedText = text.length > 80000 ? text.substring(0, 80000) + "..." : text;

    const prompt = `Analizá esta liquidación de expensas (texto extraído por OCR). 
Tarea: Limpia errores de lectura, identifica montos (puntos/comas) y extrae los datos JSON.

TEXTO:
"""
${truncatedText}
"""

REGLAS DE SALIDA:
1. Devuelve ÚNICAMENTE el código JSON.
2. Sé conciso en el campo "explanation" de cada categoría para ahorrar espacio.
3. Asegurate de que el JSON esté completo y cierre correctamente.`;

    const content = await this.aiService.generateContent(
      prompt,
      systemPrompt
    );

    return this.parseAIResponse(content);
  }

  private parseAIResponse(content: string): AIResponse {
    let cleanedContent = content;

    // Log for debugging (truncated in console/logs is normal but helps see the start)
    console.log(`AI Response start: ${content.substring(0, 200)}...`);

    cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    if (cleanedContent.startsWith('"') && cleanedContent.endsWith('"')) {
      cleanedContent = cleanedContent.slice(1, -1);
    }

    try {
      return JSON.parse(cleanedContent.trim());
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Cleaned content length:", cleanedContent.length);
      console.error("Original content length:", content.length);

      // Fallback for truncated JSON - try to close it if it ends abruptly (very basic attempt)
      if (cleanedContent.lastIndexOf('}') < cleanedContent.lastIndexOf('{')) {
        console.warn("JSON seems truncated, attempt to return partial or error.");
      }

      return {
        building_name: "Error en parsing",
        period: "Error",
        period_month: 1,
        period_year: 2024,
        unit: undefined,
        total_amount: 0,
        categories: [{
          name: "Error",
          icon: "alert",
          current_amount: 0,
          status: "attention",
          explanation: "La respuesta de la IA fue demasiado larga o se cortó."
        }],
        building_profile: {
          country: "Argentina",
          province: null,
          city: null,
          neighborhood: null,
          zone: null,
          unit_count_range: null,
          age_category: null,
          has_amenities: false,
          amenities: []
        }
      };
    }
  }

  private getSystemPrompt(isPDF: boolean | string): string {
    return `Eres un experto en liquidaciones de expensas argentinas. Devuelve ÚNICAMENTE JSON plano.
No incluyas explicaciones externas al JSON. 
Si hay muchas categorías, sé breve en las descripciones.

REGLAS CRÍTICAS DE NEGOCIO:
1. El campo "status" en cada categoría DEBE ser estrictamente uno de estos: "ok", "attention", "info".
2. Los montos deben ser números positivos.
3. El JSON debe ser válido y completo.

JSON Schema:
{
  "building_name": string,
  "period": string,
  "period_month": number (1-12),
  "period_year": number (YYYY),
  "unit": string o null,
  "total_amount": number,
  "categories": [
    {
      "name": string,
      "icon": string (use Lucide icon name),
      "current_amount": number,
      "status": "ok" | "attention" | "info",
      "explanation": string o null
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": string o null,
    "city": string o null,
    "neighborhood": string o null,
    "zone": "CABA" | "GBA Norte" | "GBA Oeste" | "GBA Sur" | "Interior" | null,
    "unit_count_range": "1-10" | "11-30" | "31-50" | "51-100" | "100+" | null,
    "age_category": string o null,
    "has_amenities": boolean,
    "amenities": string[]
  }
}`;
  }

  private getAnalysisPrompt(isPDF: boolean): string {
    return "Analizá esta liquidación de expensas y extraé los datos estructurados en JSON:";
  }
}
