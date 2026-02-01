import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HistoricalEvolutionChartProps {
  buildingName: string | null;
  currentAnalysisId: string;
  currentPeriod: string;
}

interface HistoricalData {
  id: string;
  period: string;
  total_amount: number;
  created_at: string;
  period_date: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value}`;
};

export const HistoricalEvolutionChart = ({
  buildingName,
  currentAnalysisId,
  currentPeriod,
}: HistoricalEvolutionChartProps) => {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!buildingName) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("expense_analyses")
          .select("id, period, total_amount, created_at, period_date")
          .eq("building_name", buildingName)
          .order("period_date", { ascending: true, nullsFirst: false });

        if (error) throw error;

        // If no period_date, sort by created_at
        const sortedData = (data || []).sort((a, b) => {
          if (a.period_date && b.period_date) {
            return new Date(a.period_date).getTime() - new Date(b.period_date).getTime();
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        // Limit to 15 periods ending at the current analysis
        let slicedData = sortedData;
        if (sortedData.length > 0) {
          const currentIdx = sortedData.findIndex((h) => h.id === currentAnalysisId);
          if (currentIdx !== -1) {
            const startIdx = Math.max(0, currentIdx - 14); // 15 periods total including current
            slicedData = sortedData.slice(startIdx, currentIdx + 1);
          } else {
            // Fallback to last 15 if for some reason current not found
            slicedData = sortedData.slice(-15);
          }
        }

        setHistoricalData(slicedData);
      } catch (error) {
        console.error("Error fetching historical data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoricalData();
  }, [buildingName]);

  // Only show if there are at least 2 analyses
  if (isLoading || historicalData.length < 2) {
    return null;
  }

  const chartData = historicalData.map((item) => ({
    period: item.period,
    total: item.total_amount,
    isCurrent: item.id === currentAnalysisId,
  }));

  // Calculate statistics
  const totals = historicalData.map((d) => d.total_amount);
  const average = totals.reduce((a, b) => a + b, 0) / totals.length;
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const currentTotal = historicalData.find((d) => d.id === currentAnalysisId)?.total_amount || 0;
  const previousTotal = historicalData.length >= 2
    ? historicalData[historicalData.length - 2]?.total_amount
    : null;

  const overallChange = previousTotal
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : null;

  const firstTotal = historicalData[0]?.total_amount;
  const totalEvolution = firstTotal
    ? ((currentTotal - firstTotal) / firstTotal) * 100
    : null;

  return (
    <Card variant="glass" className="animate-fade-in-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center">
              <History className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">Evolución histórica</CardTitle>
              <p className="text-sm text-muted-foreground">
                {historicalData.length} análisis de {buildingName}
              </p>
            </div>
          </div>
          {totalEvolution !== null && (
            <Badge
              variant={totalEvolution > 0 ? "attention" : "ok"}
              className="flex items-center gap-1"
            >
              {totalEvolution > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {totalEvolution > 0 ? "+" : ""}{totalEvolution.toFixed(1)}% desde el primer análisis
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Promedio</p>
            <p className="font-semibold text-sm">{formatCurrency(average)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
            <p className="font-semibold text-sm text-status-ok">{formatCurrency(min)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Máximo</p>
            <p className="font-semibold text-sm text-status-attention">{formatCurrency(max)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Actual</p>
            <p className="font-semibold text-sm">{formatCurrency(currentTotal)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="period"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickFormatter={formatShortCurrency}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: number) => [formatCurrency(value), "Total"]}
              labelFormatter={(label) => `Período: ${label}`}
            />
            <ReferenceLine
              y={average}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              label={{
                value: "Promedio",
                position: "right",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorTotal)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isCurrent) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{
                r: 6,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-xs text-muted-foreground text-center mt-4">
          El punto más grande indica el análisis actual ({currentPeriod})
        </p>
      </CardContent>
    </Card>
  );
};

export default HistoricalEvolutionChart;
