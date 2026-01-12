export interface InflationData {
  period: string;
  value: number;
  is_estimated: boolean;
}

export interface InflationResponse {
  data: InflationData[];
}
