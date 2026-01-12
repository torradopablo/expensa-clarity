import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react";

interface TrendDataPoint {
  period: string;
  userPercent: number;
  inflationPercent: number | null;
  inflationEstimated?: boolean;
  buildingsPercent: number | null;
}

interface BuildingsTrendStats {
  totalBuildings: number;
  totalAnalyses: number;
  periodsCount: number;
  filtersApplied: boolean;
  usedFallback?: boolean;
}

interface EvolutionComparisonChartProps {
  data: TrendDataPoint[];
  buildingName: string;
  deviation?: {
    fromInflation: number;
    fromBuildings: number;
    isSignificant: boolean;
  };
  analysis?: string | null;
  isLoadingAnalysis?: boolean;
  buildingsTrendStats?: BuildingsTrendStats | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {entry.value !== null ? `${entry.value > 0 ? "+" : ""}${entry.value.toFixed(1)}%` : "N/A"}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const EvolutionComparisonChart = ({ 
  data, 
  buildingName, 
  deviation, 
  analysis, 
  isLoadingAnalysis,
  buildingsTrendStats
}: EvolutionComparisonChartProps) => {
  console.log("EvolutionComparisonChart received:", { 
    dataLength: data.length, 
    buildingName, 
    deviation, 
    hasAnalysis: !!analysis,
    isLoadingAnalysis,
    buildingsTrendStats 
  });

  const hasInflationData = data.some(d => d.inflationPercent !== null);
  const hasBuildingsData = data.some(d => d.buildingsPercent !== null);
  const hasEstimatedData = data.some(d => d.inflationEstimated);

  // Alert only when user's expenses are ABOVE benchmarks (bad)
  const alertLevel = useMemo(() => {
    if (!deviation) return null;
    // Only alert when expenses are growing FASTER than benchmarks
    const maxPositiveDeviation = Math.max(
      deviation.fromInflation,
      deviation.fromBuildings
    );
    if (maxPositiveDeviation > 15) return "critical";
    if (maxPositiveDeviation > 10) return "high";
    if (maxPositiveDeviation > 5) return "medium";
    return null;
  }, [deviation]);

  // Check if user is doing well (at or below benchmarks)
  const isPerformingWell = useMemo(() => {
    if (!deviation) return false;
    return deviation.fromInflation <= 0 && deviation.fromBuildings <= 0;
  }, [deviation]);

  return (
    <Card variant="elevated" className="animate-fade-in-up">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg">Evolución comparativa (%)</CardTitle>
            <CardDescription>
              Comparación normalizada desde el primer período
            </CardDescription>
            {buildingsTrendStats && hasBuildingsData && (
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    buildingsTrendStats.filtersApplied && !buildingsTrendStats.usedFallback 
                      ? "border-primary/50 text-primary bg-primary/10" 
                      : "border-muted-foreground/30"
                  }`}
                >
                  <Info className="w-3 h-3 mr-1" />
                  {buildingsTrendStats.filtersApplied && !buildingsTrendStats.usedFallback 
                    ? `Comparando con ${buildingsTrendStats.totalBuildings} edificios similares`
                    : `Comparando con ${buildingsTrendStats.totalBuildings} edificios totales`
                  }
                </Badge>
                {buildingsTrendStats.usedFallback && buildingsTrendStats.filtersApplied && (
                  <span className="text-xs text-muted-foreground">
                    (sin suficientes datos similares)
                  </span>
                )}
              </div>
            )}
          </div>
          {alertLevel ? (
            <Badge 
              variant="destructive"
              className="flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              {alertLevel === "critical" ? "Desvío crítico" : 
               alertLevel === "high" ? "Desvío alto" : "Desvío moderado"}
            </Badge>
          ) : isPerformingWell ? (
            <Badge 
              variant="secondary"
              className="flex items-center gap-1 bg-status-ok-bg text-status-ok border-status-ok/30"
            >
              <TrendingDown className="w-3 h-3" />
              Dentro de parámetros
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              
              {/* User's building - Primary color to match other charts */}
              <Line
                type="monotone"
                dataKey="userPercent"
                name="Tu edificio"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              
              {/* Inflation - Orange/Amber */}
              {hasInflationData && (
                <Line
                  type="monotone"
                  dataKey="inflationPercent"
                  name="Inflación Argentina"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray={hasEstimatedData ? "5 5" : undefined}
                  dot={{ fill: "#f59e0b", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              )}
              
              {/* Other buildings average - Purple */}
              {hasBuildingsData && (
                <Line
                  type="monotone"
                  dataKey="buildingsPercent"
                  name="Promedio otros edificios"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {hasEstimatedData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Línea punteada indica datos estimados de inflación</span>
          </div>
        )}

        {/* Deviation indicators */}
        {deviation && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* vs Inflation card */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              deviation.fromInflation > 5 
                ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" 
                : deviation.fromInflation <= 0
                  ? "bg-status-ok-bg border border-status-ok/30"
                  : "bg-muted"
            }`}>
              {deviation.fromInflation > 5 ? (
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : deviation.fromInflation <= 0 ? (
                <TrendingDown className="w-5 h-5 text-status-ok" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted-foreground/20" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">vs Inflación</p>
                <p className={`font-semibold ${
                  deviation.fromInflation > 5 ? "text-red-600 dark:text-red-400" :
                  deviation.fromInflation <= 0 ? "text-status-ok" : ""
                }`}>
                  {deviation.fromInflation > 0 ? "+" : ""}{deviation.fromInflation.toFixed(1)} pp
                  {deviation.fromInflation <= 0 && " ✓"}
                </p>
              </div>
            </div>
            {/* vs Other buildings card */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              deviation.fromBuildings > 5 
                ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" 
                : deviation.fromBuildings <= 0
                  ? "bg-status-ok-bg border border-status-ok/30"
                  : "bg-muted"
            }`}>
              {deviation.fromBuildings > 5 ? (
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : deviation.fromBuildings <= 0 ? (
                <TrendingDown className="w-5 h-5 text-status-ok" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted-foreground/20" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">vs Otros edificios</p>
                <p className={`font-semibold ${
                  deviation.fromBuildings > 5 ? "text-red-600 dark:text-red-400" :
                  deviation.fromBuildings <= 0 ? "text-status-ok" : ""
                }`}>
                  {deviation.fromBuildings > 0 ? "+" : ""}{deviation.fromBuildings.toFixed(1)} pp
                  {deviation.fromBuildings <= 0 && " ✓"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {isLoadingAnalysis && (
          <div className="p-4 rounded-lg bg-muted animate-pulse">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
          </div>
        )}
        
        {analysis && !isLoadingAnalysis && (
          <div className={`p-4 rounded-lg border ${
            alertLevel === "critical" || alertLevel === "high"
              ? "bg-status-attention-bg border-status-attention/30"
              : "bg-primary-soft border-primary/20"
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                alertLevel === "critical" || alertLevel === "high"
                  ? "bg-status-attention/20"
                  : "bg-primary/20"
              }`}>
                {alertLevel === "critical" || alertLevel === "high" ? (
                  <AlertTriangle className="w-4 h-4 text-status-attention" />
                ) : (
                  <Info className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm mb-1">Análisis inteligente</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvolutionComparisonChart;
