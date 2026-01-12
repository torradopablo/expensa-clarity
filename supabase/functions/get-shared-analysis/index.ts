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
    const date = new Date(year, month);
    return date;
  }
  
  return new Date();
};

const periodToYearMonth = (period: string): string => {
  // Check if period is already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period;
  }
  
  // Otherwise, parse Spanish format like "enero 2024"
  const date = parseDate(period);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function started");
    
    const { token } = await req.json();
    console.log("Token received:", token);

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    console.log("Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the shared link is valid
    console.log("Fetching shared link");
    const { data: linkData, error: linkError } = await supabase
      .from("shared_analysis_links")
      .select("analysis_id, is_active, expires_at, view_count")
      .eq("token", token)
      .maybeSingle();

    console.log("Link data:", linkData);
    console.log("Link error:", linkError);

    if (linkError) {
      console.error("Error fetching link:", linkError);
      return new Response(
        JSON.stringify({ error: "Error fetching shared link", details: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData) {
      console.log("Link not found");
      return new Response(
        JSON.stringify({ error: "Link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!linkData.is_active) {
      console.log("Link deactivated");
      return new Response(
        JSON.stringify({ error: "Link is deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      console.log("Link expired");
      return new Response(
        JSON.stringify({ error: "Link has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Link is valid, proceeding with analysis fetch");

    // Update view count
    await supabase
      .from("shared_analysis_links")
      .update({ view_count: linkData.view_count + 1 })
      .eq("token", token);

    // Fetch the analysis
    const { data: analysisData, error: analysisError } = await supabase
      .from("expense_analyses")
      .select("id, user_id, building_name, period, unit, total_amount, previous_total, status, created_at, period_date")
      .eq("id", linkData.analysis_id)
      .single();

    if (analysisError) {
      console.error("Error fetching analysis:", analysisError);
      return new Response(
        JSON.stringify({ error: "Error fetching analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id: ownerUserId, ...publicAnalysis } = analysisData as any;

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

    // Fetch historical data for this building (owner only)
    let historicalData: any[] = [];
    if (analysisData.building_name && ownerUserId) {
      const { data: histData, error: histError } = await supabase
        .from("expense_analyses")
        .select("id, period, total_amount, created_at, period_date")
        .eq("building_name", analysisData.building_name)
        .eq("user_id", ownerUserId)
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

    // Enrich previous-period data for older analyses (when previous_* fields are null)
    let computedPreviousTotal: number | null = (publicAnalysis as any).previous_total ?? null;
    let enrichedCategories = (categoriesData || []) as any[];

    if (historicalData.length >= 2) {
      const currentIdx = historicalData.findIndex((h) => h.id === (publicAnalysis as any).id);
      const previousAnalysis = currentIdx > 0 ? historicalData[currentIdx - 1] : null;

      if (previousAnalysis) {
        computedPreviousTotal = computedPreviousTotal ?? previousAnalysis.total_amount;

        const needsPrevCategories = enrichedCategories.some((c) => c.previous_amount === null);
        if (needsPrevCategories) {
          const { data: prevCats, error: prevCatsError } = await supabase
            .from("expense_categories")
            .select("name, current_amount")
            .eq("analysis_id", previousAnalysis.id);

          if (!prevCatsError && prevCats) {
            const normalizeName = (name: string) => name.toLowerCase().trim();
            const prevMap = new Map<string, number>(
              prevCats.map((c: any) => [normalizeName(c.name), c.current_amount])
            );

            enrichedCategories = enrichedCategories.map((c) => ({
              ...c,
              previous_amount:
                c.previous_amount !== null
                  ? c.previous_amount
                  : (prevMap.get(normalizeName(c.name)) ?? null),
            }));
          }
        }
      }
    }

    // Fetch inflation data using the same method as Evolucion.tsx
    let inflationData = null;
    try {
      const inflationResponse = await fetch(
        `${supabaseUrl}/functions/v1/fetch-inflation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
          },
        }
      );

      if (inflationResponse.ok) {
        const result = await inflationResponse.json();
        if (result.data) {
          inflationData = result.data;
          console.log("Inflation data fetched via API:", result.data);
        }
      }
    } catch (error) {
      console.error("Error fetching inflation data via API, falling back to database:", error);
      // Fallback to direct database access
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("inflation_data")
        .select("period, value, is_estimated")
        .order("period", { ascending: true });

      if (!fallbackError && fallbackData) {
        inflationData = fallbackData;
        console.log("Inflation data fetched via database fallback:", fallbackData);
      }
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
      (a: any) => a.building_name?.toLowerCase().trim() !== analysisData.building_name?.toLowerCase().trim()
    );

    console.log("Other buildings count:", otherBuildings.length);
    console.log("Sample other building:", otherBuildings[0]);

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

    console.log("Buildings trend before normalization:", buildingsTrend);

    // Calculate normalized percentage change from first period for buildings trend
    if (buildingsTrend.length > 0) {
      const baseValue = buildingsTrend[0].average;
      console.log("Base value for buildings trend:", baseValue);
      for (const item of buildingsTrend) {
        const normalizedItem = item as { average: number; normalizedPercent?: number };
        normalizedItem.normalizedPercent = ((item.average - baseValue) / baseValue) * 100;
      }
    }

    console.log("Buildings trend after normalization:", buildingsTrend);

    // Calculate stats for buildings comparison
    const buildingsTrendStats = {
      totalBuildings: new Set(otherBuildings.map((a: any) => a.building_name)).size,
      totalAnalyses: otherBuildings.length,
      periodsCount: buildingsTrend.length,
      filtersApplied: false,
      usedFallback: false
    };

    // Build evolution comparison data (percentage based) - same logic as AnalysisPage.tsx and Evolucion.tsx
    let evolutionData: any[] = [];
    
    if (historicalData.length >= 2) {
      const baseTotal = historicalData[0]?.total_amount || 0;
      
      // Build inflation map by year-month
      const inflationMap = new Map<string, { value: number; is_estimated: boolean }>();
      if (inflationData) {
        for (const inf of inflationData) {
          inflationMap.set(inf.period, { value: inf.value, is_estimated: inf.is_estimated });
        }
      }
      
      // Build buildings average map by period name
      const buildingsMap = new Map<string, number>();
      for (const bt of buildingsTrend) {
        buildingsMap.set(bt.period, (bt as any).normalizedPercent || 0);
      }
      
      // Find base inflation value for first period (same as Evolucion.tsx)
      const firstPeriodData = historicalData[0];
      const firstPeriodYYYYMM = periodToYearMonth(firstPeriodData.period);
      const baseInflation = firstPeriodYYYYMM ? inflationMap.get(firstPeriodYYYYMM) : null;
      
      for (const hist of historicalData) {
        const userPercent = baseTotal > 0 ? ((hist.total_amount - baseTotal) / baseTotal) * 100 : 0;
        
        // Calculate inflation percent change from base (same as Evolucion.tsx)
        let inflationPercent: number | null = null;
        let inflationEstimated = false;
        
        const periodYYYYMM = periodToYearMonth(hist.period);
        
        if (periodYYYYMM && baseInflation) {
          const inflationItem = inflationMap.get(periodYYYYMM);
          
          if (inflationItem) {
            inflationPercent = ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100;
            inflationEstimated = inflationItem.is_estimated;
          }
        }
        
        const buildingsPercent = buildingsMap.get(hist.period) ?? null;
        
        evolutionData.push({
          period: hist.period,
          userPercent: parseFloat(userPercent.toFixed(1)),
          inflationPercent: inflationPercent !== null ? parseFloat(inflationPercent.toFixed(1)) : null,
          inflationEstimated,
          buildingsPercent: buildingsPercent !== null ? parseFloat(buildingsPercent.toFixed(1)) : null
        });
      }
      
      // Filter out periods with no data for any metric
      const filteredEvolutionData = evolutionData.filter(item => 
        item.userPercent !== null && 
        (item.inflationPercent !== null || item.buildingsPercent !== null)
      );
      
      console.log("Final evolution data after filtering:", filteredEvolutionData);
      evolutionData = filteredEvolutionData;
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
        analysis: { ...(publicAnalysis as any), previous_total: computedPreviousTotal },
        categories: enrichedCategories,
        historicalData: historicalData.map(h => ({
          id: h.id,
          period: h.period,
          total_amount: h.total_amount,
          created_at: h.created_at,
          period_date: h.period_date
        })),
        evolutionData: evolutionData,
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
