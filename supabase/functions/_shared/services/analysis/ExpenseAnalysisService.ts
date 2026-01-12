import type { AIResponse } from "../../types/analysis.types.ts";
import { OpenAIService } from "../ai/OpenAIService.ts";
import { GeminiService } from "../ai/GeminiService.ts";
import { getAIProvider } from "../../config/ai-providers.ts";

export class ExpenseAnalysisService {
  private aiService: OpenAIService | GeminiService;

  constructor() {
    const provider = getAIProvider();
    this.aiService = provider === "openai" ? new OpenAIService() : new GeminiService();
  }

  async analyzeExpenseFile(
    base64Content: string,
    mimeType: string,
    isPDF: boolean
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(isPDF);
    const prompt = this.getAnalysisPrompt(isPDF);

    let content: string;
    if (isPDF) {
      content = await this.aiService.generateContentWithImage(
        prompt,
        base64Content,
        mimeType,
        systemPrompt
      );
    } else {
      content = await this.aiService.generateContentWithImage(
        prompt,
        base64Content,
        mimeType,
        systemPrompt
      );
    }

    // Parse JSON response - improved handling for Gemini responses
    let cleanedContent = content;
    
    // Remove markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // Handle Gemini responses that include explanatory text before JSON
    // Look for JSON pattern in the response
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }
    
    // Also handle cases where JSON might be wrapped in quotes
    if (cleanedContent.startsWith('"') && cleanedContent.endsWith('"')) {
      cleanedContent = cleanedContent.slice(1, -1);
    }
    
    cleanedContent = cleanedContent.trim();
    
    try {
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Original content:", content);
      console.error("Cleaned content:", cleanedContent);
      
      // Return error structure if parsing fails
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
          explanation: "No se pudo interpretar la respuesta de la IA"
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

  private getSystemPrompt(isPDF: boolean): string {
    if (isPDF) {
      return `Eres un experto en analizar liquidaciones de expensas de Argentina. Tu tarea es extraer datos del ${isPDF ? 'PDF' : 'imagen'} y devolver ÚNICAMENTE JSON.

INSTRUCCIONES CRÍTICAS:
1. Analiza el contenido del ${isPDF ? 'PDF' : 'imagen'} que se proporciona
2. Extrae todos los datos visibles y legibles
3. Si no puedes leer algún campo, usa null
4. Devuelve ÚNICAMENTE JSON, sin texto explicativo antes o después
5. No incluyas frases como "Aquí está el JSON:" o similar
6. El JSON debe ser válido y completo

JSON requerido (devolver exactamente este formato):
{
  "building_name": "nombre del edificio o null",
  "period": "mes año o null",
  "period_month": número del mes o null,
  "period_year": año o null,
  "unit": "unidad funcional o null",
  "total_amount": monto total o 0,
  "categories": [
    {
      "name": "nombre categoría o null",
      "icon": "building",
      "current_amount": monto o 0,
      "status": "ok",
      "explanation": "descripción o null"
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": null,
    "city": null,
    "neighborhood": null,
    "zone": null,
    "unit_count_range": null,
    "age_category": null,
    "has_amenities": false,
    "amenities": []
  }
}

EJEMPLO VÁLIDO:
{"building_name":"Edificio Central","period":"Enero 2024","period_month":1,"period_year":2024,"unit":"UF 12","total_amount":15000,"categories":[{"name":"Expensas comunes","icon":"building","current_amount":15000,"status":"ok","explanation":"Gastos mensuales"}],"building_profile":{"country":"Argentina","province":null,"city":null,"neighborhood":null,"zone":null,"unit_count_range":null,"age_category":null,"has_amenities":false,"amenities":[]}}`;
    }

    return `PRIMERO: Describe qué ves en esta imagen en 1-2 frases.

SEGUNDO: Si es una liquidación de expensas, extrae los datos. Si no lo es o no puedes leer, devuelve JSON con valores null.

JSON requerido:
{
  "building_name": "nombre que veas o null",
  "period": "mes año que veas o null", 
  "period_month": número del mes o null,
  "period_year": año que veas o null,
  "unit": "unidad que veas o null",
  "total_amount": monto total que veas o 0,
  "categories": [
    {
      "name": "nombre categoría que veas o null",
      "icon": "building",
      "current_amount": monto que veas o 0,
      "status": "ok",
      "explanation": "descripción que veas o null"
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": null,
    "city": null,
    "neighborhood": null,
    "zone": null,
    "unit_count_range": null,
    "age_category": null,
    "has_amenities": false,
    "amenities": []
  }
}

DEVUELVE SOLO EL JSON. NADA DE TEXTO.`;
  }

  private getAnalysisPrompt(isPDF: boolean): string {
    if (isPDF) {
      return "Analizá este PDF de liquidación de expensas y extraé los datos estructurados:";
    }

    return "Analizá esta liquidación de expensas y extraé los datos estructurados:";
  }
}
