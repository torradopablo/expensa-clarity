import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { InflationCacheService } from "../_shared/services/cache/InflationCacheService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InflationDataPoint {
  period: string;
  value: number;
  is_estimated: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentPeriod = `${currentYear}-${currentMonth.toString().padStart(2, "0")}`;

    // Initialize cache service
    const inflationCacheService = new InflationCacheService();

    // Try to get from cache first
    const cachedInflation = await inflationCacheService.getCachedInflationData();
    if (cachedInflation) {
      console.log("Returning cached inflation data");
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: cachedInflation.data.sort((a: any, b: any) => a.period.localeCompare(b.period)), 
          cached: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check what inflation data we already have
    const { data: existingData, error: fetchError } = await supabase
      .from("inflation_data")
      .select("period, value, is_estimated")
      .order("period", { ascending: false });

    if (fetchError) {
      console.error("Error fetching existing data:", fetchError);
      throw fetchError;
    }

    // Determine if we need to update
    // We update if:
    // 1. Data is empty
    // 2. The most recent non-estimated period is older than 2 months ago
    // 3. We haven't estimated up to the current month

    const nonEstimatedData = (existingData || []).filter(d => !d.is_estimated);
    const latestNonEstimated = nonEstimatedData[0];
    const latestPeriod = (existingData || [])[0];

    let needsUpdate = false;

    if (!latestNonEstimated) {
      needsUpdate = true;
    } else {
      // If the latest real data is older than 2 months, try to refresh
      const [ly, lm] = latestNonEstimated.period.split("-").map(Number);
      const latestDate = new Date(ly, lm - 1, 1);
      const monthsDiff = (now.getFullYear() - latestDate.getFullYear()) * 12 + (now.getMonth() - latestDate.getMonth());

      if (monthsDiff >= 2) {
        needsUpdate = true;
      }
    }

    // Even if no "real" update is needed, check if we need more estimates
    if (!needsUpdate && latestPeriod && latestPeriod.period < currentPeriod) {
      needsUpdate = true;
    }

    if (!needsUpdate && existingData && existingData.length > 0) {
      console.log("Inflation data is up to date, skipping API call.");
      return new Response(
        JSON.stringify({ success: true, data: existingData.sort((a, b) => a.period.localeCompare(b.period)), cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingPeriods = new Set((existingData || []).map(d => d.period));

    // Fetch inflation data from Argentina's official API
    let apiData: { date: string; value: number }[] = [];

    if (needsUpdate) {
      try {
        console.log("Fetching fresh inflation data from API...");
        const response = await fetch(
          "https://apis.datos.gob.ar/series/api/series/?ids=101.1_I2NG_2016_M_22&format=json&limit=500"
        );

        if (response.ok) {
          const json = await response.json();
          if (json.data && Array.isArray(json.data)) {
            apiData = json.data.map((item: [string, number]) => ({
              date: item[0],
              value: item[1]
            })).filter((item: { date: string; value: number }) => item.value !== null);
          }
        }
      } catch (apiError) {
        console.error("Error fetching from API:", apiError);
      }
    }

    const dataToInsert: InflationDataPoint[] = [];

    // Process API data
    for (const item of apiData) {
      const period = item.date.substring(0, 7);

      // Upsert: if it was estimated before, now we have real data
      const existing = (existingData || []).find(d => d.period === period);
      if (!existing || existing.is_estimated) {
        dataToInsert.push({
          period,
          value: item.value,
          is_estimated: false
        });
        existingPeriods.add(period);
      }
    }

    // Calculate estimates for missing periods
    const allRealData = [
      ...(existingData || []).filter(d => !d.is_estimated && !dataToInsert.find(ni => ni.period === d.period)),
      ...dataToInsert.filter(d => !d.is_estimated)
    ];
    allRealData.sort((a, b) => a.period.localeCompare(b.period));

    if (allRealData.length >= 2) {
      const recentData = allRealData.slice(-13);
      let totalGrowth = 0;
      let growthCount = 0;

      for (let i = 1; i < recentData.length; i++) {
        const growth = (recentData[i].value - recentData[i - 1].value) / recentData[i - 1].value;
        totalGrowth += growth;
        growthCount++;
      }

      const avgMonthlyGrowth = growthCount > 0 ? totalGrowth / growthCount : 0.03;

      const lastRealData = allRealData[allRealData.length - 1];
      const [lastYear, lastMonth] = lastRealData.period.split("-").map(Number);

      let currentValue = lastRealData.value;
      let year = lastYear;
      let month = lastMonth;

      // Estimate up to 2 months ahead of now
      const maxEstimateYear = now.getMonth() === 11 ? currentYear + 1 : currentYear;
      const maxEstimateMonth = (now.getMonth() + 2) % 12 + 1;
      const maxEstimatePeriod = `${maxEstimateYear}-${maxEstimateMonth.toString().padStart(2, "0")}`;

      while (`${year}-${month.toString().padStart(2, "0")}` < maxEstimatePeriod) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }

        const period = `${year}-${month.toString().padStart(2, "0")}`;

        const existing = (existingData || []).find(d => d.period === period);
        if (!existing) {
          currentValue = currentValue * (1 + avgMonthlyGrowth);
          dataToInsert.push({
            period,
            value: Math.round(currentValue * 100) / 100,
            is_estimated: true
          });
        }
      }
    }

    // Insert new data
    if (dataToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("inflation_data")
        .upsert(dataToInsert, { onConflict: "period" });

      if (insertError) throw insertError;
    }

    // Return all inflation data
    const { data: finalData, error: finalError } = await supabase
      .from("inflation_data")
      .select("period, value, is_estimated")
      .order("period", { ascending: true });

    if (finalError) throw finalError;

    // Cache the result for future requests
    await inflationCacheService.cacheInflationData(finalData);

    return new Response(
      JSON.stringify({
        success: true,
        data: finalData,
        newRecords: dataToInsert.length,
        cached: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-inflation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
