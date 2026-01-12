import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  userTrend: { period: string; percent: number }[];
  inflationTrend: { period: string; percent: number }[];
  buildingsTrend: { period: string; percent: number }[];
  buildingName: string;
}

async function callLovableAI(prompt: string, systemPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const aiResponse = await response.json();
  return aiResponse.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\n${prompt}`
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.1,
      }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    throw new Error(`Gemini error: ${response.status}`);
  }

  const geminiResponse = await response.json();
  return geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 500,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    const errorText = await response.text();
    console.error("OpenAI error:", response.status, errorText);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const aiResponse = await response.json();
  return aiResponse.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userTrend, inflationTrend, buildingsTrend, buildingName }: AnalysisRequest = await req.json();

    // Calculate deviations
    const userLatest = userTrend[userTrend.length - 1]?.percent || 0;
    const inflationLatest = inflationTrend[inflationTrend.length - 1]?.percent || 0;
    const buildingsLatest = buildingsTrend[buildingsTrend.length - 1]?.percent || 0;

    const deviationFromInflation = userLatest - inflationLatest;
    const deviationFromBuildings = userLatest - buildingsLatest;

    const systemPrompt = "Sos un asistente experto en análisis de expensas de consorcios en Argentina. Tus respuestas son concisas, claras y accionables.";
    
    const prompt = `Sos un experto analista financiero de expensas de consorcios en Argentina. Analiza los siguientes datos de evolución de expensas:

**Edificio analizado:** ${buildingName}

**Evolución de las expensas del usuario (% acumulado desde el primer período):**
${userTrend.map(t => `- ${t.period}: ${t.percent.toFixed(1)}%`).join("\n")}

**Evolución de la inflación argentina (% acumulado desde el primer período):**
${inflationTrend.map(t => `- ${t.period}: ${t.percent.toFixed(1)}%`).join("\n")}

**Evolución promedio de otros edificios en la plataforma (% acumulado):**
${buildingsTrend.map(t => `- ${t.period}: ${t.percent.toFixed(1)}%`).join("\n")}

**Desvío actual:**
- Respecto a inflación: ${deviationFromInflation > 0 ? "+" : ""}${deviationFromInflation.toFixed(1)} puntos porcentuales
- Respecto a otros edificios: ${deviationFromBuildings > 0 ? "+" : ""}${deviationFromBuildings.toFixed(1)} puntos porcentuales

Proporciona un análisis breve y accionable (máximo 3-4 oraciones) que:
1. Indique si el aumento de expensas está dentro de parámetros normales
2. Si hay desvío significativo (>5 puntos), explica posibles causas y qué verificar
3. Da una recomendación concreta si corresponde

Responde en español argentino, de forma clara y directa.`;

    // Determine which AI provider to use
    const aiProvider = Deno.env.get("AI_PROVIDER") || "lovable";
    let analysis: string | null = null;
    
    try {
      if (aiProvider.toLowerCase() === "openai") {
        console.log("Using OpenAI provider");
        analysis = await callOpenAI(prompt, systemPrompt);
      } else if (aiProvider.toLowerCase() === "gemini") {
        console.log("Using Gemini provider");
        analysis = await callGemini(prompt, systemPrompt);
      } else {
        console.log("Using Lovable AI provider");
        analysis = await callLovableAI(prompt, systemPrompt);
      }
    } catch (aiError) {
      if (aiError instanceof Error && aiError.message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            analysis: null,
            deviation: {
              fromInflation: deviationFromInflation,
              fromBuildings: deviationFromBuildings,
              isSignificant: Math.abs(deviationFromInflation) > 5 || Math.abs(deviationFromBuildings) > 5
            }
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw aiError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        deviation: {
          fromInflation: deviationFromInflation,
          fromBuildings: deviationFromBuildings,
          isSignificant: Math.abs(deviationFromInflation) > 5 || Math.abs(deviationFromBuildings) > 5
        },
        provider: aiProvider
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-deviation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
