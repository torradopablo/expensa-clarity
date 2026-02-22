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
        data.categories.forEach((cat: any) => {
          if (cat.subcategories && Array.isArray(cat.subcategories) && cat.subcategories.length > 0) {
            const subSum = cat.subcategories.reduce((sum: number, sub: any) => sum + (Number(sub.amount) || 0), 0);

            // If subcategories sum is different from category amount, we trust the subcategories (more granular)
            if (subSum > 0 && Math.abs(subSum - cat.current_amount) > 1) {
              console.warn(`Adjusting category ${cat.name} amount from ${cat.current_amount} to ${subSum} for consistency with subcategories.`);
              cat.current_amount = subSum;
            }
          }
        });

        const categoriesSum = data.categories.reduce((sum: number, cat: any) => sum + (Number(cat.current_amount) || 0), 0);

        // If the sum of categories is significantly different (> 10%) from the total_amount,
        // we prioritize the sum of categories as it's the more detailed data source.
        if (categoriesSum > 0 && Math.abs(categoriesSum - data.total_amount) > (data.total_amount * 0.1)) {
          console.warn(`Programmatically adjusting total_amount from ${data.total_amount} to ${categoriesSum} for consistency.`);
          data.total_amount = categoriesSum;
        }
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
2. Los montos deben ser números positivos.
3. El JSON debe ser válido y completo.
4. CONSISTENCIA MATEMÁTICA (CRUCIAL): La suma de las categorías DEBE ser igual al "total_amount". Además, la suma de los montos de las subcategorías DEBE ser exactamente igual al "current_amount" de su categoría padre.
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
8. IMPORTANTE - CLASIFICACIÓN DE GASTOS (NUEVO):
   - Cada subcategoría DEBE tener un "expense_type" estrictamente limitado a: "ordinaria", "extraordinaria", o "fondo_reserva".
   - CRITERIOS PARA ARGENTINA:
     - "ordinaria": Gastos recurrentes de mantenimiento, sueldos, cargas sociales, abonos de servicios (ascensores, limpieza), reparaciones menores, seguros obligatorios, papelería.
     - "extraordinaria": Reparaciones estructurales grandes (fachada, cañería principal), reemplazo de bienes de capital (bombas nuevas, cámaras), indemnizaciones laborales por despido, juicios del consorcio.
     - "fondo_reserva": Ahorro mensual o cuota para futuros gastos.
     - REGLA DE ORO: Si no estás seguro, marca como "ordinaria". Prioriza "extraordinaria" solo si el documento lo menciona explícitamente o es un gasto claramente no recurrente de gran impacto estructural.
9. IMPORTANTE: Si se proporciona una GUÍA DE CATEGORÍAS PREVIAS, intenta mapear los gastos encontrados a esos nombres exactos si representan el mismo concepto.

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
      "explanation": string o null,
      "subcategories": [
        {
          "name": string,
          "amount": number,
          "percentage": number (0-100),
          "expense_type": "ordinaria" | "extraordinaria" | "fondo_reserva"
        }
      ] (mínimo 3 sub-ítems si existen, máximo 10)
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
    return "Analizá esta liquidación de expensas y extraé los datos estructurados en JSON. ADVERTENCIA: No confundas el nombre de la ADMINISTRACIÓN (ej: quien liquida) con el nombre del CONSORCIO/EDIFICIO (ej: la dirección o nombre del inmueble). Es CRÍTICO extraer el nombre correcto para el historial del usuario:";
  }
}
