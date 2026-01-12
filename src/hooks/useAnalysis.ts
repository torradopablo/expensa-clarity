import { useState, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-ui-react";
import type { Analysis, Category, BuildingProfile } from "../types/analysis";

export interface UseAnalysisState {
  analyses: Analysis[];
  categories: Category[];
  buildingProfiles: BuildingProfile[];
  loading: boolean;
  error: string | null;
}

export interface UseAnalysisActions {
  fetchAnalyses: () => Promise<void>;
  fetchCategories: (analysisId: string) => Promise<void>;
  createAnalysis: (data: Partial<Analysis>) => Promise<Analysis | null>;
  updateAnalysis: (id: string, data: Partial<Analysis>) => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  uploadFile: (file: File, analysisId: string) => Promise<string | null>;
  processExpense: (file: File, analysisId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisState & UseAnalysisActions {
  const supabase = useSupabaseClient();
  const [state, setState] = useState<UseAnalysisState>({
    analyses: [],
    categories: [],
    buildingProfiles: [],
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
      analyses: [],
      categories: [],
      buildingProfiles: [],
      loading: false,
      error: null,
    });
  }, []);

  const fetchAnalyses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("expense_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setState(prev => ({ ...prev, analyses: data || [] }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar análisis");
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const fetchCategories = useCallback(async (analysisId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("current_amount", { ascending: false });

      if (error) throw error;

      setState(prev => ({ ...prev, categories: data || [] }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const createAnalysis = useCallback(async (data: Partial<Analysis>) => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase
        .from("expense_analyses")
        .insert({
          ...data,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        analyses: [result, ...prev.analyses]
      }));

      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al crear análisis");
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const updateAnalysis = useCallback(async (id: string, data: Partial<Analysis>) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("expense_analyses")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        analyses: prev.analyses.map(analysis =>
          analysis.id === id ? { ...analysis, ...data } : analysis
        )
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al actualizar análisis");
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const deleteAnalysis = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from("expense_analyses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        analyses: prev.analyses.filter(analysis => analysis.id !== id)
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al eliminar análisis");
    } finally {
      setLoading(false);
    }
  }, [supabase, setLoading, setError]);

  const uploadFile = useCallback(async (file: File, analysisId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const filePath = `${user.id}/${analysisId}/${file.name}`;

      const { error } = await supabase.storage
        .from("expense-files")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      return filePath;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al subir archivo");
      return null;
    }
  }, [supabase, setError]);

  const processExpense = useCallback(async (file: File, analysisId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Update status to processing
      await updateAnalysis(analysisId, { status: "processing" });

      // Upload file
      const filePath = await uploadFile(file, analysisId);
      if (!filePath) throw new Error("Error al subir archivo");

      // Create form data for edge function
      const formData = new FormData();
      formData.append("file", file);
      formData.append("analysisId", analysisId);

      // Call edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no encontrada");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-expense`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar el archivo");
      }

      // Update status to completed
      await updateAnalysis(analysisId, { status: "completed" });
      
      // Refresh analyses
      await fetchAnalyses();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al procesar archivo");
      await updateAnalysis(analysisId, { status: "error" });
    } finally {
      setLoading(false);
    }
  }, [supabase, updateAnalysis, uploadFile, fetchAnalyses, setLoading, setError]);

  return {
    ...state,
    fetchAnalyses,
    fetchCategories,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    uploadFile,
    processExpense,
    clearError,
    reset,
  };
}
