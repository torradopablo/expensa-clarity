import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { basicCorsHeaders } from "../_shared/config/cors.ts";
import { DeviationAnalysisService } from "../_shared/services/analysis/DeviationAnalysisService.ts";
import { ValidationError, RateLimitError } from "../_shared/utils/error.utils.ts";
import type { AnalysisRequest } from "../_shared/types/analysis.types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userTrend, inflationTrend, buildingsTrend, buildingName }: AnalysisRequest = await req.json();

    // Validate request
    if (!userTrend || !inflationTrend || !buildingsTrend || !buildingName) {
      throw new ValidationError("Missing required fields");
    }

    // Initialize service
    const deviationService = new DeviationAnalysisService();

    // Analyze deviations
    const { analysis, deviation } = await deviationService.analyzeDeviations({
      userTrend,
      inflationTrend,
      buildingsTrend,
      buildingName
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        deviation,
        provider: "ai-service"
      }),
      { headers: { ...basicCorsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-deviation:", error);
    
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode, headers: { ...basicCorsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          analysis: null,
          deviation: {
            fromInflation: 0,
            fromBuildings: 0,
            isSignificant: false
          }
        }),
        { status: 429, headers: { ...basicCorsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...basicCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
