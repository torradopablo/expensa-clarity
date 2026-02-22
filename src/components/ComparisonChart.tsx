import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";

interface CategoryComparison {
  name: string;
  leftAmount: number;
  rightAmount: number;
  diff: number;
  changePercent: number | null;
  leftSubcategories?: any[];
  rightSubcategories?: any[];
}

interface ComparisonChartProps {
  data: CategoryComparison[];
  leftLabel: string;
  rightLabel: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const left = payload.find((p: any) => p.dataKey === "leftAmount");
    const right = payload.find((p: any) => p.dataKey === "rightAmount");
    const diff = right && left ? right.value - left.value : 0;
    const changePercent = left?.value > 0 ? ((right?.value - left?.value) / left?.value) * 100 : 0;

    return (
      <div className="bg-popover border border-border rounded-xl p-4 shadow-2xl backdrop-blur-md bg-opacity-95 max-w-[300px]">
        <p className="font-bold text-base mb-3 border-b pb-2">{label}</p>
        {left && (
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1 flex justify-between">
              Base <span>{formatCurrency(left.value)}</span>
            </p>
            {left.payload.leftSubcategories?.length > 0 && (
              <div className="space-y-1 ml-2 border-l-2 border-secondary/30 pl-2">
                {left.payload.leftSubcategories.slice(0, 5).map((sub: any, i: number) => (
                  <p key={i} className="text-[10px] text-muted-foreground flex justify-between">
                    <span className="truncate mr-2">{sub.name}</span>
                    <span className="font-medium shrink-0">{formatCurrency(sub.amount)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        {right && (
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1 flex justify-between">
              Comparar <span>{formatCurrency(right.value)}</span>
            </p>
            {right.payload.rightSubcategories?.length > 0 && (
              <div className="space-y-1 ml-2 border-l-2 border-primary/30 pl-2">
                {right.payload.rightSubcategories.slice(0, 5).map((sub: any, i: number) => (
                  <p key={i} className="text-[10px] text-muted-foreground flex justify-between">
                    <span className="truncate mr-2">{sub.name}</span>
                    <span className="font-medium shrink-0">{formatCurrency(sub.amount)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className={`text-sm font-black mt-3 pt-3 border-t flex justify-between items-center ${diff > 0 ? "text-status-attention" : diff < 0 ? "text-status-ok" : "text-muted-foreground"}`}>
          <span>Diferencia</span>
          <span>{diff > 0 ? "+" : ""}{formatCurrency(diff)} ({changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%)</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ComparisonChart = ({ data, leftLabel, rightLabel }: ComparisonChartProps) => {
  if (!data.length) return null;

  // Take top 8 categories by amount for better visualization
  const chartData = data.slice(0, 8).map(cat => ({
    name: cat.name.length > 12 ? cat.name.substring(0, 12) + "..." : cat.name,
    fullName: cat.name,
    leftAmount: cat.leftAmount,
    rightAmount: cat.rightAmount,
    diff: cat.diff,
    leftSubcategories: cat.leftSubcategories || [],
    rightSubcategories: cat.rightSubcategories || [],
  }));

  return (
    <Card className="animate-fade-in-up">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Comparación Visual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                className="fill-muted-foreground"
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => (
                  <span className="text-sm text-foreground">
                    {value === "leftAmount" ? leftLabel : rightLabel}
                  </span>
                )}
              />
              <Bar
                dataKey="leftAmount"
                name="leftAmount"
                radius={[4, 4, 0, 0]}
                className="fill-secondary"
              />
              <Bar
                dataKey="rightAmount"
                name="rightAmount"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    className={entry.diff > 0 ? "fill-status-attention" : entry.diff < 0 ? "fill-status-ok" : "fill-primary"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Las barras naranjas indican aumento, las verdes disminución respecto al análisis base
        </p>
      </CardContent>
    </Card>
  );
};
