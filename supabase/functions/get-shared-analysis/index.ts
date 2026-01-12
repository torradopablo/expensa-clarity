import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface Category {
  id: string;
  name: string;
  icon: string;
  current_amount: number;
  previous_amount: number | null;
  status: string;
  explanation: string | null;
}

interface Analysis {
  id: string;
  building_name: string | null;
  period: string;
  unit: string | null;
  total_amount: number;
  previous_total: number | null;
  status: string;
  created_at: string;
}

interface HistoricalDataPoint {
  id: string;
  period: string;
  total_amount: number;
  created_at: string;
  period_date: string | null;
}

interface EvolutionDataPoint {
  period: string;
  userPercent: number;
  inflationPercent: number | null;
  inflationEstimated?: boolean;
  buildingsPercent: number | null;
}

interface Deviation {
  fromInflation: number;
  fromBuildings: number;
  isSignificant: boolean;
}

interface BuildingsTrendStats {
  totalBuildings: number;
  totalAnalyses: number;
  periodsCount: number;
  filtersApplied: boolean;
  usedFallback?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Looking for shared link with token:', token)

    // Find the shared link
    const { data: linkData, error: linkError } = await supabase
      .from('shared_analysis_links')
      .select('*')
      .eq('token', token)
      .single()

    if (linkError || !linkData) {
      console.log('Link not found:', linkError)
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if link is active
    if (!linkData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Link is deactivated' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if link has expired
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link has expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Link found, fetching analysis:', linkData.analysis_id)

    // Get the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('expense_analyses')
      .select('*')
      .eq('id', linkData.analysis_id)
      .single()

    if (analysisError || !analysis) {
      console.log('Analysis not found:', analysisError)
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get categories for this analysis
    const { data: categories, error: categoriesError } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('analysis_id', linkData.analysis_id)
      .order('current_amount', { ascending: false })

    if (categoriesError) {
      console.log('Categories error:', categoriesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch categories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get historical data for the same building
    const { data: historicalData, error: historicalError } = await supabase
      .from('expense_analyses')
      .select('id, period, total_amount, created_at, period_date')
      .eq('building_name', analysis.building_name)
      .order('created_at', { ascending: true })

    if (historicalError) {
      console.log('Historical data error:', historicalError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch historical data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enrich categories with previous period data if needed
    let enrichedCategories = categories || []
    if (historicalData && historicalData.length > 1) {
      const currentIdx = historicalData.findIndex((h: any) => h.id === analysis.id)
      const previousAnalysis = currentIdx > 0 ? historicalData[currentIdx - 1] : null

      if (previousAnalysis) {
        const needsPrevCategories = (categories || []).some((c: any) => c.previous_amount === null)

        if (needsPrevCategories) {
          const { data: prevCats, error: prevCatsError } = await supabase
            .from('expense_categories')
            .select('name, current_amount')
            .eq('analysis_id', previousAnalysis.id)

          if (!prevCatsError && prevCats) {
            const normalizeName = (name: string) => name.toLowerCase().trim()
            const prevMap = new Map<string, number>(
              prevCats.map((c: any) => [normalizeName(c.name), c.current_amount])
            )

            enrichedCategories = (categories || []).map((c: any) => ({
              ...c,
              previous_amount:
                c.previous_amount !== null
                  ? c.previous_amount
                  : (prevMap.get(normalizeName(c.name)) ?? null),
            }))
          }
        }
      }
    }

    // Get evolution data (inflation and buildings comparison)
    const evolutionData: EvolutionDataPoint[] = []
    let deviation: Deviation | null = null
    let buildingsTrendStats: BuildingsTrendStats | null = null

    // Fetch inflation data
    let inflationData = null
    try {
      const inflationResponse = await fetch(
        `${supabaseUrl}/functions/v1/fetch-inflation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
        }
      )
      
      if (inflationResponse.ok) {
        const result = await inflationResponse.json()
        if (result.data) {
          inflationData = result.data
        }
      }
    } catch (error) {
      console.log('Failed to fetch inflation data:', error)
    }

    // Fetch other buildings data for comparison
    const { data: otherBuildingsData } = await supabase
      .from('expense_analyses')
      .select('id, period, total_amount, period_date, building_name, user_id')
      .neq('building_name', analysis.building_name)
      .order('period_date', { ascending: true, nullsFirst: false })

    // Calculate evolution data if we have historical data
    if (historicalData && historicalData.length >= 2) {
      const baseTotal = historicalData[0].total_amount
      
      // Create inflation map
      const inflationMap = new Map<string, { value: number; is_estimated: boolean }>()
      if (inflationData) {
        inflationData.forEach((inf: any) => {
          inflationMap.set(inf.period, { value: inf.value, is_estimated: inf.is_estimated })
        })
      }

      // Helper to get YYYY-MM from period_date or parse from period string
      const getYYYYMM = (periodDate: string | null, period: string): string | null => {
        if (periodDate) {
          const date = new Date(periodDate)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }
        // Check if period is already in YYYY-MM format
        if (/^\d{4}-\d{2}$/.test(period)) {
          return period
        }
        // Parse Spanish period like "enero 2024"
        const monthsEs: Record<string, number> = {
          enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
          julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
        }
        const parts = period.toLowerCase().trim().split(/\s+/)
        if (parts.length >= 2) {
          const month = monthsEs[parts[0]]
          if (month !== undefined) {
            const year = parseInt(parts[1]) || new Date().getFullYear()
            return `${year}-${String(month + 1).padStart(2, '0')}`
          }
        }
        return null
      }

      // Find base inflation value for first period
      const firstPeriodData = historicalData[0]
      const firstPeriodYYYYMM = getYYYYMM(firstPeriodData.period_date, firstPeriodData.period)
      const baseInflation = firstPeriodYYYYMM ? inflationMap.get(firstPeriodYYYYMM) : null

      // Calculate other buildings average by period
      const buildingsAvgByPeriod = new Map<string, number[]>()
      if (otherBuildingsData) {
        otherBuildingsData.forEach(b => {
          if (!buildingsAvgByPeriod.has(b.period)) {
            buildingsAvgByPeriod.set(b.period, [])
          }
          buildingsAvgByPeriod.get(b.period)!.push(b.total_amount)
        })
      }

      // Get first period averages for other buildings
      const firstPeriod = historicalData[0].period
      const firstPeriodOtherBuildings = buildingsAvgByPeriod.get(firstPeriod)
      const baseOtherBuildings = firstPeriodOtherBuildings && firstPeriodOtherBuildings.length > 0
        ? firstPeriodOtherBuildings.reduce((a, b) => a + b, 0) / firstPeriodOtherBuildings.length
        : null

      const evolution: EvolutionDataPoint[] = historicalData.map((h) => {
        const userPercent = ((h.total_amount - baseTotal) / baseTotal) * 100
        
        // Calculate inflation percent change from base
        let inflationPercent: number | null = null
        let inflationEstimated = false
        
        const periodYYYYMM = getYYYYMM(h.period_date, h.period)
        if (periodYYYYMM && baseInflation) {
          const inflationItem = inflationMap.get(periodYYYYMM)
          if (inflationItem) {
            inflationPercent = ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100
            inflationEstimated = inflationItem.is_estimated
          }
        }
        
        let buildingsPercent: number | null = null
        if (baseOtherBuildings) {
          const periodBuildings = buildingsAvgByPeriod.get(h.period)
          if (periodBuildings && periodBuildings.length > 0) {
            const avgThisPeriod = periodBuildings.reduce((a, b) => a + b, 0) / periodBuildings.length
            buildingsPercent = ((avgThisPeriod - baseOtherBuildings) / baseOtherBuildings) * 100
          }
        }

        return {
          period: h.period,
          userPercent,
          inflationPercent,
          inflationEstimated,
          buildingsPercent
        }
      })

      evolutionData.push(...evolution)

      // Calculate deviation for latest period
      const latestEvolution = evolution[evolution.length - 1]
      if (latestEvolution) {
        const fromInflation = latestEvolution.inflationPercent !== null 
          ? latestEvolution.userPercent - latestEvolution.inflationPercent 
          : 0
        const fromBuildings = latestEvolution.buildingsPercent !== null 
          ? latestEvolution.userPercent - latestEvolution.buildingsPercent 
          : 0
        
        deviation = {
          fromInflation,
          fromBuildings,
          isSignificant: Math.abs(fromInflation) > 10 || Math.abs(fromBuildings) > 10
        }
      }

      // Set buildings trend stats
      if (otherBuildingsData) {
        const uniqueBuildings = new Set(otherBuildingsData.map(b => b.building_name))
        const uniquePeriods = new Set(otherBuildingsData.map(b => b.period))
        buildingsTrendStats = {
          totalBuildings: uniqueBuildings.size,
          totalAnalyses: otherBuildingsData.length,
          periodsCount: uniquePeriods.size,
          filtersApplied: false
        }
      }
    }
    const responseData = {
      analysis,
      categories: enrichedCategories,
      historicalData: historicalData || [],
      evolutionData,
      deviation,
      buildingsTrendStats
    }

    console.log('Returning analysis data successfully')

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-shared-analysis:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})