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
Tu tarea es generar un temario estratégico y una guía de preparación para el administrador para una reunión de consorcio.
REGLA CRÍTICA: Debes responder EXCLUSIVAMENTE con un objeto JSON válido. No incluyas texto explicativo antes o después. 
El JSON debe seguir la estructura solicitada estrictamente.`;

        const prompt = `Generá una propuesta integral para la reunión del consorcio "${data.buildingName}". 
El objetivo es que el administrador esté 100% preparado para las consultas de los propietarios y tenga un temario claro.

DATOS DE GASTOS Y ALERTAS (Basado en el análisis de expensas):
${data.analyses.map(a => `- Período ${a.period}: Total ${a.total_amount}. 
  Alertas detectadas: ${a.categories?.filter((c: any) => c.status !== 'ok').map((c: any) => `${c.name} (${c.status}): ${c.explanation || 'Sin notas'}`).join('; ') || 'Ninguna'}`).join('\n')}

RECLAMOS Y COMENTARIOS DE PROPIETARIOS (Externos):
${data.commentsByType.shared.length > 0
                ? data.commentsByType.shared.map(c => `- ${c.author_name} dijo: "${c.comment}"`).join('\n')
                : "No hay comentarios externos registrados."}

NOTAS E INFORMACIÓN INTERNA DEL ADMINISTRADOR:
${data.analyses.filter(a => a.owner_notes).map(a => `- Nota período ${a.period}: ${a.owner_notes}`).join('\n') || "No hay notas adicionales del administrador."}
${data.commentsByType.owner.length > 0
                ? data.commentsByType.owner.map(c => `- Comentario interno: "${c.comment}"`).join('\n')
                : ""}

INSTRUCCIONES PARA EL CONTENIDO:
1. "items": Puntos del temario oficial. Cada uno con una "description" que sea un ARGUMENTO o EXPLICACIÓN clara. Integrá los reclamos de propietarios o notas administrativas si son relevantes.
2. "preparation_guide": Una sección para uso exclusivo del administrador que contenga:
    - "anticipated_questions": Las 3 o 4 preguntas más difíciles o probables que harán los propietarios basadas en los aumentos detectados y sus comentarios, y la respuesta sugerida con datos.
    - "key_figures": 3 o 4 datos numéricos clave que el administrador debe tener "en la punta de la lengua" (ej: % de aumento acumulado, % de incidencia de sueldos, etc.).

ESTRUCTURA DE SALIDA (JSON):
{
  "title": "Temario Estratégico: Reunión de Consorcio - ${data.buildingName}",
  "items": [
    {
      "id": "string",
      "category": "Mantenimiento|Servicios|Sueldos|Administrativo|Gestión|Convivencia",
      "title": "string",
      "description": "string",
      "source": "string",
      "importance": "high|medium|low"
    }
  ],
  "preparation_guide": {
     "anticipated_questions": [
        { "question": "string", "answer": "string" }
     ],
     "key_figures": [
        { "label": "string", "value": "string" }
     ]
  }
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
