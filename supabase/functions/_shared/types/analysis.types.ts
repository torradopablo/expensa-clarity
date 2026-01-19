export interface Category {
  name: string;
  icon?: string | null;
  current_amount: number;
  previous_amount?: number | null;
  status?: "ok" | "attention" | "info";
  explanation?: string | null;
}

export interface BuildingProfile {
  country?: string | null;
  province?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  zone?: "CABA" | "GBA Norte" | "GBA Oeste" | "GBA Sur" | "Interior" | null;
  unit_count_range?: "1-10" | "11-30" | "31-50" | "51-100" | "100+" | null;
  age_category?: string | null;
  has_amenities?: boolean | null;
  amenities?: string[];
  construction_year?: number | null;
}

export interface AnalysisRequest {
  userTrend: { period: string; percent: number }[];
  inflationTrend: { period: string; percent: number }[];
  buildingsTrend: { period: string; percent: number }[];
  buildingName: string;
  categoryName?: string;
}

export interface AIResponse {
  building_name: string;
  period: string;
  period_month?: number;
  period_year?: number;
  period_date?: string;
  unit?: string;
  total_amount: number;
  previous_total?: number;
  categories: Category[];
  building_profile?: BuildingProfile;
}

// All fields are validated and sanitized
export type ValidatedAIResponse = AIResponse;

export interface DeviationAnalysis {
  fromInflation: number;
  fromBuildings: number;
  isSignificant: boolean;
}

export interface TrendData {
  period: string;
  percent: number;
}

export interface EvolutionData {
  period: string;
  userPercent: number;
  inflationPercent?: number | null;
  inflationEstimated?: boolean;
  buildingsPercent?: number | null;
}

export interface BuildingsTrendStats {
  totalBuildings: number;
  totalAnalyses: number;
  periodsCount: number;
  filtersApplied: boolean;
  usedFallback: boolean;
}
