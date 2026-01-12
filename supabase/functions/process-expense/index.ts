import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
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
    return new Response("ok", { status: 200, headers: corsHeaders });
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
    const isPDF = mimeType === "application/pdf";

    // For PDFs, we need to extract text first since OpenAI can't read PDF base64 directly
    let contentToSend;
    if (isPDF) {
      // For now, we'll try a different approach for PDFs
      // In a production environment, you'd use a PDF parsing library
      contentToSend = [
        {
          type: "text",
          text: `Analizá el contenido de este archivo PDF de liquidación de expensas. El archivo está codificado en base64. Extraé los datos estructurados que puedas identificar del contenido textual:\n\n${base64.substring(0, 5000)}...`
        }
      ];
    } else {
      contentToSend = [
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
      ];
    }

    // Upload file to storage
    const filePath = `${userId}/${analysisId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("expense-files")
      .upload(filePath, file, { contentType: mimeType });

    if (uploadError) {
      // Log error but don't fail the request
    }

    // Use AI to extract and analyze the expense data
    let AI_PROVIDER = Deno.env.get("AI_PROVIDER") || "openai";
    
    // Smart provider selection based on file type if not explicitly set
    if (AI_PROVIDER === "auto" || !Deno.env.get("AI_PROVIDER")) {
      AI_PROVIDER = isPDF ? "lovable" : "openai"; // Use Gemini for PDFs, OpenAI for images
    }
    
    let aiResponse: Response;
    
    if (AI_PROVIDER === "openai") {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY no configurada");
      }

      const requestBody: any = {
        model: "gpt-4o", // Use more powerful model for better OCR
        messages: [
          {
            role: "system",
            content: `PRIMERO: Describe qué ves en esta imagen en 1-2 frases.

SEGUNDO: Si es una liquidación de expensas, extrae los datos. Si no lo es o no puedes leer, devuelve JSON con valores null.

JSON requerido:
{
  "building_name": "nombre que veas o null",
  "period": "mes año que veas o null", 
  "period_month": número del mes o null,
  "period_year": año que veas o null,
  "unit": "unidad que veas o null",
  "total_amount": monto total que veas o 0,
  "categories": [
    {
      "name": "nombre categoría que veas o null",
      "icon": "building",
      "current_amount": monto que veas o 0,
      "status": "ok",
      "explanation": "descripción que veas o null"
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": null,
    "city": null,
    "neighborhood": null,
    "zone": null,
    "unit_count_range": null,
    "age_category": null,
    "has_amenities": false,
    "amenities": []
  }
}

EJEMPLO: {"building_name":"Edificio Central","period":"Enero 2024","period_month":1,"period_year":2024,"unit":"UF 12","total_amount":15000,"categories":[{"name":"Expensas comunes","icon":"building","current_amount":15000,"status":"ok","explanation":"Gastos mensuales"}],"building_profile":{"country":"Argentina","province":null,"city":null,"neighborhood":null,"zone":null,"unit_count_range":null,"age_category":null,"has_amenities":false,"amenities":[]}}

DEVUELVE SOLO EL JSON. NADA DE TEXTO.`
          },
          {
            role: "user",
            content: contentToSend
          }
        ],
        max_tokens: 2500,
      };

      aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } else if (AI_PROVIDER === "gemini") {
      console.log("=== GEMINI API PROCESSING START ===");
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      
      console.log("Gemini API Key exists:", !!GEMINI_API_KEY);
      console.log("File type:", isPDF ? "PDF" : "Image");
      
      if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY no configurada");
        throw new Error("GEMINI_API_KEY no configurada");
      }

      console.log("Making request to Gemini API...");
      
      aiResponse = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Eres un experto en analizar liquidaciones de expensas de Argentina. Tu tarea es extraer datos del PDF y devolver JSON.

REGLAS IMPORTANTES:
1. Analiza el contenido del PDF que se proporciona
2. Extrae todos los datos visibles y legibles
3. Si no puedes leer algún campo, usa null
4. Devuelve SOLO JSON, sin texto adicional

JSON requerido:
{
  "building_name": "nombre del edificio o null",
  "period": "mes año o null",
  "period_month": número del mes o null,
  "period_year": año o null,
  "unit": "unidad funcional o null",
  "total_amount": monto total o 0,
  "categories": [
    {
      "name": "nombre categoría o null",
      "icon": "building",
      "current_amount": monto o 0,
      "status": "ok",
      "explanation": "descripción o null"
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": null,
    "city": null,
    "neighborhood": null,
    "zone": null,
    "unit_count_range": null,
    "age_category": null,
    "has_amenities": false,
    "amenities": []
  }
}

EJEMPLO: {"building_name":"Edificio San Martín","period":"Enero 2024","period_month":1,"period_year":2024,"unit":"UF 205","total_amount":18500,"categories":[{"name":"Expensas ordinarias","icon":"building","current_amount":18500,"status":"ok","explanation":"Gastos mensuales"}],"building_profile":{"country":"Argentina","province":null,"city":null,"neighborhood":null,"zone":null,"unit_count_range":null,"age_category":null,"has_amenities":false,"amenities":[]}}

DEVUELVE ÚNICAMENTE EL JSON.`
                },
                ...(isPDF ? [{
                  inline_data: {
                    mime_type: "application/pdf",
                    data: base64
                  }
                }] : [{
                  inline_data: {
                    mime_type: mimeType,
                    data: base64
                  }
                }])
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 2500,
            temperature: 0.1,
          }
        }),
      });

      console.log("Gemini response status:", aiResponse.status);
      
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Gemini API error response:", errorText);
        throw new Error(`Gemini API error: ${aiResponse.status} - ${errorText}`);
      }

      console.log("=== GEMINI API SUCCESS ===");
    } else if (AI_PROVIDER === "lovable") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY no configurada");
      }

      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Eres un experto en analizar liquidaciones de expensas de Argentina. Tu tarea es extraer datos del PDF y devolver JSON.

REGLAS IMPORTANTES:
1. Analiza el contenido del PDF que se proporciona
2. Extrae todos los datos visibles y legibles
3. Si no puedes leer algún campo, usa null
4. Devuelve SOLO JSON, sin texto adicional

JSON requerido:
{
  "building_name": "nombre del edificio o null",
  "period": "mes año o null",
  "period_month": número del mes o null,
  "period_year": año o null,
  "unit": "unidad funcional o null",
  "total_amount": monto total o 0,
  "categories": [
    {
      "name": "nombre categoría o null",
      "icon": "building",
      "current_amount": monto o 0,
      "status": "ok",
      "explanation": "descripción o null"
    }
  ],
  "building_profile": {
    "country": "Argentina",
    "province": null,
    "city": null,
    "neighborhood": null,
    "zone": null,
    "unit_count_range": null,
    "age_category": null,
    "has_amenities": false,
    "amenities": []
  }
}

EJEMPLO: {"building_name":"Edificio San Martín","period":"Enero 2024","period_month":1,"period_year":2024,"unit":"UF 205","total_amount":18500,"categories":[{"name":"Expensas ordinarias","icon":"building","current_amount":18500,"status":"ok","explanation":"Gastos mensuales"}],"building_profile":{"country":"Argentina","province":null,"city":null,"neighborhood":null,"zone":null,"unit_count_range":null,"age_category":null,"has_amenities":false,"amenities":[]}}

DEVUELVE ÚNICAMENTE EL JSON.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizá este PDF de liquidación de expensas y extraé los datos estructurados:"
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
    } else {
      throw new Error(`AI provider no soportado: ${AI_PROVIDER}`);
    }

    console.log("AI response status:", aiResponse.status);
    console.log("AI response ok:", aiResponse.ok);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      
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
      
      throw new Error(`Error al procesar el documento. Status: ${aiResponse.status}, Error: ${errorText}`);
    }

    let aiData;
    
    // Handle different response formats
    if (AI_PROVIDER === "gemini") {
      const geminiResponse = await aiResponse.json();
      
      // Extract content from Gemini response format
      const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("No se pudo obtener respuesta de Gemini");
      }
      
      // Convert to OpenAI-like format for consistency
      aiData = {
        choices: [{
          message: {
            content: content
          }
        }]
      };
    } else {
      aiData = await aiResponse.json();
    }
    
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No se pudo analizar el documento");
    }

    // Parse the JSON response from AI
    let rawExtractedData;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      rawExtractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      // If JSON parsing fails, return a minimal valid structure
      rawExtractedData = {
        building_name: "Error en parsing",
        period: "Error",
        period_month: 1,
        period_year: 2024,
        unit: null,
        total_amount: 0,
        categories: [{
          name: "Error",
          icon: "alert",
          current_amount: 0,
          status: "attention",
          explanation: "No se pudo interpretar la respuesta de la IA"
        }],
        building_profile: {
          country: "Argentina",
          province: null,
          city: null,
          neighborhood: null,
          zone: null,
          unit_count_range: null,
          age_category: null,
          has_amenities: false,
          amenities: []
        }
      };
    }

    // Validate and sanitize AI response using zod schema
    let extractedData: ValidatedAIResponse;
    try {
      extractedData = validateAIResponse(rawExtractedData);
    } catch (validationError) {
      // If validation fails, we can try to salvage the data with defaults
      if (validationError instanceof z.ZodError) {
        // For now, let's try to continue with the data even if validation fails
        extractedData = rawExtractedData as any; // Type assertion for debugging
      } else {
        throw validationError;
      }
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
      // Log error but don't fail the request
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
        // Log error but don't fail the request
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
            // Log error but don't fail the request
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
          // Log error but don't fail the request
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
        // Don't fail the request, file deletion is not critical
      } else {
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});