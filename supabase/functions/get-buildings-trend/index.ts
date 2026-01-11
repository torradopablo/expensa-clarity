import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all completed analyses from all users (anonymized)
    const { data: allAnalyses, error } = await supabase
      .from("expense_analyses")
      .select("period, total_amount, building_name, created_at")
      .eq("status", "completed")
      .not("building_name", "is", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by period and calculate average
    const periodMap = new Map<string, { total: number; count: number; buildings: Set<string> }>();

    for (const analysis of allAnalyses || []) {
      const period = analysis.period;
      
      if (!periodMap.has(period)) {
        periodMap.set(period, { total: 0, count: 0, buildings: new Set() });
      }
      
      const entry = periodMap.get(period)!;
      entry.total += analysis.total_amount;
      entry.count++;
      entry.buildings.add(analysis.building_name);
    }

    // Convert to array and sort by period
    const monthsEs: Record<string, number> = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };

    const parseDate = (period: string): Date => {
      const parts = period.toLowerCase().split(" ");
      if (parts.length >= 2) {
        const month = monthsEs[parts[0]] ?? 0;
        const year = parseInt(parts[1]) || 2024;
        return new Date(year, month);
      }
      return new Date();
    };

    const trendData = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        average: Math.round(data.total / data.count),
        count: data.count,
        buildingsCount: data.buildings.size
      }))
      .sort((a, b) => parseDate(a.period).getTime() - parseDate(b.period).getTime());

    // Calculate normalized percentage change from first period
    if (trendData.length > 0) {
      const baseValue = trendData[0].average;
      for (const item of trendData) {
        (item as any).normalizedPercent = ((item.average - baseValue) / baseValue) * 100;
      }
    }

    // Calculate statistics
    const totalBuildings = new Set(allAnalyses?.map(a => a.building_name) || []).size;
    const totalAnalyses = allAnalyses?.length || 0;

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: trendData,
        stats: {
          totalBuildings,
          totalAnalyses,
          periodsCount: trendData.length
        }
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
