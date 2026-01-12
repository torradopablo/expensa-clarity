import { createSupabaseClient } from "../../config/supabase.ts";
import type { BuildingProfile } from "../../types/analysis.types.ts";

export class BuildingRepository {
  private supabase: ReturnType<typeof createSupabaseClient>;

  constructor(authHeader?: string) {
    this.supabase = createSupabaseClient(authHeader);
  }

  async getBuildingProfile(userId: string, buildingName: string) {
    const { data, error } = await this.supabase
      .from("building_profiles")
      .select("id, country, province, city, neighborhood, zone, unit_count_range, age_category, has_amenities, amenities")
      .eq("user_id", userId)
      .eq("building_name", buildingName)
      .single();

    return { data, error };
  }

  async createBuildingProfile(profileData: {
    user_id: string;
    building_name: string;
    country?: string;
    province?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    zone?: string | null;
    unit_count_range?: string | null;
    age_category?: string | null;
    has_amenities?: boolean;
    amenities?: string[];
  }) {
    const { data, error } = await this.supabase
      .from("building_profiles")
      .insert(profileData)
      .select()
      .single();

    return { data, error };
  }

  async updateBuildingProfile(id: string, updates: Partial<{
    country: string;
    province: string;
    city: string;
    neighborhood: string;
    zone: string;
    unit_count_range: string;
    age_category: string;
    has_amenities: boolean;
    amenities: string[];
  }>) {
    const { data, error } = await this.supabase
      .from("building_profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  }

  async mergeBuildingProfile(userId: string, buildingName: string, newProfile: BuildingProfile) {
    // First check if profile exists
    const { data: existingProfile } = await this.getBuildingProfile(userId, buildingName);

    if (existingProfile) {
      // Update only if new data is more complete (don't overwrite existing with nulls)
      const updates: Record<string, unknown> = {};
      
      if (newProfile.country && !existingProfile.country) {
        updates.country = newProfile.country;
      }
      if (newProfile.province && !existingProfile.province) {
        updates.province = newProfile.province;
      }
      if (newProfile.city && !existingProfile.city) {
        updates.city = newProfile.city;
      }
      if (newProfile.neighborhood && !existingProfile.neighborhood) {
        updates.neighborhood = newProfile.neighborhood;
      }
      if (newProfile.zone && !existingProfile.zone) {
        updates.zone = newProfile.zone;
      }
      if (newProfile.unit_count_range && !existingProfile.unit_count_range) {
        updates.unit_count_range = newProfile.unit_count_range;
      }
      if (newProfile.age_category && !existingProfile.age_category) {
        updates.age_category = newProfile.age_category;
      }
      if (newProfile.has_amenities !== null && newProfile.has_amenities !== undefined && !existingProfile.has_amenities) {
        updates.has_amenities = newProfile.has_amenities;
      }
      if (newProfile.amenities && newProfile.amenities.length > 0) {
        // Merge amenities without duplicates
        const existingAmenities = existingProfile.amenities || [];
        const newAmenities = [...new Set([...existingAmenities, ...newProfile.amenities])];
        if (newAmenities.length > existingAmenities.length) {
          updates.amenities = newAmenities;
        }
      }

      if (Object.keys(updates).length > 0) {
        return await this.updateBuildingProfile(existingProfile.id, updates);
      }

      return { data: existingProfile, error: null };
    } else {
      // Create new profile
      return await this.createBuildingProfile({
        user_id: userId,
        building_name: buildingName,
        country: newProfile.country || "Argentina",
        province: newProfile.province || null,
        city: newProfile.city || null,
        neighborhood: newProfile.neighborhood || null,
        zone: newProfile.zone || null,
        unit_count_range: newProfile.unit_count_range || null,
        age_category: newProfile.age_category || null,
        has_amenities: newProfile.has_amenities || false,
        amenities: newProfile.amenities || [],
      });
    }
  }
}
