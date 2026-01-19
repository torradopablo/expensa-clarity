import { createSupabaseClient } from "../../config/supabase.ts";
import { ComparisonService } from "./ComparisonService.ts";

export interface MarketTrendFilters {
    unit_count_range?: string;
    age_category?: string;
    zone?: string;
    has_amenities?: boolean;
    category?: string;
}

export class TrendService {
    private supabase: ReturnType<typeof createSupabaseClient>;

    constructor(authHeader?: string) {
        this.supabase = createSupabaseClient(authHeader);
    }

    async getInflationData() {
        const { data, error } = await this.supabase
            .from("inflation_data")
            .select("period, value, is_estimated")
            .order("period", { ascending: true });
        return { data, error };
    }

    async getMarketTrend(filters?: MarketTrendFilters, fallbackIfEmpty = true) {
        const category = filters?.category;

        // Build the query
        let query = this.supabase
            .from("expense_analyses")
            .select(`
        period, 
        total_amount, 
        building_name, 
        created_at,
        building_profile_id
        ${category ? ', expense_categories!inner(name, current_amount)' : ''}
      `)
            .eq("status", "completed")
            .not("building_name", "is", null);

        if (category) {
            query = query.eq("expense_categories.name", category);
        }

        const { data: allAnalyses, error } = await query.order("created_at", { ascending: true });

        if (error) throw error;

        let filteredAnalyses = allAnalyses || [];
        let usedFallback = false;
        let filtersApplied = false;

        const profileFilters = { ...filters };
        delete profileFilters.category;

        if (Object.keys(profileFilters).length > 0) {
            filtersApplied = true;

            let profilesQuery = this.supabase.from("building_profiles").select("id, building_name");

            if (filters?.unit_count_range) {
                profilesQuery = profilesQuery.eq("unit_count_range", filters.unit_count_range);
            }
            if (filters?.age_category) {
                profilesQuery = profilesQuery.eq("age_category", filters.age_category);
            }
            if (filters?.zone) {
                profilesQuery = profilesQuery.eq("zone", filters.zone);
            }
            if (filters?.has_amenities !== undefined) {
                profilesQuery = profilesQuery.eq("has_amenities", filters.has_amenities);
            }

            const { data: matchingProfiles, error: profilesError } = await profilesQuery;

            if (profilesError) throw profilesError;

            const matchingBuildingNames = new Set(
                (matchingProfiles || []).map((p: any) => p.building_name.toLowerCase().trim())
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
                    filteredAnalyses = filteredByProfile;
                }
            } else if (fallbackIfEmpty) {
                usedFallback = true;
            } else {
                filteredAnalyses = [];
            }
        }

        const trendResult = ComparisonService.calculateBuildingsTrend(filteredAnalyses as any, undefined);

        // If category was used, we need to handle the amounts differently in calculateBuildingsTrend
        // or manually adjust it here. ComparisonService.calculateBuildingsTrend uses `total_amount`.
        // Let's update it to respect the category amount if present.

        const trendData = trendResult.trend;

        return {
            success: true,
            data: trendData,
            stats: {
                totalBuildings: trendResult.stats.totalBuildings,
                totalAnalyses: trendResult.stats.totalAnalyses,
                periodsCount: trendResult.stats.periodsCount,
                filtersApplied,
                usedFallback
            }
        };
    }
}
