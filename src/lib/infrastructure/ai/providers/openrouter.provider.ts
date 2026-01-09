import { AIProvider } from '../ai.service';
import { AIExtractedData } from '../../../domain/entities/expense';
import { OpenRouter } from '@openrouter/sdk';

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';
  private openrouter: OpenRouter;
  private model: string;

  constructor(apiKey: string, model = 'anthropic/claude-3.5-sonnet') {
    this.openrouter = new OpenRouter({
      apiKey: apiKey
    });
    this.model = model;
  }

  async extractExpenseData(imageBase64: string, mimeType: string): Promise<AIExtractedData> {
    const systemPrompt = `Eres un experto analizador de liquidaciones de expensas de edificios en Argentina. 
Tu trabajo es extraer y estructurar los datos de una liquidación de expensas.

DEBES responder SOLO con un JSON válido con esta estructura exacta:
{
  "buildingName": "nombre del edificio o consorcio",
  "period": "mes y año de la expensa",
  "unit": "número de unidad funcional",
  "totalAmount": número total en pesos,
  "categories": [
    {
      "name": "nombre de la categoría",
      "icon": "users|zap|droplets|wrench|shield|building",
      "currentAmount": número,
      "status": "ok|attention",
      "previousAmount": número,
      "notes": "comentarios adicionales si corresponde"
    }
  ]
}

Categorías comunes: Encargado, Servicios públicos, Agua y cloacas, Mantenimiento, Seguro del edificio, Administración, Ascensores, Limpieza, Expensas extraordinarias.

Si hay gastos que parecen inusualmente altos (más del 30% del promedio típico), márcalos con status "attention".
Usa español argentino simple, evita jerga contable.`;

    try {
      const response = await this.openrouter.chat.send({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analizá esta liquidación de expensas y extraé los datos estructurados:',
              },
              {
                type: 'image_url',
                imageUrl: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              },
            ],
          },
        ],
        maxTokens: 2000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content as string;
      if (!content) {
        throw new Error('No se pudo obtener respuesta de la IA');
      }

      // Parse JSON response
      const extractedData = JSON.parse(content);
      
      return {
        buildingName: extractedData.buildingName || '',
        period: extractedData.period || '',
        unit: extractedData.unit || '',
        totalAmount: extractedData.totalAmount || 0,
        categories: extractedData.categories || [],
      };
    } catch (error: any) {
      console.error('OpenRouter API error:', error);
      
      if ('status' in error && (error as any).status === 429) {
        throw new Error('Límite de solicitudes excedido. Por favor, intentá de nuevo en unos minutos.');
      }
      if ('status' in error && (error as any).status === 402) {
        throw new Error('Créditos insuficientes en OpenRouter. Por favor, agregá créditos a tu cuenta.');
      }
      
      throw new Error('Error al procesar el documento con IA');
    }
  }
}
