import { createServiceClient } from "../../config/supabase.ts";
import type { InflationData } from "../../types/inflation.types.ts";

export class InflationRepository {
  private supabase = createServiceClient();

  async getInflationData(): Promise<{ data?: InflationData[], error?: { message: string } }> {
    const { data, error } = await this.supabase
      .from("inflation_data")
      .select("period, value, is_estimated")
      .order("period", { ascending: true });

    return { data: data || undefined, error };
  }

  async createInflationData(inflationData: Array<{
    period: string;
    value: number;
    is_estimated: boolean;
  }>) {
    const { data, error } = await this.supabase
      .from("inflation_data")
      .insert(inflationData)
      .select();

    return { data, error };
  }

  async updateInflationData(
    period: string, 
    updates: { value: number; is_estimated: boolean }
  ) {
    const { data, error } = await this.supabase
      .from("inflation_data")
      .update(updates)
      .eq("period", period)
      .select()
      .single();

    return { data, error };
  }

  async getInflationByPeriod(period: string): Promise<{ data?: InflationData, error?: { message: string } }> {
    const { data, error } = await this.supabase
      .from("inflation_data")
      .select("*")
      .eq("period", period)
      .single();

    return { data: data || undefined, error };
  }
}
