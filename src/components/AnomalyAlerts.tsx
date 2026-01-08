import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface Category {
  id: string;
  name: string;
  current_amount: number;
  previous_amount: number | null;
  status: string;
}

interface AnomalyAlertsProps {
  categories: Category[];
  threshold?: number; // Default 30%
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const AnomalyAlerts = ({
  categories,
  threshold = 30,
}: AnomalyAlertsProps) => {
  const anomalies = useMemo(() => {
    return categories
      .filter((cat) => {
        if (!cat.previous_amount || cat.previous_amount === 0) return false;
        const change =
          ((cat.current_amount - cat.previous_amount) / cat.previous_amount) *
          100;
        return change >= threshold;
      })
      .map((cat) => ({
        ...cat,
        change:
          ((cat.current_amount - cat.previous_amount!) / cat.previous_amount!) *
          100,
        difference: cat.current_amount - cat.previous_amount!,
      }))
      .sort((a, b) => b.change - a.change);
  }, [categories, threshold]);

  if (anomalies.length === 0) {
    return null;
  }

  return (
    <Card className="border-status-attention/30 bg-status-attention-bg/30 animate-fade-in-up">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-status-attention-bg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-attention" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-status-attention mb-2">
              Alertas de aumento significativo
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Las siguientes categorías aumentaron más del {threshold}% respecto
              al mes anterior:
            </p>
            <div className="space-y-3">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{anomaly.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Anterior: {formatCurrency(anomaly.previous_amount!)} →
                      Actual: {formatCurrency(anomaly.current_amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-status-attention">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-bold">
                      +{anomaly.change.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnomalyAlerts;
