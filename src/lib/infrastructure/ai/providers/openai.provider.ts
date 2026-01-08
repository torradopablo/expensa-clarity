import { AIProvider } from '../ai.service';
import { AIExtractedData } from '../../../domain/entities/expense';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.apiKey = apiKey;
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
      "explanation": "explicación breve en español simple"
    }
  ]
}

Categorías comunes: Encargado, Servicios públicos, Agua y cloacas, Mantenimiento, Seguro del edificio, Administración, Ascensores, Limpieza, Expensas extraordinarias.

Si hay gastos que parecen inusualmente altos (más del 30% del promedio típico), márcalos con status "attention".
Usa español argentino simple, evita jerga contable.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'insufficient_quota') {
          throw new Error('La cuenta de OpenAI no tiene créditos disponibles. Por favor, recargá la cuenta o contactá al administrador.');
        }
        throw new Error('Límite de solicitudes excedido. Por favor, intentá de nuevo en unos minutos.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Por favor, agregá créditos a tu cuenta de OpenAI.');
      }
      
      throw new Error('Error al procesar el documento con IA');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No se pudo obtener respuesta de la IA');
    }

    // Parse the JSON response
    let extractedData: AIExtractedData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);

      // Validate required fields
      if (!extractedData.buildingName || !extractedData.period || !extractedData.categories) {
        throw new Error('Datos incompletos en la respuesta de la IA');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', content);
      throw new Error('Error al interpretar los datos de la expensa');
    }

    return extractedData;
  }
}
