import type { AnalysisRequest, DeviationAnalysis } from "../../types/analysis.types.ts";
import { OpenAIService } from "../ai/OpenAIService.ts";
import { GeminiService } from "../ai/GeminiService.ts";
import { getAIProvider } from "../../config/ai-providers.ts";

export class DeviationAnalysisService {
  private aiService: OpenAIService | GeminiService;

  constructor() {
    const provider = getAIProvider();
    console.log("AI Provider configured:", provider);

    if (provider === "openai") {
      this.aiService = new OpenAIService();
    } else if (provider === "gemini") {
      this.aiService = new GeminiService();
    } else {
      // Default to Gemini for any other provider including "lovable"
      console.log("Defaulting to Gemini service for provider:", provider);
      this.aiService = new GeminiService();
    }
  }

  async analyzeDeviations(request: AnalysisRequest): Promise<{
    analysis?: string;
    deviation: DeviationAnalysis;
  }> {
    const deviation = this.calculateDeviations(request);
    const analysis = await this.generateDeviationAnalysis(request, deviation);

    return { analysis, deviation };
  }

  private calculateDeviations(request: AnalysisRequest): DeviationAnalysis {
    const userLatest = request.userTrend[request.userTrend.length - 1]?.percent || 0;
    const inflationLatest = request.inflationTrend[request.inflationTrend.length - 1]?.percent || 0;
    const buildingsLatest = request.buildingsTrend[request.buildingsTrend.length - 1]?.percent || 0;

    const deviationFromInflation = userLatest - inflationLatest;
    const deviationFromBuildings = userLatest - buildingsLatest;

    return {
      fromInflation: deviationFromInflation,
      fromBuildings: deviationFromBuildings,
      isSignificant: Math.abs(deviationFromInflation) > 5 || Math.abs(deviationFromBuildings) > 5
    };
  }

  private async generateDeviationAnalysis(
    request: AnalysisRequest,
    deviation: DeviationAnalysis
  ): Promise<string> {
    const systemPrompt = "Sos un asistente experto en análisis de expensas de consorcios en Argentina. Tus respuestas son concisas, claras y accionables.";

    const prompt = `Sos un experto analista financiero de expensas de consorcios en Argentina. Analiza los siguientes datos de evolución de expensas ${request.categoryName ? `específicamente para la categoría "${request.categoryName}"` : "globales"}:

**Edificio analizado:** ${request.buildingName}
${request.categoryName ? `**Categoría analizada:** ${request.categoryName}\n` : ""}

**Evolución de las expensas del usuario (% acumulado desde el primer período):**
${request.userTrend.map(t => `- ${t.period}: ${t.percent.toFixed(1)}%`).join("\n")}

**Evolución de la inflación argentina (% acumulado desde el primer período):**
${request.inflationTrend.map(t => `- ${t.period}: ${t.percent.toFixed(1)}%`).join("\n")}

**Evolución promedio de otros edificios en la plataforma (% acumulado):**
${request.buildingsTrend.map(t => `- ${t.period}: ${t.percent.toFixed(1)}%`).join("\n")}

**Desvío actual:**
- Respecto a inflación: ${deviation.fromInflation > 0 ? "+" : ""}${deviation.fromInflation.toFixed(1)} puntos porcentuales
- Respecto a otros edificios: ${deviation.fromBuildings > 0 ? "+" : ""}${deviation.fromBuildings.toFixed(1)} puntos porcentuales

Proporciona un análisis breve y accionable (máximo 3-4 oraciones) que:
1. Indique si el aumento de expensas está dentro de parámetros normales
2. Si hay desvío significativo (>5 puntos), explica posibles causas y qué verificar
3. Da una recomendación concreta si corresponde

Responde en español argentino, de forma clara y directa.`;

    try {
      return await this.aiService.generateContent(prompt, systemPrompt);
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMIT") {
        throw error;
      }
      console.error("Error generating deviation analysis:", error);
      return "No se pudo generar el análisis en este momento.";
    }
  }
}
