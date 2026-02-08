import { createSupabaseClient, createServiceClient } from "../../config/supabase.ts";
import { ComparisonService } from "./ComparisonService.ts";
import { InflationCacheService } from "../cache/InflationCacheService.ts";

export interface MarketTrendFilters {
    unit_count_range?: string;
    age_category?: string;
    neighborhood?: string;
    zone?: string;
    has_amenities?: boolean;
    category?: string;
    excludeBuilding?: string;
    excludeUserId?: string;
}

export class TrendService {
    private supabase: ReturnType<typeof createSupabaseClient>;

    constructor(authHeader?: string) {
        this.supabase = createSupabaseClient(authHeader);
    }

    async getInflationData() {
        // Try cache first
        const inflationCacheService = new InflationCacheService();
        const cachedInflation = await inflationCacheService.getCachedInflationData();

        if (cachedInflation) {
            return { data: cachedInflation.data, error: null, cached: true };
        }

        // Fallback to database
        const adminSupabase = createServiceClient();
        const { data, error } = await adminSupabase
            .from("inflation_data")
            .select("period, value, is_estimated")
            .order("period", { ascending: true });

        // Cache the result for future requests
        if (data && !error) {
            await inflationCacheService.cacheInflationData(data);
        }

        return { data, error, cached: false };
    }

    async getMarketTrend(filters?: MarketTrendFilters, fallbackIfEmpty = true) {
        // Use service role client for aggregation to bypass RLS
        const adminSupabase = createServiceClient();

        const category = filters?.category || 'total';
        const filterKey = JSON.stringify({ ...filters, fallbackIfEmpty });

        // 1. Try to fetch from cache table if it exists
        // Cache table has RLS enabled but no policies, so it's only accessible by service role.
        // We must use adminSupabase here as well.
        try {
            const { data: cachedTrend, error: cacheError } = await adminSupabase
                .from("market_trends_cache")
                .select("data, stats, created_at")
                .eq("filter_key", filterKey)
                .single();

            if (!cacheError && cachedTrend) {
                const cacheAge = Date.now() - new Date(cachedTrend.created_at).getTime();
                // If cache is less than 24 hours old, return it
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    console.log("Returning cached market trend data.");
                    return {
                        success: true,
                        data: cachedTrend.data,
                        stats: cachedTrend.stats,
                        cached: true
                    };
                }
            }
        } catch (err) {
            console.log("Cache error or miss", err);
        }

        // 2. Original calculation logic REFACTORED to use adminSupabase
        const queryCategory = filters?.category;

        // Build the query using admin client
        let query = adminSupabase
            .from("expense_analyses")
            .select(`
        period, 
        total_amount, 
        building_name, 
        user_id,
        created_at,
        building_profile_id
        ${queryCategory ? ', expense_categories!inner(name, current_amount)' : ''}
      `)
            .eq("status", "completed")
            .not("building_name", "is", null);

        if (queryCategory) {
            query = query.eq("expense_categories.name", queryCategory);
        }

        const { data: allAnalyses, error } = await query.order("created_at", { ascending: true });

        if (error) throw error;

        let filteredAnalyses = allAnalyses || [];
        let usedFallback = false;
        let filtersApplied = false;

        const profileFilters = { ...filters };
        delete profileFilters.category;
        delete (profileFilters as any).excludeBuilding;
        delete (profileFilters as any).excludeUserId;

        if (Object.keys(profileFilters).length > 0) {
            filtersApplied = true;

            // Start with base query
            let profilesQuery = adminSupabase
                .from("building_profiles")
                .select("id, building_name");

            // Apply profile attribute filters if provided
            if (filters?.unit_count_range) {
                profilesQuery = profilesQuery.eq("unit_count_range", filters.unit_count_range);
            }
            if (filters?.age_category) {
                profilesQuery = profilesQuery.eq("age_category", filters.age_category);
            }
            if (filters?.has_amenities !== undefined) {
                profilesQuery = profilesQuery.eq("has_amenities", filters.has_amenities);
            }

            // Hierarchical geographic filtering: Neighborhood -> Zone -> Global
            let matchingProfiles: any[] = [];

            // 1. Try with Neighborhood + other filters
            if (filters?.neighborhood) {
                const { data } = await profilesQuery.eq("neighborhood", filters.neighborhood);
                matchingProfiles = data || [];
            }

            // 2. If not enough buildings, try with Zone + other filters
            if (matchingProfiles.length < 2 && filters?.zone) {
                let zoneQuery = adminSupabase
                    .from("building_profiles")
                    .select("id, building_name")
                    .eq("zone", filters.zone);

                if (filters?.unit_count_range) zoneQuery = zoneQuery.eq("unit_count_range", filters.unit_count_range);
                if (filters?.age_category) zoneQuery = zoneQuery.eq("age_category", filters.age_category);
                if (filters?.has_amenities !== undefined) zoneQuery = zoneQuery.eq("has_amenities", filters.has_amenities);

                const { data } = await zoneQuery;
                matchingProfiles = data || [];
            }

            // 3. Fallback to all profiles if still empty and fallback permitted
            if (matchingProfiles.length < 2 && fallbackIfEmpty) {
                usedFallback = true;
                let globalQuery = adminSupabase
                    .from("building_profiles")
                    .select("id, building_name");

                if (filters?.unit_count_range) globalQuery = globalQuery.eq("unit_count_range", filters.unit_count_range);
                if (filters?.age_category) globalQuery = globalQuery.eq("age_category", filters.age_category);
                if (filters?.has_amenities !== undefined) globalQuery = globalQuery.eq("has_amenities", filters.has_amenities);

                const { data } = await globalQuery;
                matchingProfiles = data || [];
            }


            const matchingBuildingNames = new Set(
                matchingProfiles
                    .filter(p => p.building_name)
                    .map((p: any) => p.building_name.toLowerCase().trim())
            );

            if (matchingBuildingNames.size > 0) {
                const filteredByProfile = filteredAnalyses.filter((analysis: any) => {
                    const normalizedName = analysis.building_name?.toLowerCase().trim();
                    return normalizedName && matchingBuildingNames.has(normalizedName);
                });

                const buildingsInFiltered = new Set(filteredByProfile.map((a: any) => a.building_name)).size;
                const periodsInFiltered = new Set(filteredByProfile.map((a: any) => a.period)).size;

                if (buildingsInFiltered >= 2 && periodsInFiltered >= 2) {
                    filteredAnalyses = filteredByProfile;
                } else if (fallbackIfEmpty) {
                    usedFallback = true;
                } else {
                    filteredAnalyses = [];
                }
            } else if (fallbackIfEmpty) {
                usedFallback = true;
            } else {
                filteredAnalyses = [];
            }
        }

        const trendResult = ComparisonService.calculateBuildingsTrend(
            filteredAnalyses as any,
            filters?.excludeBuilding,
            filters?.excludeUserId
        );

        const result = {
            data: trendResult.trend,
            stats: {
                totalBuildings: trendResult.stats.totalBuildings,
                totalAnalyses: trendResult.stats.totalAnalyses,
                periodsCount: trendResult.stats.periodsCount,
                filtersApplied,
                usedFallback
            }
        };

        // 3. Update cache if possible
        try {
            await adminSupabase
                .from("market_trends_cache")
                .upsert({
                    filter_key: filterKey,
                    data: result.data,
                    stats: result.stats,
                    created_at: new Date().toISOString()
                });
        } catch (err) {
            // Silently fail if table doesn't exist
        }

        return {
            success: true,
            ...result,
            cached: false
        };
    }
}
