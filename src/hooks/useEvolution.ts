import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Analysis, EvolutionData, DeviationAnalysis, InflationData, BuildingsTrendStats } from "../types/analysis";

export interface UseEvolutionState {
  evolutionData: EvolutionData[];
  deviation: DeviationAnalysis | null;
  inflationData: InflationData[];
  buildingsTrendStats: BuildingsTrendStats | null;
  loading: boolean;
  error: string | null;
}

export interface UseEvolutionActions {
  calculateEvolution: (analyses: Analysis[], category?: string) => void;
  fetchInflationData: () => Promise<void>;
  fetchBuildingsTrend: (buildingName?: string) => Promise<void>;
  calculateDeviation: () => void;
  clearError: () => void;
  reset: () => void;
}

export function useEvolution(category?: string, buildingName?: string) {
  const queryClient = useQueryClient();

  // Query to fetch building profile for better filtering
  const { data: buildingProfile } = useQuery({
    queryKey: ["building-profile", buildingName],
    queryFn: async () => {
      if (!buildingName || buildingName === "all") return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from("building_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("building_name", buildingName)
        .maybeSingle();

      if (error) {
        console.error("Error fetching building profile:", error);
        return null;
      }
      return data;
    },
    enabled: !!buildingName && buildingName !== "all",
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Queries
  const {
    data: inflationData = [],
    isLoading: loadingInflation,
    error: errorInflation
  } = useQuery({
    queryKey: ["inflation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inflation_data")
        .select("*")
        .order("period", { ascending: true });

      if (error) throw error;
      return data as InflationData[];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours, inflation data is mostly static
  });



  const {
    data: buildingsTrendData = null,
    isLoading: loadingTrend,
    error: errorTrend
  } = useQuery({
    queryKey: ["buildings-trend", category, buildingName, buildingProfile?.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const filters: any = {};

      // Only add category filter if it's not "all"
      if (category && category !== "all") {
        filters.category = category;
      }

      // Exclude current user's building from comparison
      if (buildingName && buildingName !== "all") {
        filters.excludeBuilding = buildingName;
      }

      if (session?.user?.id) {
        filters.excludeUserId = session.user.id;
      }

      // Add profile filters if we have a building profile
      if (buildingProfile) {
        if (buildingProfile.neighborhood) filters.neighborhood = buildingProfile.neighborhood;
        if (buildingProfile.zone) filters.zone = buildingProfile.zone;
        if (buildingProfile.unit_count_range) filters.unit_count_range = buildingProfile.unit_count_range;
        if (buildingProfile.age_category) filters.age_category = buildingProfile.age_category;
        if (buildingProfile.has_amenities !== null) filters.has_amenities = buildingProfile.has_amenities;
      }

      const { data, error } = await supabase.functions.invoke("get-buildings-trend", {
        body: {
          filters,
          fallbackIfEmpty: true // Consistent fallback strategy
        }
      });

      if (error) throw error;
      return {
        trend: data.data || [],
        stats: data.stats as BuildingsTrendStats
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // This part calculates client-side evolution based on analyses provided
  // We can keep it as a local state or just a derived value if we want to be more react-query like
  // But for now, let's keep the logic but derived from params if possible

  const calculateEvolution = useCallback((analyses: Analysis[], category?: string) => {
    if (analyses.length < 2) return [];

    const sortedAnalyses = [...analyses].sort((a, b) => {
      if (a.period_date && b.period_date) {
        return new Date(a.period_date).getTime() - new Date(b.period_date).getTime();
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const getAmount = (analysis: Analysis) => {
      if (category && category !== "all") {
        const cat = analysis.expense_categories?.find(c => c.name === category);
        return cat ? cat.current_amount : 0;
      }
      return analysis.total_amount;
    };

    const baseAmount = getAmount(sortedAnalyses[0]);

    return sortedAnalyses.map(analysis => {
      const currentAmount = getAmount(analysis);
      const userPercent = baseAmount > 0 ? ((currentAmount - baseAmount) / baseAmount) * 100 : 0;
      return {
        period: analysis.period,
        periodDate: analysis.period_date,
        userPercent: parseFloat(userPercent.toFixed(1)),
        inflationPercent: null,
        inflationEstimated: false,
        buildingsPercent: null,
      } as EvolutionData;
    });
  }, []);

  const calculateDeviation = useCallback((evolutionData: EvolutionData[], stats: BuildingsTrendStats | null) => {
    if (evolutionData.length < 2) return null;

    const lastPoint = evolutionData[evolutionData.length - 1];
    let fromInflation = 0;
    if (lastPoint.inflationPercent !== null && !isNaN(lastPoint.inflationPercent)) {
      fromInflation = lastPoint.userPercent - lastPoint.inflationPercent;
    }

    let fromBuildings = 0;
    if (stats && stats.averageIncrease !== null && !isNaN(stats.averageIncrease)) {
      fromBuildings = lastPoint.userPercent - stats.averageIncrease;
    }

    return {
      fromInflation: parseFloat(fromInflation.toFixed(1)),
      fromBuildings: parseFloat(fromBuildings.toFixed(1)),
      isSignificant: Math.abs(fromInflation) > 10 || Math.abs(fromBuildings) > 10,
    } as DeviationAnalysis;
  }, []);

  return {
    inflationData,
    buildingsTrend: buildingsTrendData?.trend || [],
    buildingsTrendStats: buildingsTrendData?.stats || null,
    loading: loadingInflation || loadingTrend,
    error: (errorInflation || errorTrend) ? ((errorInflation || errorTrend) as Error).message : null,
    calculateEvolution,
    calculateDeviation,
    fetchInflationData: async () => { queryClient.invalidateQueries({ queryKey: ["inflation"] }); },
    fetchBuildingsTrend: async () => { queryClient.invalidateQueries({ queryKey: ["buildings-trend"] }); },
    reset: () => {
      queryClient.resetQueries({ queryKey: ["inflation"] });
      queryClient.resetQueries({ queryKey: ["buildings-trend"] });
    },
  };
}
