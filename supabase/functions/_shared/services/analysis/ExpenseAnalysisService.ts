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

      // Ensure subcategory sums match their parent category (granular data takes precedence)
      if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach((cat: any) => {
          if (cat.subcategories && Array.isArray(cat.subcategories) && cat.subcategories.length > 0) {
            const subSum = cat.subcategories.reduce((sum: number, sub: any) => sum + (Number(sub.amount) || 0), 0);
            if (subSum > 0 && Math.abs(subSum - cat.current_amount) > 1) {
              console.warn(`Adjusting category ${cat.name} from ${cat.current_amount} to ${subSum}`);
              cat.current_amount = subSum;
            }
          }
        });

        // NOTE: We intentionally do NOT override total_amount with the categories sum.
        // If they diverge significantly it means the AI mixed scales (unit vs consorcio).
        // Log it for debugging but trust the AI's explicit total_amount field.
        const categoriesSum = data.categories.reduce((sum: number, cat: any) => sum + (Number(cat.current_amount) || 0), 0);
        if (categoriesSum > 0 && Math.abs(categoriesSum - data.total_amount) > (data.total_amount * 0.15)) {
          console.warn(`WARNING: categories sum (${categoriesSum}) differs >15% from total_amount (${data.total_amount}). Possible scale mix-up in AI response.`);
        }
      }

      return data;
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Cleaned content length:", cleanedContent.length);
      console.error("Original content length:", content.length);

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
      ? `\nGUÍA DE CATEGORÍAS PREVIAS (Usa estos nombres si el concepto es el mismo):\n${previousCategories.map(c => `- ${c}`).join('\n')}\n`
      : "";

    const buildingGuide = existingBuildingNames.length > 0
      ? `\nGUÍA DE EDIFICIOS EXISTENTES (Si el edificio es uno de estos, usa el nombre EXACTO):\n${existingBuildingNames.map(b => `- ${b}`).join('\n')}\n`
      : "";

    return `Eres un experto en liquidaciones de expensas argentinas. Devuelve ÚNICAMENTE JSON plano sin texto adicional.
${buildingGuide}${categoriesGuide}
═══════════════════════════════════════════════════════════════
REGLA 1 — TOTAL DEL CONSORCIO vs TOTAL POR UNIDAD (CRÍTICO)
═══════════════════════════════════════════════════════════════
Las expensas argentinas muestran DOS totales distintos:
  • "Total del Consorcio" o "Total General": suma de TODO el edificio (ej: $14.500.000)
  • "Total por Unidad" o "Tu expensa" o "Importe a pagar": lo que paga UN departamento (ej: $127.000)

REGLA DE ORO: Debes extraer el TOTAL DEL CONSORCIO (no el de la unidad).
  - El campo "total_amount" SIEMPRE debe ser el total del consorcio completo.
  - Las categorías (Personal, Mantenimiento, etc.) también deben ser del consorcio.
  - El campo "unit" es el número de unidad funcional (ej: "3B") si aparece.
  - NUNCA reportes el importe por unidad como total_amount.
  ✓ CORRECTO: total_amount = 14.500.000 (aunque la expensa de la unidad sea $127.000)
  ✗ INCORRECTO: total_amount = 127.000

Para identificar cuál es cuál:
  - El total del consorcio suele estar en la página de detalle general, en mayúsculas: "TOTAL GENERAL", "TOTAL CONSORCIO"
  - El total por unidad suele decir: "Total a pagar", "Importe", "Deuda", "Su expensa", y es proporcional al coeficiente de la unidad

═══════════════════════════════════════════════════════════════
REGLA 2 — NOMBRE DEL EDIFICIO
═══════════════════════════════════════════════════════════════
  - El edificio es el CONSORCIO, no quien lo administra.
  - Busca: "CONSORCIO [DIRECCIÓN]", "CONSORCIO DE PROPIETARIOS", la dirección del inmueble.
  - EXCLUIR: cualquier nombre asociado a "Administración", "Adm.", "Estudio", "Liquidó", "Responsable".
  - Si hay GUÍA DE EDIFICIOS EXISTENTES, prioriza el nombre exacto si hay coincidencia parcial.

═══════════════════════════════════════════════════════════════
REGLA 3 — ADMINISTRADOR Y CUIT (MOTOR DE AHORRO — MUY IMPORTANTE)
═══════════════════════════════════════════════════════════════
FORMATO CUIT/CUIL EN ARGENTINA:
  Estructura: XX-XXXXXXXX-X (11 dígitos con guiones)
  Prefijos: 20-, 23-, 24-, 27- (personas físicas) | 30-, 33-, 34- (empresas)
  Puede aparecer SIN guiones (ej: 30123456789) → formatealo igual como 30-12345678-9
  Etiquetas en el doc: "CUIT:", "C.U.I.T.:", "CUIL:", "Nro. CUIT", "C.U.I.T. Nro."

A) ADMINISTRADOR — Buscá en ESTAS zonas del documento:
   1. ENCABEZADO: nombre de la administradora/estudio junto al logo arriba del todo
   2. PIE DE PÁGINA: frase típica "Liquidó: [Nombre] CUIT XX-XXXXXXXX-X tel: XXXX"
   3. RECUADRO "Datos del Administrador" o sección "Administración"
   4. Junto a palabras clave: "Administra:", "Adm.:", "Estudio Adm.", "Responsable:", "Liquidó por:"

   → Si encontrás cualquier nombre de administrador/estudio, SIEMPRE ponelo en "administrator_name".
   → NO lo dejes null aunque no tengas el CUIT. El nombre es suficiente para el motor de ahorro.
   → Si hay teléfono, email o dirección junto al nombre del admin, extraelos también.

B) PROVEEDORES — Para cada línea de gasto identificá:
   1. Nombre de empresa junto al concepto (ej: "Ascensores ABC S.A.", "METROGAS", "EDESUR")
   2. CUIT en la misma línea, en detalle de comprobante o referencia de factura
   3. Referencia: "FC A 0001-00012345 CUIT 30-12345678-9" o similar

   → Si hay nombre de proveedor sin CUIT, igual ponelo en "provider_name".
   → "provider_type": "ascensores" | "limpieza" | "seguridad" | "seguro" | "gas" | "electricidad" | "agua" | "mantenimiento" | "administracion" | "personal" | "contable_legal" | "otros"

C) DIRECCIÓN DEL EDIFICIO: "building_address" = dirección completa del consorcio (ej: "Av. Corrientes 1234, CABA")

═══════════════════════════════════════════════════════════════
REGLA 4 — CLASIFICACIÓN DE GASTOS
═══════════════════════════════════════════════════════════════
expense_type por subcategoría:
  "ordinaria": sueldos, cargas sociales, abonos fijos, servicios recurrentes, seguros, reparaciones menores
  "extraordinaria": obras estructurales, reemplazo de equipos, indemnizaciones, juicios
  "fondo_reserva": ahorro o cuota de reserva explícita
  → Default: "ordinaria" si hay duda.

═══════════════════════════════════════════════════════════════
REGLA 5 — STATUS DE CATEGORÍAS
═══════════════════════════════════════════════════════════════
"status" DEBE ser uno de: "ok", "attention", "info"
Subcategorías: extrae ABSOLUTAMENTE TODAS, sin límite de cantidad.

JSON Schema a devolver:
{
  "building_name": string,
  "building_address": string | null,
  "period": string,
  "period_month": number (1-12),
  "period_year": number (YYYY),
  "unit": string | null,
  "total_amount": number,
  "categories": [
    {
      "name": string,
      "icon": string,
      "current_amount": number,
      "status": "ok" | "attention" | "info",
      "explanation": string | null,
      "subcategories": [
        {
          "name": string,
          "amount": number,
          "percentage": number,
          "expense_type": "ordinaria" | "extraordinaria" | "fondo_reserva",
          "provider_name": string | null,
          "provider_cuit": string | null,
          "provider_type": string | null,
          "cuit_confirmed": boolean
        }
      ]
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": string | null,
    "city": string | null,
    "neighborhood": string | null,
    "zone": "CABA" | "GBA Norte" | "GBA Oeste" | "GBA Sur" | "Interior" | null,
    "unit_count_range": "1-10" | "11-30" | "31-50" | "51-100" | "100+" | null,
    "age_category": string | null,
    "has_amenities": boolean,
    "amenities": string[]
  },
  "administrator_name": string | null,
  "administrator_cuit": string | null,
  "administrator_cuit_confirmed": boolean,
  "administrator_contact_phone": string | null,
  "administrator_contact_email": string | null,
  "administrator_contact_address": string | null
}`;
  }

  private getAnalysisPrompt(isPDF: boolean): string {
    return "Analizá esta liquidación de expensas y extraé los datos estructurados en JSON. ADVERTENCIA: No confundas el nombre de la ADMINISTRACIÓN (ej: quien liquida) con el nombre del CONSORCIO/EDIFICIO (ej: la dirección o nombre del inmueble). Es CRÍTICO extraer el nombre correcto para el historial del usuario:";
  }
}
