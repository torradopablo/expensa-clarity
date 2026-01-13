import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeaders } from "../_shared/config/cors.ts";
import { validateUUID, validateFileUpload } from "../_shared/validators/common.validator.ts";
import { validateAIResponse } from "../_shared/validators/analysis.validator.ts";
import { createSupabaseClient } from "../_shared/config/supabase.ts";
import { ExpenseAnalysisService } from "../_shared/services/analysis/ExpenseAnalysisService.ts";
import { AnalysisRepository } from "../_shared/services/database/AnalysisRepository.ts";
import { BuildingRepository } from "../_shared/services/database/BuildingRepository.ts";
import { StorageService } from "../_shared/services/storage/StorageService.ts";
import { PDFService } from "../_shared/services/pdf/PDFService.ts";
import { ComparisonService } from "../_shared/services/analysis/ComparisonService.ts";
import { buildPeriodDate } from "../_shared/utils/date.utils.ts";
import { ValidationError, AuthenticationError, isRateLimitError } from "../_shared/utils/error.utils.ts";
import type { ValidatedAIResponse } from "../_shared/types/analysis.types.ts";


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const analysisId = formData.get("analysisId") as string;

    // Validate inputs
    if (!file) {
      throw new ValidationError("No se proporcionó ningún archivo");
    }

    validateUUID(analysisId);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AuthenticationError("No autorizado");
    }

    // Initialize services
    const supabase = createSupabaseClient(authHeader);
    const analysisRepository = new AnalysisRepository(authHeader);
    const buildingRepository = new BuildingRepository(authHeader);
    const storageService = new StorageService(authHeader);
    const expenseAnalysisService = new ExpenseAnalysisService();
    const pdfService = new PDFService();

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      throw new AuthenticationError("Token inválido");
    }

    const userId = claimsData.claims.sub as string;

    // Convert file to base64 for AI processing (safe for large files)
    const arrayBuffer = await file.arrayBuffer();
    const base64 = encode(new Uint8Array(arrayBuffer));
    const mimeType = file.type;
    const isPDF = mimeType === "application/pdf";

    // For PDFs, we use OCR to extract text first, saving on AI image processing costs
    let pdfText = "";
    if (isPDF) {
      console.log("Extracting text from PDF using PDFService...");
      pdfText = await pdfService.extractText(arrayBuffer);
      console.log(`Extracted ${pdfText.length} characters from PDF`);
    }

    // Upload file to storage
    const filePath = storageService.createFilePath(userId, analysisId, file.name);
    const { error: uploadError } = await storageService.uploadFile(
      "expense-files",
      filePath,
      file,
      { contentType: mimeType }
    );

    if (uploadError) {
      console.error("File upload error:", uploadError);
    }

    // Fetch existing building names for the user to help with matching
    const { data: existingAnalyses } = await analysisRepository.getBuildingNames(userId, analysisId);
    const existingBuildingNames = existingAnalyses
      ? [...new Set((existingAnalyses as { building_name: string }[]).map(a => a.building_name).filter(Boolean))]
      : [];

    // Try a quick match in the text to identify the building and fetch its standard categories
    let matchedBuildingName = "";
    if (pdfText) {
      for (const name of existingBuildingNames) {
        if (pdfText.toLowerCase().includes(name.toLowerCase())) {
          matchedBuildingName = name;
          break;
        }
      }
    }

    let previousCategories: string[] = [];
    if (matchedBuildingName) {
      console.log(`Matched existing building "${matchedBuildingName}" from text. Fetching previous categories...`);
      previousCategories = await analysisRepository.getLatestBuildingCategories(userId, matchedBuildingName);
    } else {
      // Fallback: get all unique categories of the user to guide the AI
      console.log("No specific building matched. Fetching user-wide common categories...");
      previousCategories = await analysisRepository.getUserCategories(userId);
    }

    // Limit categories to 50 most relevant to avoid too large prompt
    previousCategories = previousCategories.slice(0, 50);

    // Analyze expense file using AI service
    let extractedData: ValidatedAIResponse;
    try {
      if (isPDF && pdfText) {
        const aiResponse = await expenseAnalysisService.analyzeExpenseText(pdfText, previousCategories);
        extractedData = validateAIResponse(aiResponse);
      } else {
        const aiResponse = await expenseAnalysisService.analyzeExpenseFile(
          base64,
          mimeType,
          isPDF,
          previousCategories
        );
        extractedData = validateAIResponse(aiResponse);
      }
    } catch (aiError) {
      if (isRateLimitError(aiError)) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Por favor, intentá de nuevo en unos minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiError instanceof Error && aiError.message.includes("429")) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, agregá créditos a tu cuenta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Error al procesar el documento: ${aiError instanceof Error ? aiError.message : "Error desconocido"}`);
    }

    // Build period_date from extracted month/year
    const periodDate = buildPeriodDate(extractedData.period_year, extractedData.period_month);

    // Normalize building name using ComparisonService
    let normalizedBuildingName = extractedData.building_name;

    if (normalizedBuildingName) {
      const { data: existingAnalyses } = await analysisRepository.getBuildingNames(userId, analysisId);

      if (existingAnalyses && existingAnalyses.length > 0) {
        const existingBuildingNames = [...new Set(
          (existingAnalyses as { building_name?: string }[])
            .map((a) => a.building_name)
            .filter((name): name is string => name !== null && name !== undefined)
        )];

        const matchingBuilding = ComparisonService.findMatchingBuilding(
          normalizedBuildingName,
          existingBuildingNames
        );

        if (matchingBuilding) {
          normalizedBuildingName = matchingBuilding;
        }
      }
    }

    // Update analysis record with extracted data using repository
    const { error: updateError } = await analysisRepository.updateAnalysis(analysisId, {
      building_name: normalizedBuildingName,
      period: extractedData.period,
      period_date: periodDate || undefined,
      unit: extractedData.unit || undefined,
      total_amount: extractedData.total_amount,
      file_url: filePath,
      status: "completed",
      scanned_at: new Date().toISOString(),
    });

    if (updateError) {
      console.error("Analysis update error:", updateError);
    }

    // Insert categories using repository
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

      const { error: catError } = await analysisRepository.createCategories(categories);

      if (catError) {
        console.error("Categories creation error:", catError);
      }
    }

    // Update or create building profile using repository
    if (normalizedBuildingName && extractedData.building_profile) {
      const profileData = extractedData.building_profile;

      try {
        await buildingRepository.mergeBuildingProfile(userId, normalizedBuildingName, profileData);
      } catch (error) {
        console.error("Building profile error:", error);
      }
    }

    // Delete file from storage after successful processing to save space
    if (filePath) {
      const { error: deleteFileError } = await storageService.deleteFile("expense-files", filePath);

      if (deleteFileError) {
        console.error("File deletion error:", deleteFileError);
      } else {
        // Update the analysis to clear the file_url since the file no longer exists
        await analysisRepository.updateAnalysis(analysisId, { file_url: "" });
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

    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});