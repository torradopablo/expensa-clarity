import { createServiceClient } from "../../config/supabase.ts";

interface CacheEntry {
  analysis_id: string;
  token: string;
  response_data: any;
  expires_at: string;
  access_count: number;
  last_accessed: string;
}

export class SharedAnalysisCacheService {
  private adminSupabase = createServiceClient();
  private CACHE_TTL_HOURS = 24; // 24 horas de caché

  async getCachedAnalysis(token: string): Promise<{ data: any; cached: boolean } | null> {
    try {
      const { data: cacheEntry, error } = await this.adminSupabase
        .from("shared_analysis_cache")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !cacheEntry) {
        return null;
      }

      // Verificar si no ha expirado
      if (new Date(cacheEntry.expires_at) < new Date()) {
        await this.invalidateCache(cacheEntry.analysis_id);
        return null;
      }

      // Actualizar estadísticas de acceso
      await this.adminSupabase
        .from("shared_analysis_cache")
        .update({
          access_count: cacheEntry.access_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq("token", token);

      console.log(`Cache HIT for token: ${token}, accesses: ${cacheEntry.access_count + 1}`);
      
      return {
        data: cacheEntry.response_data,
        cached: true
      };

    } catch (error) {
      console.log("Cache retrieval error:", error);
      return null;
    }
  }

  async cacheAnalysis(
    analysisId: string, 
    token: string, 
    responseData: any
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_TTL_HOURS);

      await this.adminSupabase
        .from("shared_analysis_cache")
        .upsert({
          analysis_id: analysisId,
          token: token,
          response_data: responseData,
          expires_at: expiresAt.toISOString(),
          access_count: 0,
          last_accessed: new Date().toISOString()
        });

      console.log(`Analysis cached for token: ${token}, expires: ${expiresAt.toISOString()}`);

    } catch (error) {
      console.log("Cache storage error:", error);
      // No fallar si el caché falla
    }
  }

  async invalidateCache(analysisId: string): Promise<void> {
    try {
      await this.adminSupabase
        .from("shared_analysis_cache")
        .delete()
        .eq("analysis_id", analysisId);

      console.log(`Cache invalidated for analysis: ${analysisId}`);

    } catch (error) {
      console.log("Cache invalidation error:", error);
    }
  }

  async cleanupExpiredCache(): Promise<void> {
    try {
      const { data, error } = await this.adminSupabase
        .from("shared_analysis_cache")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (!error) {
        console.log(`Cleaned up expired cache entries`);
      }

    } catch (error) {
      console.log("Cache cleanup error:", error);
    }
  }

  async getCacheStats(): Promise<any> {
    try {
      const { data, error } = await this.adminSupabase
        .from("shared_analysis_cache")
        .select(`
          analysis_id,
          token,
          access_count,
          last_accessed,
          created_at,
          expires_at
        `)
        .order("access_count", { ascending: false })
        .limit(10);

      return { data, error };

    } catch (error) {
      console.log("Cache stats error:", error);
      return null;
    }
  }
}
