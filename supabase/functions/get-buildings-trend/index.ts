import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TrendService } from "../_shared/services/analysis/TrendService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const trendService = new TrendService(authHeader || undefined);

    // Parse request body for optional filters
    let filters = null;
    let fallbackIfEmpty = false;

    try {
      const body = await req.json();
      filters = body.filters || null;
      fallbackIfEmpty = body.fallbackIfEmpty === true;
    } catch {
      // No body or invalid JSON
    }

    const { data, stats } = await trendService.getMarketTrend(filters || undefined, fallbackIfEmpty);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        stats
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-buildings-trend:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
