import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ========== VALIDATION SCHEMAS FOR AI RESPONSES ==========

// Category schema with strict validation
const CategorySchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim()),
  icon: z.string().max(50).nullable().optional(),
  current_amount: z.number().min(0).max(100000000), // Max 100 million (reasonable upper bound for ARS)
  previous_amount: z.number().min(0).max(100000000).nullable().optional(),
  status: z.enum(["ok", "attention", "normal", "high", "low", "new"]).default("ok"),
  explanation: z.string().max(1000).nullable().optional().transform(s => s ? s.trim().slice(0, 1000) : s),
});

// Building profile schema
const BuildingProfileSchema = z.object({
  country: z.string().max(100).nullable().optional().transform(s => s ? s.trim() : s),
  province: z.string().max(100).nullable().optional().transform(s => s ? s.trim() : s),
  city: z.string().max(100).nullable().optional().transform(s => s ? s.trim() : s),
  neighborhood: z.string().max(200).nullable().optional().transform(s => s ? s.trim() : s),
  zone: z.enum(["CABA", "GBA Norte", "GBA Oeste", "GBA Sur", "Interior"]).nullable().optional(),
  unit_count_range: z.enum(["1-10", "11-30", "31-50", "51-100", "100+"]).nullable().optional(),
  age_category: z.string().max(50).nullable().optional(),
  has_amenities: z.boolean().nullable().optional(),
  amenities: z.array(z.string().max(100)).max(20).nullable().optional(),
  construction_year: z.number().min(1800).max(2030).nullable().optional(),
});

// Main AI response schema
const AIResponseSchema = z.object({
  building_name: z.string().min(1).max(200).transform(s => s.trim()),
  period: z.string().min(1).max(100).transform(s => s.trim()),
  period_month: z.number().min(1).max(12).optional(),
  period_year: z.number().min(1900).max(2100).optional(),
  period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  unit: z.string().max(50).nullable().optional().transform(s => s ? s.trim() : s),
  total_amount: z.number().min(0).max(100000000), // Max 100 million ARS
  previous_total: z.number().min(0).max(100000000).nullable().optional(),
  categories: z.array(CategorySchema).min(1).max(50),
  building_profile: BuildingProfileSchema.nullable().optional(),
});

type ValidatedAIResponse = z.infer<typeof AIResponseSchema>;

// Validate and sanitize AI response
function validateAIResponse(data: unknown): ValidatedAIResponse {
  // First, do a basic type check
  if (typeof data !== "object" || data === null) {
    throw new Error("AI response is not an object");
  }

  // Parse with zod - this will throw if validation fails
  const validated = AIResponseSchema.parse(data);

  // Additional business logic validations
  const totalCategoryAmount = validated.categories.reduce(
    (sum, cat) => sum + cat.current_amount,
    0
  );

  // Check if categories sum is reasonably close to total (within 50% tolerance)
  // This helps detect manipulation of amounts but allows for flexibility
  const tolerance = validated.total_amount * 0.5;
  if (Math.abs(totalCategoryAmount - validated.total_amount) > tolerance && validated.total_amount > 0) {
    console.warn("Categories total differs significantly from stated total", {
      categoriesSum: totalCategoryAmount,
      statedTotal: validated.total_amount,
    });
    // Don't reject, but log for audit
  }

  // Sanitize string fields to prevent XSS if displayed in HTML
  validated.building_name = sanitizeString(validated.building_name);
  validated.period = sanitizeString(validated.period);
  if (validated.unit) validated.unit = sanitizeString(validated.unit);

  validated.categories = validated.categories.map(cat => ({
    ...cat,
    name: sanitizeString(cat.name),
    explanation: cat.explanation ? sanitizeString(cat.explanation) : cat.explanation,
  }));

  if (validated.building_profile) {
    const bp = validated.building_profile;
    if (bp.neighborhood) bp.neighborhood = sanitizeString(bp.neighborhood);
    if (bp.city) bp.city = sanitizeString(bp.city);
    if (bp.province) bp.province = sanitizeString(bp.province);
    if (bp.country) bp.country = sanitizeString(bp.country);
    if (bp.age_category) bp.age_category = sanitizeString(bp.age_category);
    if (bp.amenities) {
      bp.amenities = bp.amenities.map(a => sanitizeString(a));
    }
  }

  return validated;
}

// Basic string sanitization to prevent XSS
function sanitizeString(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

// ========== END VALIDATION SCHEMAS ==========

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

    // Validate analysisId format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!analysisId || !uuidRegex.test(analysisId)) {
      return new Response(
        JSON.stringify({ error: "ID de análisis inválido" }),
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

IMPORTANTE: Solo extraé datos que realmente aparezcan en el documento. NO inventés ni inferás datos que no estén presentes.

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
  ],
  "building_profile": {
    "country": "país (generalmente Argentina)",
    "province": "provincia o estado (ej: Buenos Aires, Córdoba, Santa Fe, CABA)",
    "city": "ciudad (ej: Capital Federal, La Plata, Rosario)",
    "neighborhood": "barrio o localidad si aparece en la dirección",
    "zone": "CABA|GBA Norte|GBA Oeste|GBA Sur|Interior" (inferir de la dirección),
    "unit_count_range": "1-10|11-30|31-50|51-100|100+" (estimar por contexto: si hay muchas UFs mencionadas, encargado, ascensor, etc),
    "age_category": "Nuevo (0-10 años)|Moderno (10-30 años)|Antiguo (30-50 años)|Histórico (50+ años)" (inferir por gastos de mantenimiento, ascensor viejo, etc),
    "has_amenities": true/false (si menciona pileta, SUM, gym, parrillas, etc),
    "amenities": ["pileta", "sum", "gimnasio", "parrillas", "laundry", "seguridad_24h", "cocheras"] (solo los que aparezcan mencionados)
  }
}

IMPORTANTE sobre el período:
- "period" debe ser el mes y año en formato legible, ej: "Enero 2024", "Diciembre 2023"
- "period_month" debe ser el número del mes (1=Enero, 12=Diciembre)
- "period_year" debe ser el año completo (ej: 2024)
- Buscá en el documento frases como "Expensas de", "Período", "Mes de", "Liquidación de" para identificar el período

IMPORTANTE sobre building_profile:
- Extraé toda la información que puedas inferir del documento
- El país casi siempre es Argentina, pero verificá si hay alguna referencia a otro país
- La provincia suele ser Buenos Aires, CABA, Córdoba, Santa Fe, etc. - Inferí de la dirección o datos del consorcio
- La ciudad puede ser Capital Federal, La Plata, Rosario, etc. - En CABA usá "Capital Federal"
- El barrio/localidad suele aparecer en la dirección del consorcio
- Si ves gastos de pileta, seguridad 24hs, mantenimiento de SUM, etc., incluí esos amenities
- Si no podés inferir un campo, dejalo como null
- unit_count_range: estimá por la cantidad de UFs mencionadas, si hay portero/encargado permanente (sugiere >30 unidades), múltiples ascensores, etc.

VALIDACIÓN DE DATOS:
- Los montos deben ser números positivos y razonables (entre 0 y 100.000.000 ARS)
- El nombre del edificio debe tener máximo 200 caracteres
- Las categorías deben tener nombres de máximo 100 caracteres
- Las explicaciones deben ser breves (máximo 500 caracteres)

Categorías comunes de gastos: Encargado, Servicios públicos, Agua y cloacas, Mantenimiento, Seguro del edificio, Administración, Ascensores, Limpieza, Expensas extraordinarias.

Si hay gastos que parecen inusualmente altos (más del 30% del promedio típico), márcalos con status "attention".
Usa español argentino simple, evita jerga contable.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizá esta liquidación de expensas y extraé los datos estructurados, incluyendo información del perfil del edificio:"
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
        max_tokens: 2500,
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

    // Log original AI response for audit purposes
    console.log("Original AI response (for audit):", content.substring(0, 500));

    // Parse the JSON response from AI
    let rawExtractedData;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      rawExtractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      throw new Error("Error al interpretar los datos de la expensa");
    }

    // Validate and sanitize AI response using zod schema
    let extractedData: ValidatedAIResponse;
    try {
      extractedData = validateAIResponse(rawExtractedData);
      console.log("AI response validated successfully");
    } catch (validationError) {
      console.error("Validation error:", validationError);
      
      // If validation fails, we can try to salvage the data with defaults
      // This prevents total failure while still protecting against malicious data
      if (validationError instanceof z.ZodError) {
        console.error("Zod validation errors:", validationError.errors);
        throw new Error("Los datos extraídos no son válidos. Por favor, intentá con otro documento.");
      }
      throw validationError;
    }

    // Build period_date from extracted month/year
    let periodDate: string | null = null;
    if (extractedData.period_year && extractedData.period_month) {
      const year = extractedData.period_year;
      const month = extractedData.period_month;
      periodDate = `${year}-${month.toString().padStart(2, '0')}-01`;
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
      const categories = extractedData.categories.map((cat) => ({
        analysis_id: analysisId,
        name: cat.name,
        icon: cat.icon || null,
        current_amount: cat.current_amount,
        previous_amount: cat.previous_amount || null,
        status: cat.status || "ok",
        explanation: cat.explanation || null,
      }));

      const { error: catError } = await supabase
        .from("expense_categories")
        .insert(categories);

      if (catError) {
        console.error("Categories insert error:", catError);
      }
    }

    // Update or create building profile with extracted data
    if (normalizedBuildingName && extractedData.building_profile) {
      const profileData = extractedData.building_profile;
      
      // Check if a profile already exists for this building and user
      const { data: existingProfile } = await supabase
        .from("building_profiles")
        .select("id, country, province, city, neighborhood, zone, unit_count_range, age_category, has_amenities, amenities")
        .eq("user_id", userId)
        .eq("building_name", normalizedBuildingName)
        .single();

      if (existingProfile) {
        // Update only if extracted data is more complete (don't overwrite existing with nulls)
        const updates: Record<string, unknown> = {};
        
        if (profileData.country && !existingProfile.country) {
          updates.country = profileData.country;
        }
        if (profileData.province && !existingProfile.province) {
          updates.province = profileData.province;
        }
        if (profileData.city && !existingProfile.city) {
          updates.city = profileData.city;
        }
        if (profileData.neighborhood && !existingProfile.neighborhood) {
          updates.neighborhood = profileData.neighborhood;
        }
        if (profileData.zone && !existingProfile.zone) {
          updates.zone = profileData.zone;
        }
        if (profileData.unit_count_range && !existingProfile.unit_count_range) {
          updates.unit_count_range = profileData.unit_count_range;
        }
        if (profileData.age_category && !existingProfile.age_category) {
          updates.age_category = profileData.age_category;
        }
        if (profileData.has_amenities !== null && profileData.has_amenities !== undefined && !existingProfile.has_amenities) {
          updates.has_amenities = profileData.has_amenities;
        }
        if (profileData.amenities && profileData.amenities.length > 0) {
          // Merge amenities without duplicates
          const existingAmenities = existingProfile.amenities || [];
          const newAmenities = [...new Set([...existingAmenities, ...profileData.amenities])];
          if (newAmenities.length > existingAmenities.length) {
            updates.amenities = newAmenities;
          }
        }

        if (Object.keys(updates).length > 0) {
          const { error: profileUpdateError } = await supabase
            .from("building_profiles")
            .update(updates)
            .eq("id", existingProfile.id);

          if (profileUpdateError) {
            console.error("Error updating building profile:", profileUpdateError);
          } else {
            console.log("Building profile updated with extracted data:", updates);
          }
        }
      } else {
        // Create new profile with extracted data
        const { error: profileInsertError } = await supabase
          .from("building_profiles")
          .insert({
            user_id: userId,
            building_name: normalizedBuildingName,
            country: profileData.country || "Argentina",
            province: profileData.province || null,
            city: profileData.city || null,
            neighborhood: profileData.neighborhood || null,
            zone: profileData.zone || null,
            unit_count_range: profileData.unit_count_range || null,
            age_category: profileData.age_category || null,
            has_amenities: profileData.has_amenities || false,
            amenities: profileData.amenities || [],
          });

        if (profileInsertError) {
          console.error("Error creating building profile:", profileInsertError);
        } else {
          console.log("Building profile created from extracted data");
        }
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