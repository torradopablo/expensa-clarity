import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { periodToYearMonth } from "../_shared/utils/date.utils.ts"
import { TrendService } from "../_shared/services/analysis/TrendService.ts"
import { SharedAnalysisCacheService } from "../_shared/services/cache/SharedAnalysisCacheService.ts"

const MAX_HISTORICAL_PERIODS = 15;

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
  user_id: string;
  period: string;
  unit: string | null;
  total_amount: number;
  previous_total: number | null;
  status: string;
  created_at: string;
  building_address?: string;
  period_date?: string;
  owner_notes?: string;
  is_owner_view?: boolean;
}

interface HistoricalDataPoint {
  id: string;
  period: string;
  total_amount: number;
  created_at: string;
  period_date: string | null;
  expense_categories?: { name: string; current_amount: number }[];
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

interface AnalysisComment {
  id: string;
  author_name: string;
  author_email: string | null;
  comment: string;
  created_at: string;
  is_owner_comment: boolean;
  user_id: string | null;
  parent_comment_id: string | null;
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

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.substring(0, 2)}***@${domain}`;
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

    // Initialize cache service
    const cacheService = new SharedAnalysisCacheService()

    console.log('Looking for shared link with token:', token)

    // 1. Try to get from cache first
    const cachedResult = await cacheService.getCachedAnalysis(token)
    if (cachedResult) {
      console.log('Returning cached analysis data')
      return new Response(
        JSON.stringify(cachedResult.data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        }
      )
    }

    // 2. Find the shared link
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

    // Get the analysis - Restrict fields for security
    const { data: analysis, error: analysisError } = (await supabase
      .from('expense_analyses')
      .select('id, building_name, building_address, period, period_date, total_amount, previous_total, unit, status, created_at, owner_notes')
      .eq('id', linkData.analysis_id)
      .single()) as { data: Analysis | null, error: any }

    if (analysisError || !analysis) {
      console.log('Analysis not found:', analysisError)
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Assign a placeholder user_id if needed by the frontend comparison logic, 
    // but don't leak the real UUID from the private user
    analysis.user_id = 'shared-view';

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

    // Get comments for this analysis (incluyendo comentarios de owner)
    const { data: comments, error: commentsError } = await supabase
      .from('analysis_comments')
      .select('id, author_name, author_email, comment, created_at, is_owner_comment, user_id, parent_comment_id')
      .eq('analysis_id', linkData.analysis_id)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.log('Comments error:', commentsError)
      // No fallar si hay error en comentarios, solo loggear
    }

    // Mask emails for public view
    const maskedComments = (comments || []).map(c => ({
      ...c,
      author_email: c.author_email ? maskEmail(c.author_email) : null
    }));

    // Get ALL historical data for same building and user to build consistent evolution
    const { data: historicalData, error: historicalError } = await supabase
      .from('expense_analyses')
      .select('id, period, total_amount, created_at, period_date, expense_categories(name, current_amount)')
      .eq('building_name', analysis.building_name)
      .eq('status', 'completed')
      .order('period_date', { ascending: true, nullsFirst: false })

    if (historicalError) {
      console.log('Historical data error:', historicalError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch historical data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enrich categories with previous period data
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

    // Initialize TrendService
    const trendService = new TrendService();

    // Fetch building profile for filtering
    const { data: profile } = await supabase
      .from('building_profiles')
      .select('unit_count_range, age_category, neighborhood, zone, has_amenities, owner_user_id')
      .eq('building_name', analysis.building_name)
      .maybeSingle();

    // Re-check owner_user_id to ensure it matches the analysis owner
    // This is an extra security layer for shared links
    analysis.is_owner_view = (analysis.user_id === profile?.owner_user_id);

    // Fetch buildings trend via TrendService
    const filters: any = {};
    if (profile) {
      if (profile.unit_count_range) filters.unit_count_range = profile.unit_count_range;
      if (profile.age_category) filters.age_category = profile.age_category;
      if (profile.neighborhood) filters.neighborhood = profile.neighborhood;
      if (profile.zone) filters.zone = profile.zone;
      if (profile.has_amenities !== null) filters.has_amenities = profile.has_amenities;
    }
    filters.excludeBuilding = analysis.building_name;
    filters.excludeUserId = profile?.owner_user_id; // Use real owner ID for exclusion

    const { data: trendData, stats: trendStats } = await trendService.getMarketTrend(
      Object.keys(filters).length > 0 ? filters : {},
      false // Be strict
    );

    const buildingsTrend = trendData || [];
    let buildingsTrendStats: BuildingsTrendStats | null = trendStats || null;

    // Fetch trends for all other categories found in historical data
    const uniqueCategories = new Set<string>();
    if (historicalData) {
      historicalData.forEach((h: any) => {
        h.expense_categories?.forEach((c: any) => uniqueCategories.add(c.name));
      });
    }

    const categoryTrends: Record<string, any> = {
      all: { data: buildingsTrend, stats: buildingsTrendStats }
    };

    // Limit to top 12 categories to avoid excessive queries and use Promise.all for performance
    const categoriesToFetch = Array.from(uniqueCategories).slice(0, 12);

    const trendPromises = categoriesToFetch.map(async (catName) => {
      const catFilters = { ...filters, category: catName };
      const { data: catTrendData, stats: catTrendStats } = await trendService.getMarketTrend(
        catFilters,
        true // Use fallback for categories to ensure we have data
      );
      return { catName, data: catTrendData || [], stats: catTrendStats || null };
    });

    const results = await Promise.all(trendPromises);
    results.forEach(res => {
      categoryTrends[res.catName] = { data: res.data, stats: res.stats };
    });

    // Fetch inflation data
    let inflationData = null;
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
      );

      if (inflationResponse.ok) {
        const result = await inflationResponse.json();
        if (result.data) {
          inflationData = result.data;
        }
      }
    } catch (error) {
      console.log('Failed to fetch inflation data:', error);
    }

    // Limit historical data to 15 periods ending at the current analysis
    let slicedHistoricalData = historicalData || []
    if (slicedHistoricalData.length > 0) {
      const currentIdx = slicedHistoricalData.findIndex((h: any) => h.id === analysis.id)
      if (currentIdx !== -1) {
        const startIdx = Math.max(0, currentIdx - (MAX_HISTORICAL_PERIODS - 1))
        slicedHistoricalData = slicedHistoricalData.slice(startIdx, currentIdx + 1)
      } else {
        slicedHistoricalData = slicedHistoricalData.slice(-MAX_HISTORICAL_PERIODS)
      }
    }

    // Calculate evolution data
    const evolutionData: EvolutionDataPoint[] = []
    let deviation: Deviation | null = null

    if (slicedHistoricalData && slicedHistoricalData.length >= 2) {
      const baseTotal = slicedHistoricalData[0].total_amount

      const inflationMap = new Map<string, { value: number; is_estimated: boolean }>()
      if (inflationData) {
        inflationData.forEach((inf: any) => {
          inflationMap.set(inf.period, { value: inf.value, is_estimated: inf.is_estimated })
        })
      }

      const firstPeriodYYYYMM = periodToYearMonth(slicedHistoricalData[0].period, slicedHistoricalData[0].period_date)
      const baseInflation = firstPeriodYYYYMM ? (inflationMap.get(firstPeriodYYYYMM) ?? null) : null

      const firstPeriod = slicedHistoricalData[0].period
      const baseBuildingsItem = buildingsTrend.find(b => b.period === firstPeriod);
      const baseBuildingsAverage = baseBuildingsItem?.average ?? null;

      const evolution: EvolutionDataPoint[] = slicedHistoricalData.map((h: any) => {
        const userPercent = baseTotal > 0 ? ((h.total_amount - baseTotal) / baseTotal) * 100 : 0

        let inflationPercent: number | null = null
        let inflationEstimated = false
        const periodYYYYMM = periodToYearMonth(h.period, h.period_date)
        if (periodYYYYMM && baseInflation !== null && baseInflation.value !== 0) {
          const inflationItem = inflationMap.get(periodYYYYMM)
          if (inflationItem) {
            inflationPercent = ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100
            inflationEstimated = inflationItem.is_estimated
          }
        }

        let buildingsPercent: number | null = null
        if (baseBuildingsAverage !== null && baseBuildingsAverage > 0) {
          const buildingsItem = buildingsTrend.find((b: any) => b.period === h.period)
          if (buildingsItem && buildingsItem.average !== undefined) {
            buildingsPercent = ((buildingsItem.average - baseBuildingsAverage) / baseBuildingsAverage) * 100
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
    }

    const responseData = {
      analysis,
      categories: enrichedCategories,
      historicalData: slicedHistoricalData || [],
      evolutionData,
      deviation,
      buildingsTrendStats,
      comments: maskedComments,
      inflationData,
      categoryTrends
    }

    console.log('Returning analysis data successfully')

    // 3. Cache the result for future requests
    await cacheService.cacheAnalysis(linkData.analysis_id, token, responseData)

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
      }
    )

  } catch (error) {
    console.error('Error in get-shared-analysis:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})