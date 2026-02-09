import { AIService } from "../ai/AIService.interface.ts";
import { OpenAIService } from "../ai/OpenAIService.ts";
import { GeminiService } from "../ai/GeminiService.ts";
import { getAIProvider, getAIProviderConfig } from "../../config/ai-providers.ts";

export class MeetingPrepService {
    private aiService: AIService;

    constructor() {
        // ALWAYS use OpenAI for meeting prep as requested by user
        const config = getAIProviderConfig("openai");
        if (!config.apiKey) {
            console.error("[MeetingPrepService] CRITICAL: OPENAI_API_KEY is not set in Supabase project secrets.");
            throw new Error("Configuración de AI incompleta (Falta API Key de OpenAI)");
        }

        this.aiService = new OpenAIService("openai");
    }

    async generateMeetingChecklist(data: {
        buildingName: string;
        analyses: any[];
        commentsByType: {
            owner: any[];
            shared: any[];
        };
    }): Promise<any> {
        console.log(`[MeetingPrepService] Processing ${data.buildingName} with ${data.analyses.length} periods.`);

        const systemPrompt = `Eres un asistente experto en consorcios y administración de edificios en Argentina. 
Tu tarea es generar un temario (checklist) de puntos críticos para una reunión de consorcio basado en los datos proporcionados.
REGLA CRÍTICA: Debes responder EXCLUSIVAMENTE con un objeto JSON válido. No incluyas texto antes o después. 
El JSON debe seguir la estructura solicitada estrictamente.`;

        const prompt = `Generá un temario estructurado para la reunión del consorcio "${data.buildingName}".
    
DATOS DE GASTOS Y ALERTAS:
${data.analyses.map(a => `- Período ${a.period}: Total ${a.total_amount}. 
  Alertas detectadas: ${a.categories?.filter((c: any) => c.status !== 'ok').map((c: any) => `${c.name} (${c.status}): ${c.explanation || 'Sin notas'}`).join('; ') || 'Ninguna'}`).join('\n')}

COMENTARIOS Y RECLAMOS DE PROPIETARIOS (Links Compartidos):
${data.commentsByType.shared.length > 0
                ? data.commentsByType.shared.map(c => `- ${c.author_name} (Sobre expensa de ${c.period || 'General'}): "${c.comment}"`).join('\n')
                : "No hay comentarios externos."}

NOTAS DEL ADMINISTRADOR:
${data.analyses.map(a => `- ${a.period}: ${a.owner_notes || 'Sin notas adicionales'}`).join('\n')}

INSTRUCCIONES DE SALIDA (JSON):
- Identificá aumentos fuertes, reclamos de vecinos y temas de mantenimiento.
- Los IDs de los items deben ser únicos (ej: item_1, item_2...).
- IMPORTANTE: "importance" debe ser: "high", "medium" o "low".
- IMPORTANTE: "category" debe ser: "Mantenimiento", "Servicios", "Sueldos", "Administrativo" o "General".

ESTRUCTURA DE SALIDA:
{
  "title": "Temario Reunión de Consorcio - ${data.buildingName}",
  "items": [
    {
      "id": string,
      "category": string,
      "title": string,
      "description": string,
      "source": string,
      "importance": string
    }
  ]
}`;

        try {
            const content = await this.aiService.generateContent(prompt, systemPrompt, { json: true });
            let cleaned = content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }

            const parsed = JSON.parse(cleaned);
            if (!parsed.items || !Array.isArray(parsed.items)) {
                throw new Error("Formato de respuesta de IA inválido: falta array 'items'");
            }
            return parsed;
        } catch (error) {
            console.error("[MeetingPrepService] Error en generación o parsing:", error);
            throw error;
        }
    }
}
