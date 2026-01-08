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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface Category {
  name: string;
  current_amount: number;
  previous_amount: number | null;
}

interface TrendChartProps {
  categories: Category[];
  period: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(346, 87%, 43%)",
];

export const TrendChart = ({ categories, period }: TrendChartProps) => {
  const chartData = useMemo(() => {
    const categoriesWithPrevious = categories.filter(
      (cat) => cat.previous_amount !== null
    );

    if (categoriesWithPrevious.length === 0) return null;

    return [
      {
        name: "Mes anterior",
        ...Object.fromEntries(
          categoriesWithPrevious.map((cat) => [cat.name, cat.previous_amount])
        ),
      },
      {
        name: period,
        ...Object.fromEntries(
          categoriesWithPrevious.map((cat) => [cat.name, cat.current_amount])
        ),
      },
    ];
  }, [categories, period]);

  const categoryNames = useMemo(() => {
    return categories
      .filter((cat) => cat.previous_amount !== null)
      .map((cat) => cat.name);
  }, [categories]);

  if (!chartData || categoryNames.length === 0) {
    return null;
  }

  return (
    <Card variant="glass" className="animate-fade-in-up">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Evolución por categoría</CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparación con el período anterior
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) =>
                `$${(value / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [formatCurrency(value), ""]}
            />
            <Legend />
            {categoryNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TrendChart;
