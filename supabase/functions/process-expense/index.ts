import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const analysisId = formData.get("analysisId") as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No se proporcionó ningún archivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Convert file to base64 for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type;

    // Upload file to storage
    const filePath = `${userId}/${analysisId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("expense-files")
      .upload(filePath, file, { contentType: mimeType });

    if (uploadError) {
      console.error("Upload error:", uploadError);
    }

    // Use Lovable AI to extract and analyze the expense data
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no configurada");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un experto analizador de liquidaciones de expensas de edificios en Argentina. 
Tu trabajo es extraer y estructurar los datos de una liquidación de expensas.

DEBES responder SOLO con un JSON válido con esta estructura exacta:
{
  "building_name": "nombre del edificio o consorcio",
  "period": "mes y año de la expensa",
  "unit": "número de unidad funcional",
  "total_amount": número total en pesos,
  "categories": [
    {
      "name": "nombre de la categoría",
      "icon": "users|zap|droplets|wrench|shield|building",
      "current_amount": número,
      "status": "ok|attention",
      "explanation": "explicación breve en español simple"
    }
  ]
}

Categorías comunes: Encargado, Servicios públicos, Agua y cloacas, Mantenimiento, Seguro del edificio, Administración, Ascensores, Limpieza, Expensas extraordinarias.

Si hay gastos que parecen inusualmente altos (más del 30% del promedio típico), márcalos con status "attention".
Usa español argentino simple, evita jerga contable.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizá esta liquidación de expensas y extraé los datos estructurados:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Por favor, intentá de nuevo en unos minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, agregá créditos a tu cuenta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Error al procesar el documento");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No se pudo analizar el documento");
    }

    // Parse the JSON response from AI
    let extractedData;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      throw new Error("Error al interpretar los datos de la expensa");
    }

    // Update the analysis record with extracted data
    const { error: updateError } = await supabase
      .from("expense_analyses")
      .update({
        building_name: extractedData.building_name,
        period: extractedData.period,
        unit: extractedData.unit,
        total_amount: extractedData.total_amount,
        file_url: filePath,
        status: "completed",
      })
      .eq("id", analysisId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    // Insert categories
    if (extractedData.categories && extractedData.categories.length > 0) {
      const categories = extractedData.categories.map((cat: any) => ({
        analysis_id: analysisId,
        name: cat.name,
        icon: cat.icon,
        current_amount: cat.current_amount,
        previous_amount: cat.previous_amount || null,
        status: cat.status || "ok",
        explanation: cat.explanation,
      }));

      const { error: catError } = await supabase
        .from("expense_categories")
        .insert(categories);

      if (catError) {
        console.error("Categories insert error:", catError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        analysisId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process expense error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
