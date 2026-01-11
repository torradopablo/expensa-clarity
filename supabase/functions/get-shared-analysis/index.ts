import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to parse Spanish period to date
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

const periodToYearMonth = (period: string): string => {
  const date = parseDate(period);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the shared link is valid
    const { data: linkData, error: linkError } = await supabase
      .from("shared_analysis_links")
      .select("analysis_id, is_active, expires_at, view_count")
      .eq("token", token)
      .maybeSingle();

    if (linkError) {
      console.error("Error fetching link:", linkError);
      return new Response(
        JSON.stringify({ error: "Error fetching shared link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData) {
      return new Response(
        JSON.stringify({ error: "Link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData.is_active) {
      return new Response(
        JSON.stringify({ error: "Link is deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Link has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update view count
    await supabase
      .from("shared_analysis_links")
      .update({ view_count: linkData.view_count + 1 })
      .eq("token", token);

    // Fetch the analysis
    const { data: analysisData, error: analysisError } = await supabase
      .from("expense_analyses")
      .select("id, building_name, period, unit, total_amount, previous_total, status, created_at, period_date")
      .eq("id", linkData.analysis_id)
      .single();

    if (analysisError) {
      console.error("Error fetching analysis:", analysisError);
      return new Response(
        JSON.stringify({ error: "Error fetching analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("id, name, icon, current_amount, previous_amount, status, explanation")
      .eq("analysis_id", linkData.analysis_id)
      .order("current_amount", { ascending: false });

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return new Response(
        JSON.stringify({ error: "Error fetching categories" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch historical data for this building
    let historicalData: any[] = [];
    if (analysisData.building_name) {
      const { data: histData, error: histError } = await supabase
        .from("expense_analyses")
        .select("id, period, total_amount, created_at, period_date")
        .eq("building_name", analysisData.building_name)
        .order("period_date", { ascending: true, nullsFirst: false });

      if (!histError && histData) {
        // Sort by period_date or created_at
        historicalData = histData.sort((a, b) => {
          if (a.period_date && b.period_date) {
            return new Date(a.period_date).getTime() - new Date(b.period_date).getTime();
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      }
    }

    // Fetch inflation data
    const { data: inflationData, error: inflationError } = await supabase
      .from("inflation_data")
      .select("period, value, is_estimated")
      .order("period", { ascending: true });

    if (inflationError) {
      console.error("Error fetching inflation:", inflationError);
    }

    // Fetch all buildings data for comparison (anonymized averages by period)
    const { data: allAnalyses, error: allError } = await supabase
      .from("expense_analyses")
      .select("period, total_amount, building_name")
      .eq("status", "completed")
      .not("building_name", "is", null);

    if (allError) {
      console.error("Error fetching all analyses:", allError);
    }

    // Group all analyses by period and calculate average
    const periodMap = new Map<string, { total: number; count: number; buildings: Set<string> }>();
    
    // Exclude current building from averages
    const otherBuildings = (allAnalyses || []).filter(
      a => a.building_name?.toLowerCase().trim() !== analysisData.building_name?.toLowerCase().trim()
    );

    for (const analysis of otherBuildings) {
      const period = analysis.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, { total: 0, count: 0, buildings: new Set() });
      }
      const entry = periodMap.get(period)!;
      entry.total += analysis.total_amount;
      entry.count++;
      entry.buildings.add(analysis.building_name);
    }

    const buildingsTrend = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        average: Math.round(data.total / data.count),
        count: data.count,
        buildingsCount: data.buildings.size
      }))
      .sort((a, b) => parseDate(a.period).getTime() - parseDate(b.period).getTime());

    // Calculate normalized percentage change from first period for buildings trend
    if (buildingsTrend.length > 0) {
      const baseValue = buildingsTrend[0].average;
      for (const item of buildingsTrend) {
        (item as any).normalizedPercent = ((item.average - baseValue) / baseValue) * 100;
      }
    }

    // Calculate stats for buildings comparison
    const buildingsTrendStats = {
      totalBuildings: new Set(otherBuildings.map(a => a.building_name)).size,
      totalAnalyses: otherBuildings.length,
      periodsCount: buildingsTrend.length,
      filtersApplied: false,
      usedFallback: false
    };

    // Build evolution comparison data (percentage based)
    const evolutionData: any[] = [];
    
    if (historicalData.length >= 2) {
      const baseTotal = historicalData[0]?.total_amount || 0;
      
      // Build inflation map by year-month
      const inflationMap = new Map<string, { value: number; isEstimated: boolean }>();
      if (inflationData) {
        for (const inf of inflationData) {
          inflationMap.set(inf.period, { value: inf.value, isEstimated: inf.is_estimated });
        }
      }
      
      // Build buildings average map by period name
      const buildingsMap = new Map<string, number>();
      for (const bt of buildingsTrend) {
        buildingsMap.set(bt.period, (bt as any).normalizedPercent || 0);
      }
      
      // Get sorted periods from historical data to calculate cumulative inflation
      const sortedPeriods = historicalData.map(h => ({
        period: h.period,
        yearMonth: periodToYearMonth(h.period)
      }));
      
      // Calculate cumulative inflation from base period
      const baseYearMonth = sortedPeriods[0]?.yearMonth;
      let cumulativeInflation = 0;
      const cumulativeInflationMap = new Map<string, number>();
      
      if (inflationData && baseYearMonth) {
        // Sort inflation data chronologically
        const sortedInflation = [...inflationData].sort((a, b) => a.period.localeCompare(b.period));
        
        // Find base index
        const baseIdx = sortedInflation.findIndex(inf => inf.period >= baseYearMonth);
        
        if (baseIdx >= 0) {
          cumulativeInflationMap.set(sortedInflation[baseIdx].period, 0); // base period = 0%
          
          for (let i = baseIdx + 1; i < sortedInflation.length; i++) {
            // Cumulative: (1 + prev) * (1 + current/100) - 1
            const monthlyRate = sortedInflation[i].value / 100;
            cumulativeInflation = ((1 + cumulativeInflation / 100) * (1 + monthlyRate) - 1) * 100;
            cumulativeInflationMap.set(sortedInflation[i].period, cumulativeInflation);
          }
        }
      }
      
      for (const hist of historicalData) {
        const userPercent = baseTotal > 0 ? ((hist.total_amount - baseTotal) / baseTotal) * 100 : 0;
        const yearMonth = periodToYearMonth(hist.period);
        const cumulativeInflationPercent = cumulativeInflationMap.get(yearMonth) ?? null;
        const buildingsPercent = buildingsMap.get(hist.period) ?? null;
        
        evolutionData.push({
          period: hist.period,
          userPercent: parseFloat(userPercent.toFixed(1)),
          inflationPercent: cumulativeInflationPercent !== null ? parseFloat(cumulativeInflationPercent.toFixed(1)) : null,
          inflationEstimated: inflationMap.get(yearMonth)?.isEstimated ?? false,
          buildingsPercent: buildingsPercent !== null ? parseFloat(buildingsPercent.toFixed(1)) : null
        });
      }
    }

    // Calculate deviations for the last period
    let deviation = null;
    if (evolutionData.length >= 2) {
      const lastPoint = evolutionData[evolutionData.length - 1];
      const fromInflation = lastPoint.inflationPercent !== null 
        ? lastPoint.userPercent - lastPoint.inflationPercent 
        : 0;
      const fromBuildings = lastPoint.buildingsPercent !== null 
        ? lastPoint.userPercent - lastPoint.buildingsPercent 
        : 0;
      
      deviation = {
        fromInflation: parseFloat(fromInflation.toFixed(1)),
        fromBuildings: parseFloat(fromBuildings.toFixed(1)),
        isSignificant: Math.abs(fromInflation) > 10 || Math.abs(fromBuildings) > 10
      };
    }

    return new Response(
      JSON.stringify({
        analysis: analysisData,
        categories: categoriesData || [],
        historicalData: historicalData.map(h => ({
          id: h.id,
          period: h.period,
          total_amount: h.total_amount,
          created_at: h.created_at,
          period_date: h.period_date
        })),
        evolutionData,
        deviation,
        buildingsTrendStats: buildingsTrendStats.totalBuildings > 0 ? buildingsTrendStats : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
