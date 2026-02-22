import { createSupabaseClient, createServiceClient } from "../../config/supabase.ts";
import { ComparisonService } from "./ComparisonService.ts";
import { InflationCacheService } from "../cache/InflationCacheService.ts";

export interface MarketTrendFilters {
    unit_count_range?: string;
    age_category?: string;
    neighborhood?: string;
    city?: string;
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
        let appliedFilters: string[] = [];

        const profileFilters = { ...filters };
        delete profileFilters.category;
        delete (profileFilters as any).excludeBuilding;
        delete (profileFilters as any).excludeUserId;

        if (Object.keys(profileFilters).length > 0) {
            filtersApplied = true;

            const attributeFilters: string[] = [];

            // Helper to get common filters query without pushing to state yet
            const getCommonFiltersQuery = (q: any) => {
                let currentQuery = q;
                if (filters?.unit_count_range) {
                    currentQuery = currentQuery.eq("unit_count_range", filters.unit_count_range);
                }
                if (filters?.age_category) {
                    currentQuery = currentQuery.eq("age_category", filters.age_category);
                }
                if (filters?.has_amenities !== undefined) {
                    currentQuery = currentQuery.eq("has_amenities", filters.has_amenities);
                }
                return currentQuery;
            };

            // Helper to update applied filters after success
            const pushAttributeFilters = () => {
                if (filters?.unit_count_range && !appliedFilters.includes("tamaño")) appliedFilters.push("tamaño");
                if (filters?.age_category && !appliedFilters.includes("antigüedad")) appliedFilters.push("antigüedad");
                if (filters?.has_amenities !== undefined && !appliedFilters.includes("amenities")) appliedFilters.push("amenities");
            };

            let matchingProfiles: any[] = [];

            // 1. Try with Neighborhood + other filters
            if (filters?.neighborhood) {
                let q = adminSupabase.from("building_profiles").select("id, building_name").eq("neighborhood", filters.neighborhood);
                const { data } = await getCommonFiltersQuery(q);
                if (data && data.length >= 2) {
                    matchingProfiles = data;
                    appliedFilters.push("barrio");
                    pushAttributeFilters();
                }
            }

            // 2. Try with City + other filters
            if (matchingProfiles.length < 2 && filters?.city) {
                let q = adminSupabase.from("building_profiles").select("id, building_name").eq("city", filters.city);
                const { data } = await getCommonFiltersQuery(q);
                if (data && data.length >= 2) {
                    matchingProfiles = data;
                    appliedFilters = ["ciudad"]; // Reset to city level
                    pushAttributeFilters();
                }
            }

            // 3. Try with Zone + other filters
            if (matchingProfiles.length < 2 && filters?.zone) {
                let q = adminSupabase.from("building_profiles").select("id, building_name").eq("zone", filters.zone);
                const { data } = await getCommonFiltersQuery(q);
                if (data && data.length >= 2) {
                    matchingProfiles = data;
                    appliedFilters = ["zona"]; // Reset to zone level
                    pushAttributeFilters();
                }
            }

            // 4. Fallback to all profiles (just common filters)
            if (matchingProfiles.length < 2 && fallbackIfEmpty) {
                usedFallback = true;
                let q = adminSupabase.from("building_profiles").select("id, building_name");
                const { data } = await getCommonFiltersQuery(q);
                matchingProfiles = data || [];
                appliedFilters = []; // Reset geo part
                pushAttributeFilters();
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
                usedFallback,
                appliedFilters
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
