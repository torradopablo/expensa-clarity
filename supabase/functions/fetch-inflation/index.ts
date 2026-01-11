import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Check what inflation data we already have
    const { data: existingData, error: fetchError } = await supabase
      .from("inflation_data")
      .select("period, value, is_estimated")
      .order("period", { ascending: true });

    if (fetchError) {
      console.error("Error fetching existing data:", fetchError);
      throw fetchError;
    }

    const existingPeriods = new Set((existingData || []).map(d => d.period));
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch inflation data from Argentina's official API
    // IPC (Consumer Price Index) - series 101.1_I2NG_2016_M_22
    let apiData: { date: string; value: number }[] = [];
    
    try {
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
      // Continue with existing data and estimates
    }

    const dataToInsert: InflationDataPoint[] = [];

    // Process API data
    for (const item of apiData) {
      // API returns dates like "2024-01-01"
      const period = item.date.substring(0, 7); // "2024-01"
      
      if (!existingPeriods.has(period)) {
        dataToInsert.push({
          period,
          value: item.value,
          is_estimated: false
        });
        existingPeriods.add(period);
      }
    }

    // Get all data to calculate estimates for missing periods
    const allData = [...(existingData || []).filter(d => !d.is_estimated), ...dataToInsert.filter(d => !d.is_estimated)];
    allData.sort((a, b) => a.period.localeCompare(b.period));

    if (allData.length >= 2) {
      // Calculate average monthly growth rate from last 12 months
      const recentData = allData.slice(-13); // Last 13 to calculate 12 month-over-month changes
      let totalGrowth = 0;
      let growthCount = 0;

      for (let i = 1; i < recentData.length; i++) {
        const growth = (recentData[i].value - recentData[i - 1].value) / recentData[i - 1].value;
        totalGrowth += growth;
        growthCount++;
      }

      const avgMonthlyGrowth = growthCount > 0 ? totalGrowth / growthCount : 0.03; // Default 3% if no data

      // Generate estimates for future months (up to 3 months ahead)
      const lastRealData = allData[allData.length - 1];
      const [lastYear, lastMonth] = lastRealData.period.split("-").map(Number);
      
      let currentValue = lastRealData.value;
      let year = lastYear;
      let month = lastMonth;

      for (let i = 0; i < 3; i++) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }

        // Don't estimate beyond current month
        if (year > currentYear || (year === currentYear && month > currentMonth)) {
          break;
        }

        const period = `${year}-${month.toString().padStart(2, "0")}`;
        
        if (!existingPeriods.has(period)) {
          currentValue = currentValue * (1 + avgMonthlyGrowth);
          dataToInsert.push({
            period,
            value: Math.round(currentValue * 100) / 100,
            is_estimated: true
          });
          existingPeriods.add(period);
        }
      }
    }

    // Insert new data
    if (dataToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("inflation_data")
        .upsert(dataToInsert, { onConflict: "period" });

      if (insertError) {
        console.error("Error inserting inflation data:", insertError);
        throw insertError;
      }
    }

    // Return all inflation data
    const { data: finalData, error: finalError } = await supabase
      .from("inflation_data")
      .select("period, value, is_estimated")
      .order("period", { ascending: true });

    if (finalError) throw finalError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: finalData,
        newRecords: dataToInsert.length
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
