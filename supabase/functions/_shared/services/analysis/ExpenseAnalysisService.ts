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
    isPDF: boolean,
    previousCategories: string[] = [],
    existingBuildingNames: string[] = []
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(isPDF, previousCategories, existingBuildingNames);
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
    text: string,
    previousCategories: string[] = [],
    existingBuildingNames: string[] = []
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(true, previousCategories, existingBuildingNames);

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
      const data = JSON.parse(cleanedContent.trim());

      // Ensure mathematical consistency programmatically
      if (data.categories && Array.isArray(data.categories)) {
        const categoriesSum = data.categories.reduce((sum: number, cat: any) => sum + (Number(cat.current_amount) || 0), 0);

        // If the sum of categories is significantly different (> 10%) from the total_amount,
        // we prioritize the sum of categories as it's the more detailed data source.
        // This handles cases where total_amount is the "Unit Total" but categories are "Building Total".
        if (categoriesSum > 0 && Math.abs(categoriesSum - data.total_amount) > (data.total_amount * 0.1)) {
          console.warn(`Programmatically adjusting total_amount from ${data.total_amount} to ${categoriesSum} for consistency.`);
          data.total_amount = categoriesSum;
        }

        // Sanitize subcategory amounts to ensure they're non-negative
        data.categories.forEach((cat: any) => {
          if (cat.subcategories && Array.isArray(cat.subcategories)) {
            cat.subcategories.forEach((sub: any) => {
              if (typeof sub.amount === 'number' && sub.amount < 0) {
                console.warn(`Found negative subcategory amount: ${sub.amount} for "${sub.name}" in category "${cat.name}". Converting to positive.`);
                sub.amount = Math.abs(sub.amount);
              }
            });
          }
        });
      }

      return data;
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

  private getSystemPrompt(
    isPDF: boolean | string,
    previousCategories: string[] = [],
    existingBuildingNames: string[] = []
  ): string {
    const categoriesGuide = previousCategories.length > 0
      ? `\nGUÍA DE CATEGORÍAS PREVIAS (Usa estos nombres si el concepto es el mismo):
${previousCategories.map(c => `- ${c}`).join('\n')}\n`
      : "";

    const buildingGuide = existingBuildingNames.length > 0
      ? `\nGUÍA DE EDIFICIOS EXISTENTES (Si el edificio es uno de estos, usa el nombre EXACTO):
${existingBuildingNames.map(b => `- ${b}`).join('\n')}\n`
      : "";

    return `Eres un experto en liquidaciones de expensas argentinas. Devuelve ÚNICAMENTE JSON plano.
No incluyas explicaciones externas al JSON. 
Si hay muchas categorías, sé breve en las descripciones.
${buildingGuide}${categoriesGuide}
REGLAS CRÍTICAS DE NEGOCIO:
1. El campo "status" en cada categoría DEBE ser estrictamente uno de estos: "ok", "attention", "info".
2. Los montos deben ser números positivos (mayores o iguales a 0). NUNCA negativos.
3. El JSON debe ser válido y completo.
4. CONSISTENCIA MATEMÁTICA (CRUCIAL): La suma de las categorías DEBE ser igual al "total_amount". 
   - A veces el documento muestra el "Total del Consorcio" (millones) y el "Total por Unidad" (miles). 
   - Debes elegir UNA escala: Si las categorías son del Consorcio, el "total_amount" DEBE ser el total del Consorcio. 
   - NUNCA mezcles categorías de millones con un total de miles. Si el total por unidad es $127.000 pero los gastos suman $14.000.000, el "total_amount" DEBE ser $14.000.000.
6. IMPORTANTE - IDENTIFICACIÓN DEL EDIFICIO (ESTRATEGIA ARGEN-HEADER):
   - UBICACIÓN PREFERENTE: El nombre real suele estar ARRIBA de todo, a menudo centrado o a la izquierda.
   - PATRONES COMUNES: 
     a) "CONSORCIO [DIRECCIÓN]" (Ej: CONSORCIO CALLAO 1540) -> El nombre es "Callao 1540".
     b) "CONSORCIO DE PROPIETARIOS DEL EDIFICIO [NOMBRE]" -> Usa el [NOMBRE].
     c) Solo la dirección: "CALLE NUMERO, Ciudad" -> Usa "Calle Numero".
   - CUIT DEL EDIFICIO: Casi siempre hay un CUIT (30-... o 33-...) cerca del nombre del consorcio. Úsalo como ancla. El CUIT de la administración suele estar en el pie de página o en un recuadro separado de "Datos del Administrador".
   - REGLA DE EXCLUSIÓN TOTAL: Si un nombre está asociado a "Administración", "Administradora", "Adm.", "Estudio", "Adms. de Inmuebles" o "Liquidó", ESE NO ES EL EDIFICIO. 
     - Ej: Si dice "Administración Los Robles" y abajo "CONSORCIO RIVADAVIA 500", el edificio es "Rivadavia 500".
     - Si dice "Estudio Jurídico Pérez" en grande, ignóralo y busca el nombre del consorcio.
   - Si se proporciona una GUÍA DE EDIFICIOS EXISTENTES, prioriza esos nombres si hay un match parcial (ej: el PDF dice "Arenales 10" y la guía dice "Arenales 10 - Torre A").
   - IMPORTANTE: Si solo encuentras una dirección, ese ES el nombre del edificio. No inventes nombres si no están.


8. SUBCATEGORÍAS (DETALLE - OBLIGATORIO SI EXISTE):
   - BUSCA ACTIVAMENTE el desglose de cada rubro.
   - Ejemplos típicos:
     - "Sueldos y Cargas Sociales": "Sueldo Encargado", "Sueldo Ayudante", "Cargas Sociales 931", "Suterh".
     - "Servicios Públicos": "AySA", "Edesur", "Metrogas".
     - "Mantenimiento": "Abono Ascensores", "Limpieza Tanques", "Fumigación".
   - Si encuentras estos ítems detallados con sus montos, agrégalos al array "subcategories".
   - La suma de las subcategorías debe coincidir con el monto de la categoría.
   - CRÍTICO: Los montos de las subcategorías SIEMPRE deben ser positivos (>= 0). NUNCA negativos.

JSON Schema (Ejemplo de estructura esperada):
{
  "building_name": "Edificio Ejemplo",
  "period": "Enero 2024",
  ...
  "categories": [
    {
      "name": "Sueldos y Cargas Sociales",
      "current_amount": 1500000,
      "status": "ok",
      "subcategories": [
        { "name": "Sueldo Encargado", "amount": 800000 },
        { "name": "Cargas Sociales F931", "amount": 400000 },
        { "name": "Suterh", "amount": 300000 }
      ]
    },
    {
      "name": "Abonos de Mantenimiento",
      "current_amount": 200000,
      "status": "ok",
      "subcategories": [
        { "name": "Ascensores", "amount": 150000 },
        { "name": "Bombas", "amount": 50000 }
      ]
    }
  ],
  ...
}`;
  }

  private getAnalysisPrompt(isPDF: boolean): string {
    return "Analizá esta liquidación de expensas y extraé los datos estructurados en JSON. ADVERTENCIA: No confundas el nombre de la ADMINISTRACIÓN (ej: quien liquida) con el nombre del CONSORCIO/EDIFICIO (ej: la dirección o nombre del inmueble). Es CRÍTICO extraer el nombre correcto para el historial del usuario:";
  }
}
