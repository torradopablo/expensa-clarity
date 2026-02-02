import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useAnalysis() {
  const queryClient = useQueryClient();

  // Queries
  const {
    data: analyses = [],
    isLoading: loadingAnalyses,
    error: errorAnalyses,
    refetch: fetchAnalyses
  } = useQuery({
    queryKey: ["analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Analysis[];
    },
  });

  // Categories query (needs a specific ID, so we might keep it dynamic or use a placeholder)
  const fetchCategoriesQuery = (analysisId: string) => useQuery({
    queryKey: ["categories", analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("current_amount", { ascending: false });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!analysisId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Analysis>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: result, error } = await supabase
        .from("expense_analyses")
        .insert({
          ...data,
          user_id: user.id,
          status: "pending",
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result as Analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Analysis> }) => {
      const { error } = await supabase
        .from("expense_analyses")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_analyses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });

  // Helper actions
  const uploadFile = async (file: File, analysisId: string): Promise<string | null> => {
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
      console.error("Error al subir archivo:", error);
      return null;
    }
  };

  const processExpense = async (file: File, analysisId: string) => {
    try {
      // Update status to processing
      await updateMutation.mutateAsync({ id: analysisId, data: { status: "processing" } });

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
      await updateMutation.mutateAsync({ id: analysisId, data: { status: "completed" } });

      // Refresh analyses
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    } catch (error) {
      console.error("Error al procesar archivo:", error);
      await updateMutation.mutateAsync({ id: analysisId, data: { status: "error" } });
    }
  };

  return {
    analyses,
    loading: loadingAnalyses || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: errorAnalyses ? (errorAnalyses as Error).message : null,
    fetchAnalyses: async () => { await fetchAnalyses(); },
    createAnalysis: createMutation.mutateAsync,
    updateAnalysis: (id: string, data: Partial<Analysis>) => updateMutation.mutateAsync({ id, data }),
    deleteAnalysis: deleteMutation.mutateAsync,
    uploadFile,
    processExpense,
    clearError: () => { }, // Handled by React Query's error state
    reset: () => {
      queryClient.resetQueries({ queryKey: ["analyses"] });
    },
  };
}
