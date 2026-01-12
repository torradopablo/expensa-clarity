import { supabase } from "../../integrations/supabase/client";
import type { Analysis, Category, SharedAnalysis } from "../../types/analysis";

export class AnalysisService {
  static async getAnalyses(): Promise<Analysis[]> {
    const { data, error } = await supabase
      .from("expense_analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getAnalysis(id: string): Promise<Analysis> {
    const { data, error } = await supabase
      .from("expense_analyses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  static async getCategories(analysisId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("current_amount", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createAnalysis(data: Partial<Analysis>): Promise<Analysis> {
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
    return result;
  }

  static async updateAnalysis(id: string, data: Partial<Analysis>): Promise<void> {
    const { error } = await supabase
      .from("expense_analyses")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
  }

  static async deleteAnalysis(id: string): Promise<void> {
    const { error } = await supabase
      .from("expense_analyses")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  static async processExpense(file: File, analysisId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sesión no encontrada");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("analysisId", analysisId);

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
  }

  static async getSharedAnalysis(token: string): Promise<SharedAnalysis> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al obtener análisis compartido");
    }

    return response.json();
  }

  static async createSharedLink(analysisId: string): Promise<string> {
    const { data, error } = await supabase
      .from("shared_analysis_links")
      .insert({
        analysis_id: analysisId,
        token: crypto.randomUUID(),
        is_active: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        view_count: 0,
        created_at: new Date().toISOString(),
      })
      .select("token")
      .single();

    if (error) throw error;
    return data.token;
  }

  static async analyzeDeviation(request: {
    userTrend: { period: string; percent: number }[];
    inflationTrend: { period: string; percent: number }[];
    buildingsTrend: { period: string; percent: number }[];
    buildingName: string;
  }): Promise<{ analysis: string; deviation: any }> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-deviation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al analizar desviación");
    }

    return response.json();
  }
}
