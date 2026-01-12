import { useState, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-ui-react";
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
  calculateEvolution: (analyses: Analysis[]) => void;
  fetchInflationData: () => Promise<void>;
  fetchBuildingsTrend: (buildingName?: string) => Promise<void>;
  calculateDeviation: () => void;
  clearError: () => void;
  reset: () => void;
}

export function useEvolution(): UseEvolutionState & UseEvolutionActions {
  const supabase = useSupabaseClient();
  const [state, setState] = useState<UseEvolutionState>({
    evolutionData: [],
    deviation: null,
    inflationData: [],
    buildingsTrendStats: null,
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setState({
      evolutionData: [],
      deviation: null,
      inflationData: [],
      buildingsTrendStats: null,
      loading: false,
      error: null,
    });
  }, []);

  const calculateEvolution = useCallback((analyses: Analysis[]) => {
    if (analyses.length < 2) {
      setState(prev => ({ ...prev, evolutionData: [], deviation: null }));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Sort analyses by period_date or created_at
      const sortedAnalyses = [...analyses].sort((a, b) => {
        if (a.period_date && b.period_date) {
          return new Date(a.period_date).getTime() - new Date(b.period_date).getTime();
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const baseTotal = sortedAnalyses[0]?.total_amount || 0;
      const evolutionData: EvolutionData[] = [];

      for (const analysis of sortedAnalyses) {
        const userPercent = baseTotal > 0 ? ((analysis.total_amount - baseTotal) / baseTotal) * 100 : 0;
        
        evolutionData.push({
          period: analysis.period,
          userPercent: parseFloat(userPercent.toFixed(1)),
          inflationPercent: null, // Will be filled when inflation data is available
          inflationEstimated: false,
          buildingsPercent: null, // Will be filled when buildings trend is available
        });
      }

      setState(prev => ({ ...prev, evolutionData }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al calcular evolución");
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const fetchInflationData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("inflation_data")
        .select("*")
        .order("period", { ascending: true });

      if (error) throw error;

      setState(prev => ({ ...prev, inflationData: data || [] }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar datos de inflación");
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const fetchBuildingsTrend = useCallback(async (buildingName?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("expense_analyses")
        .select("building_name, period, total_amount")
        .eq("status", "completed")
        .order("period", { ascending: true });

      if (error) throw error;

      // Calculate buildings trend statistics
      const analyses = data || [];
      const totalBuildings = new Set(analyses.map(a => a.building_name)).size;
      const totalAnalyses = analyses.length;
      
      // Group by building and calculate average increase
      const buildingIncreases = new Map<string, number[]>();
      
      analyses.forEach(analysis => {
        if (!buildingIncreases.has(analysis.building_name)) {
          buildingIncreases.set(analysis.building_name, []);
        }
        buildingIncreases.get(analysis.building_name)?.push(analysis.total_amount);
      });

      const increases: number[] = [];
      buildingIncreases.forEach(amounts => {
        if (amounts.length >= 2) {
          const base = amounts[0];
          const latest = amounts[amounts.length - 1];
          const increase = ((latest - base) / base) * 100;
          increases.push(increase);
        }
      });

      const averageIncrease = increases.length > 0 
        ? increases.reduce((sum, inc) => sum + inc, 0) / increases.length 
        : 0;
      
      const medianIncrease = increases.length > 0
        ? increases.sort((a, b) => a - b)[Math.floor(increases.length / 2)]
        : 0;

      const buildingsTrendStats: BuildingsTrendStats = {
        totalBuildings,
        totalAnalyses,
        averageIncrease: parseFloat(averageIncrease.toFixed(1)),
        medianIncrease: parseFloat(medianIncrease.toFixed(1)),
      };

      setState(prev => ({ ...prev, buildingsTrendStats }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar tendencias de edificios");
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const calculateDeviation = useCallback(() => {
    const { evolutionData, inflationData, buildingsTrendStats } = state;
    
    if (evolutionData.length < 2) {
      setState(prev => ({ ...prev, deviation: null }));
      return;
    }

    try {
      const lastPoint = evolutionData[evolutionData.length - 1];
      
      // Calculate deviation from inflation
      let fromInflation = 0;
      if (lastPoint.inflationPercent !== null) {
        fromInflation = lastPoint.userPercent - lastPoint.inflationPercent;
      }

      // Calculate deviation from buildings average
      let fromBuildings = 0;
      if (buildingsTrendStats) {
        fromBuildings = lastPoint.userPercent - buildingsTrendStats.averageIncrease;
      }

      const deviation: DeviationAnalysis = {
        fromInflation: parseFloat(fromInflation.toFixed(1)),
        fromBuildings: parseFloat(fromBuildings.toFixed(1)),
        isSignificant: Math.abs(fromInflation) > 10 || Math.abs(fromBuildings) > 10,
      };

      setState(prev => ({ ...prev, deviation }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al calcular desviación");
    }
  }, [state, setError]);

  return {
    ...state,
    calculateEvolution,
    fetchInflationData,
    fetchBuildingsTrend,
    calculateDeviation,
    clearError,
    reset,
  };
}
