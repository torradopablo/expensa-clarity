import { createServiceClient } from "../../config/supabase.ts";

export class CacheInvalidationService {
  private adminSupabase = createServiceClient();

  async invalidateAnalysisCache(analysisId: string): Promise<void> {
    try {
      await this.adminSupabase
        .from("shared_analysis_cache")
        .delete()
        .eq("analysis_id", analysisId);

      console.log(`Invalidated cache for analysis: ${analysisId}`);

    } catch (error) {
      console.log("Cache invalidation error:", error);
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Get all user's analyses and invalidate their cache
      const { data: analyses } = await this.adminSupabase
        .from("expense_analyses")
        .select("id")
        .eq("user_id", userId);

      if (analyses) {
        const analysisIds = analyses.map(a => a.id);
        await this.adminSupabase
          .from("shared_analysis_cache")
          .delete()
          .in("analysis_id", analysisIds);

        console.log(`Invalidated cache for user: ${userId}, analyses: ${analysisIds.length}`);
      }

    } catch (error) {
      console.log("User cache invalidation error:", error);
    }
  }

  async invalidateBuildingCache(buildingName: string): Promise<void> {
    try {
      // Get all analyses for this building and invalidate their cache
      const { data: analyses } = await this.adminSupabase
        .from("expense_analyses")
        .select("id")
        .eq("building_name", buildingName);

      if (analyses) {
        const analysisIds = analyses.map(a => a.id);
        await this.adminSupabase
          .from("shared_analysis_cache")
          .delete()
          .in("analysis_id", analysisIds);

        console.log(`Invalidated cache for building: ${buildingName}, analyses: ${analysisIds.length}`);
      }

    } catch (error) {
      console.log("Building cache invalidation error:", error);
    }
  }
}
