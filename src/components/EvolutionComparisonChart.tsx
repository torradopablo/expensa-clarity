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
  isLoadingAnalysis 
}: EvolutionComparisonChartProps) => {
  const hasInflationData = data.some(d => d.inflationPercent !== null);
  const hasBuildingsData = data.some(d => d.buildingsPercent !== null);
  const hasEstimatedData = data.some(d => d.inflationEstimated);

  const alertLevel = useMemo(() => {
    if (!deviation) return null;
    const maxDeviation = Math.max(
      Math.abs(deviation.fromInflation),
      Math.abs(deviation.fromBuildings)
    );
    if (maxDeviation > 15) return "critical";
    if (maxDeviation > 10) return "high";
    if (maxDeviation > 5) return "medium";
    return null;
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
          </div>
          {alertLevel && (
            <Badge 
              variant={alertLevel === "critical" ? "destructive" : alertLevel === "high" ? "destructive" : "secondary"}
              className="flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              {alertLevel === "critical" ? "Desvío crítico" : 
               alertLevel === "high" ? "Desvío alto" : "Desvío moderado"}
            </Badge>
          )}
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
              
              {/* User's building - Blue */}
              <Line
                type="monotone"
                dataKey="userPercent"
                name="Tu edificio"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: "#2563eb", strokeWidth: 0, r: 4 }}
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
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              Math.abs(deviation.fromInflation) > 5 
                ? "bg-status-attention-bg" 
                : "bg-muted"
            }`}>
              {deviation.fromInflation > 5 ? (
                <TrendingUp className="w-5 h-5 text-status-attention" />
              ) : deviation.fromInflation < -5 ? (
                <TrendingDown className="w-5 h-5 text-status-ok" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted-foreground/20" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">vs Inflación</p>
                <p className={`font-semibold ${
                  deviation.fromInflation > 5 ? "text-status-attention" :
                  deviation.fromInflation < -5 ? "text-status-ok" : ""
                }`}>
                  {deviation.fromInflation > 0 ? "+" : ""}{deviation.fromInflation.toFixed(1)} pp
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              Math.abs(deviation.fromBuildings) > 5 
                ? "bg-status-attention-bg" 
                : "bg-muted"
            }`}>
              {deviation.fromBuildings > 5 ? (
                <TrendingUp className="w-5 h-5 text-status-attention" />
              ) : deviation.fromBuildings < -5 ? (
                <TrendingDown className="w-5 h-5 text-status-ok" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted-foreground/20" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">vs Otros edificios</p>
                <p className={`font-semibold ${
                  deviation.fromBuildings > 5 ? "text-status-attention" :
                  deviation.fromBuildings < -5 ? "text-status-ok" : ""
                }`}>
                  {deviation.fromBuildings > 0 ? "+" : ""}{deviation.fromBuildings.toFixed(1)} pp
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
