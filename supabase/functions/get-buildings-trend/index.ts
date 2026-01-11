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

    // Parse request body for optional filters
    let filters: {
      unit_count_range?: string;
      age_category?: string;
      zone?: string;
      has_amenities?: boolean;
    } | null = null;

    try {
      const body = await req.json();
      filters = body.filters || null;
    } catch {
      // No body or invalid JSON, proceed without filters
    }

    // Get all completed analyses from all users (anonymized)
    const { data: allAnalyses, error } = await supabase
      .from("expense_analyses")
      .select(`
        period, 
        total_amount, 
        building_name, 
        created_at,
        building_profile_id
      `)
      .eq("status", "completed")
      .not("building_name", "is", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // If filters are provided, fetch building profiles and filter analyses
    let filteredAnalyses = allAnalyses || [];

    if (filters && Object.keys(filters).length > 0) {
      // Get all building profiles that match the filters
      let profilesQuery = supabase.from("building_profiles").select("id, building_name");

      if (filters.unit_count_range) {
        profilesQuery = profilesQuery.eq("unit_count_range", filters.unit_count_range);
      }
      if (filters.age_category) {
        profilesQuery = profilesQuery.eq("age_category", filters.age_category);
      }
      if (filters.zone) {
        profilesQuery = profilesQuery.eq("zone", filters.zone);
      }
      if (filters.has_amenities !== undefined) {
        profilesQuery = profilesQuery.eq("has_amenities", filters.has_amenities);
      }

      const { data: matchingProfiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Get building names that match the profile filters
      const matchingBuildingNames = new Set(
        (matchingProfiles || []).map(p => p.building_name.toLowerCase().trim())
      );

      // Filter analyses to only include those with matching building profiles
      if (matchingBuildingNames.size > 0) {
        filteredAnalyses = filteredAnalyses.filter(analysis => {
          const normalizedName = analysis.building_name?.toLowerCase().trim();
          return normalizedName && matchingBuildingNames.has(normalizedName);
        });
      } else {
        // No matching profiles found, return empty data
        filteredAnalyses = [];
      }
    }

    // Group by period and calculate average
    const periodMap = new Map<string, { total: number; count: number; buildings: Set<string> }>();

    for (const analysis of filteredAnalyses) {
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
    const totalBuildings = new Set(filteredAnalyses.map(a => a.building_name)).size;
    const totalAnalyses = filteredAnalyses.length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: trendData,
        stats: {
          totalBuildings,
          totalAnalyses,
          periodsCount: trendData.length,
          filtersApplied: filters ? Object.keys(filters).length > 0 : false
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
