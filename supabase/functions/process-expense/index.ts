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
  "period": "Mes Año",
  "period_month": número del mes (1-12),
  "period_year": año (ej: 2024),
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

IMPORTANTE sobre el período:
- "period" debe ser el mes y año en formato legible, ej: "Enero 2024", "Diciembre 2023"
- "period_month" debe ser el número del mes (1=Enero, 12=Diciembre)
- "period_year" debe ser el año completo (ej: 2024)
- Buscá en el documento frases como "Expensas de", "Período", "Mes de", "Liquidación de" para identificar el período

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

    // Build period_date from extracted month/year
    let periodDate: string | null = null;
    if (extractedData.period_year && extractedData.period_month) {
      const year = parseInt(extractedData.period_year);
      const month = parseInt(extractedData.period_month);
      if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
        periodDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      }
    }

    // Normalize building name by matching against existing building names from user's previous analyses
    let normalizedBuildingName = extractedData.building_name;
    
    if (normalizedBuildingName) {
      // Fetch all unique building names from user's previous analyses
      const { data: existingAnalyses } = await supabase
        .from("expense_analyses")
        .select("building_name")
        .eq("user_id", userId)
        .neq("id", analysisId)
        .not("building_name", "is", null);

      if (existingAnalyses && existingAnalyses.length > 0) {
        // Get unique building names
        const existingBuildingNames = [...new Set(
          existingAnalyses
            .map(a => a.building_name)
            .filter((name): name is string => name !== null)
        )];

        // Normalize function for comparison
        const normalizeForComparison = (str: string): string => {
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
            .trim();
        };

        const extractedNormalized = normalizeForComparison(normalizedBuildingName);

        // Find a matching existing building name
        const matchingBuilding = existingBuildingNames.find(existingName => {
          const existingNormalized = normalizeForComparison(existingName);
          
          // Exact match after normalization
          if (extractedNormalized === existingNormalized) {
            return true;
          }
          
          // One contains the other (handles abbreviations like "Edif." vs "Edificio")
          if (extractedNormalized.includes(existingNormalized) || existingNormalized.includes(extractedNormalized)) {
            // Only match if substantial overlap (at least 60% of shorter string)
            const shorter = Math.min(extractedNormalized.length, existingNormalized.length);
            const longer = Math.max(extractedNormalized.length, existingNormalized.length);
            if (shorter / longer > 0.5) {
              return true;
            }
          }

          // Levenshtein-like similarity for typos
          // Simple check: if difference is just 1-2 chars and length is similar
          if (Math.abs(extractedNormalized.length - existingNormalized.length) <= 2) {
            let differences = 0;
            const maxLen = Math.max(extractedNormalized.length, existingNormalized.length);
            for (let i = 0; i < maxLen; i++) {
              if (extractedNormalized[i] !== existingNormalized[i]) {
                differences++;
              }
            }
            if (differences <= 2 && maxLen > 5) {
              return true;
            }
          }

          return false;
        });

        if (matchingBuilding) {
          console.log(`Building name normalized: "${normalizedBuildingName}" -> "${matchingBuilding}"`);
          normalizedBuildingName = matchingBuilding;
        }
      }
    }

    // Update the analysis record with extracted data
    const { error: updateError } = await supabase
      .from("expense_analyses")
      .update({
        building_name: normalizedBuildingName,
        period: extractedData.period,
        period_date: periodDate,
        unit: extractedData.unit,
        total_amount: extractedData.total_amount,
        file_url: filePath,
        status: "completed",
        scanned_at: new Date().toISOString(),
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

    // Delete file from storage after successful processing to save space
    // The metadata is already saved in the database, we don't need the original file anymore
    if (filePath) {
      const { error: deleteFileError } = await supabase.storage
        .from("expense-files")
        .remove([filePath]);
      
      if (deleteFileError) {
        console.error("Error deleting file after processing:", deleteFileError);
        // Don't fail the request, file deletion is not critical
      } else {
        console.log("File deleted after successful processing:", filePath);
        
        // Update the analysis to clear the file_url since the file no longer exists
        await supabase
          .from("expense_analyses")
          .update({ file_url: null })
          .eq("id", analysisId);
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
