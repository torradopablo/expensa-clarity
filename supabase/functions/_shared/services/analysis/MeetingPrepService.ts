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
Tu tarea es generar un temario (checklist) estratégico y profesional para una reunión de consorcio.
REGLA CRÍTICA: Debes responder EXCLUSIVAMENTE con un objeto JSON válido. No incluyas texto explicativo antes o después. 
El JSON debe seguir la estructura solicitada estrictamente.`;

        const prompt = `Generá un temario estratégico y detallado para la reunión del consorcio "${data.buildingName}". 
El objetivo es que los propietarios tengan argumentos sólidos y claros para discutir con la administración o entre ellos.

DATOS DE GASTOS Y ALERTAS (Basado en el análisis de expensas):
${data.analyses.map(a => `- Período ${a.period}: Total ${a.total_amount}. 
  Alertas detectadas que requieren atención: ${a.categories?.filter((c: any) => c.status !== 'ok').map((c: any) => `${c.name} (${c.status}): ${c.explanation || 'Sin notas'}`).join('; ') || 'Ninguna'}`).join('\n')}

RECLAMOS Y COMENTARIOS DE PROPIETARIOS:
${data.commentsByType.shared.length > 0
                ? data.commentsByType.shared.map(c => `- ${c.author_name} dijo: "${c.comment}"`).join('\n')
                : "No hay comentarios externos registrados."}

NOTAS ADICIONALES DEL ADMINISTRADOR/USUARIO:
${data.analyses.map(a => `- ${a.period}: ${a.owner_notes || 'Sin notas adicionales'}`).join('\n')}

INSTRUCCIONES PARA EL CONTENIDO:
1. Para cada punto detectado, redactá un "title" directo y una "description" que incluya un ARGUMENTO o PREGUNTA CLAVE para la administración.
2. Identificá si hay patrones de aumento (ej: servicios que suben por encima de la inflación, sueldos con muchos retroactivos, etc.).
3. Si hay reclamos de vecinos, convertilos en puntos de "Convivencia" o "Mantenimiento".
4. Incluí siempre un punto final de "Estrategia de Gestión" con recomendaciones generales para bajar costos o mejorar la transparencia.

ESTRUCTURA DE SALIDA (JSON):
- "importance" debe ser: "high" (Crítico), "medium" (Importante) o "low" (Rutinario).
- "category" debe ser: "Mantenimiento", "Servicios", "Sueldos", "Administrativo", "Gestión" o "Convivencia".

{
  "title": "Temario Estratégico: Reunión de Consorcio - ${data.buildingName}",
  "items": [
    {
      "id": "item_1",
      "category": "Mantenimiento",
      "title": "Revisión de Abonos de Ascensores",
      "description": "Se detectó un aumento del 40% en un solo mes. Es necesario pedir presupuestos comparativos para validar si el costo de mercado es menor.",
      "source": "IA Alerta de Desvío",
      "importance": "high"
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
