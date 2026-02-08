import { createServiceClient } from "../../config/supabase.ts";

export class InflationCacheService {
  private adminSupabase = createServiceClient();
  private CACHE_TTL_HOURS = 168; // 7 días (los datos de inflación cambian mensualmente)

  async getCachedInflationData(): Promise<{ data: any; cached: boolean } | null> {
    try {
      const { data: cacheEntry, error } = await this.adminSupabase
        .from("inflation_cache")
        .select("*")
        .eq("cache_key", "inflation_data")
        .single();

      if (error || !cacheEntry) {
        return null;
      }

      // Verificar si no ha expirado
      if (new Date(cacheEntry.expires_at) < new Date()) {
        await this.invalidateCache();
        return null;
      }

      console.log(`Inflation cache HIT, last updated: ${cacheEntry.last_updated}`);
      
      return {
        data: cacheEntry.data,
        cached: true
      };

    } catch (error) {
      console.log("Inflation cache retrieval error:", error);
      return null;
    }
  }

  async cacheInflationData(inflationData: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_TTL_HOURS);

      await this.adminSupabase
        .from("inflation_cache")
        .upsert({
          cache_key: "inflation_data",
          data: inflationData,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        });

      console.log(`Inflation data cached, expires: ${expiresAt.toISOString()}`);

    } catch (error) {
      console.log("Inflation cache storage error:", error);
    }
  }

  async invalidateCache(): Promise<void> {
    try {
      await this.adminSupabase
        .from("inflation_cache")
        .delete()
        .eq("cache_key", "inflation_data");

      console.log("Inflation cache invalidated");

    } catch (error) {
      console.log("Inflation cache invalidation error:", error);
    }
  }

  async getCacheStats(): Promise<any> {
    try {
      const { data, error } = await this.adminSupabase
        .from("inflation_cache")
        .select("*")
        .eq("cache_key", "inflation_data")
        .single();

      return { data, error };

    } catch (error) {
      console.log("Inflation cache stats error:", error);
      return null;
    }
  }
}
