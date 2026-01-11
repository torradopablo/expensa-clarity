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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { userTrend, inflationTrend, buildingsTrend, buildingName }: AnalysisRequest = await req.json();

    // Calculate deviations
    const userLatest = userTrend[userTrend.length - 1]?.percent || 0;
    const inflationLatest = inflationTrend[inflationTrend.length - 1]?.percent || 0;
    const buildingsLatest = buildingsTrend[buildingsTrend.length - 1]?.percent || 0;

    const deviationFromInflation = userLatest - inflationLatest;
    const deviationFromBuildings = userLatest - buildingsLatest;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Sos un asistente experto en análisis de expensas de consorcios en Argentina. Tus respuestas son concisas, claras y accionables." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || null;

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        deviation: {
          fromInflation: deviationFromInflation,
          fromBuildings: deviationFromBuildings,
          isSignificant: Math.abs(deviationFromInflation) > 5 || Math.abs(deviationFromBuildings) > 5
        }
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
