import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Building,
  Wrench,
  Droplets,
  Zap,
  Users,
  Shield
} from "lucide-react";

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
    <div className="container flex items-center justify-between h-16">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold">ExpensaCheck</span>
      </Link>
      <Button asChild>
        <Link to="/analizar">Analizar otra expensa</Link>
      </Button>
    </div>
  </header>
);

// Sample expense data
const expenseData = {
  building: "Edificio San Martín 1234",
  period: "Noviembre 2024",
  unit: "Unidad 5B",
  total: 85420,
  previousTotal: 72350,
  categories: [
    { 
      name: "Encargado", 
      icon: Users, 
      current: 28500, 
      previous: 28500, 
      status: "ok" as const,
      explanation: "El sueldo del encargado se mantiene igual que el mes anterior."
    },
    { 
      name: "Servicios públicos", 
      icon: Zap, 
      current: 18200, 
      previous: 12800, 
      status: "attention" as const,
      explanation: "La luz aumentó un 42%. Esto coincide con el aumento de tarifas del mes."
    },
    { 
      name: "Agua y cloacas", 
      icon: Droplets, 
      current: 8900, 
      previous: 8200, 
      status: "ok" as const,
      explanation: "Aumento menor del 8.5%, dentro de lo esperado."
    },
    { 
      name: "Mantenimiento", 
      icon: Wrench, 
      current: 15800, 
      previous: 9500, 
      status: "attention" as const,
      explanation: "Hubo un gasto extraordinario de reparación del ascensor."
    },
    { 
      name: "Seguro del edificio", 
      icon: Shield, 
      current: 6500, 
      previous: 6350, 
      status: "ok" as const,
      explanation: "Ajuste mínimo del 2.4%."
    },
    { 
      name: "Administración", 
      icon: Building, 
      current: 7520, 
      previous: 7000, 
      status: "ok" as const,
      explanation: "Honorarios de administración con ajuste del 7.4%."
    },
  ]
};

const calculateChange = (current: number, previous: number) => {
  const change = ((current - previous) / previous) * 100;
  return change;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const SummaryCard = () => {
  const totalChange = calculateChange(expenseData.total, expenseData.previousTotal);
  const attentionItems = expenseData.categories.filter(c => c.status === "attention").length;

  return (
    <Card variant="glass" className="mb-8 animate-fade-in-up">
      <CardContent className="p-6 md:p-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{expenseData.building}</p>
                <h1 className="text-2xl md:text-3xl font-bold">{expenseData.period}</h1>
                <p className="text-muted-foreground">{expenseData.unit}</p>
              </div>
              <Badge variant={attentionItems > 0 ? "attention" : "ok"} className="text-sm px-3 py-1">
                {attentionItems > 0 ? (
                  <><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />{attentionItems} puntos a revisar</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Todo en orden</>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-lg">
              Tu expensa de este mes tiene algunos aumentos que merecen atención. 
              A continuación te explicamos cada uno en detalle.
            </p>
          </div>
          <div className="flex flex-col justify-center items-start md:items-end">
            <p className="text-sm text-muted-foreground mb-1">Total del mes</p>
            <p className="text-3xl md:text-4xl font-bold">{formatCurrency(expenseData.total)}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${totalChange > 0 ? "text-status-attention" : "text-status-ok"}`}>
              {totalChange > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-medium">
                {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}% vs mes anterior
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ExpenseBreakdown = () => (
  <div className="grid gap-4 mb-8">
    <h2 className="text-xl font-semibold">Detalle por categoría</h2>
    <div className="grid gap-4">
      {expenseData.categories.map((category, index) => {
        const change = calculateChange(category.current, category.previous);
        const Icon = category.icon;
        
        return (
          <Card 
            key={category.name} 
            variant="default" 
            className="animate-fade-in-up overflow-hidden"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      category.status === "attention" ? "bg-status-attention-bg" : "bg-status-ok-bg"
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        category.status === "attention" ? "text-status-attention" : "text-status-ok"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{category.name}</h3>
                        <Badge variant={category.status}>
                          {category.status === "ok" ? "OK" : "Revisar"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category.explanation}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 p-5 md:p-6 bg-muted/30 md:w-48 border-t md:border-t-0 md:border-l border-border">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Este mes</p>
                    <p className="text-lg font-bold">{formatCurrency(category.current)}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    change > 10 ? "text-status-attention" : change > 0 ? "text-muted-foreground" : "text-status-ok"
                  }`}>
                    {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {change > 0 ? "+" : ""}{change.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
);

const ComparisonChart = () => {
  const maxValue = Math.max(...expenseData.categories.map(c => Math.max(c.current, c.previous)));
  
  return (
    <Card variant="default" className="mb-8 animate-fade-in-up">
      <CardHeader>
        <CardTitle>Comparación mensual</CardTitle>
        <CardDescription>Tus gastos de este mes vs. el mes anterior</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expenseData.categories.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{category.name}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(category.previous)} → {formatCurrency(category.current)}
                </span>
              </div>
              <div className="relative h-6 flex gap-1">
                <div 
                  className="h-full rounded-md bg-muted transition-all"
                  style={{ width: `${(category.previous / maxValue) * 100}%` }}
                />
                <div 
                  className={`h-full rounded-md transition-all ${
                    category.status === "attention" ? "bg-status-attention" : "bg-primary"
                  }`}
                  style={{ width: `${(category.current / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-muted" />
            <span className="text-muted-foreground">Mes anterior</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Este mes (normal)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-status-attention" />
            <span className="text-muted-foreground">Este mes (a revisar)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InfoCard = () => (
  <Card variant="soft" className="mb-8 animate-fade-in-up">
    <CardContent className="p-6">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">¿Qué significa esto?</h3>
          <p className="text-sm text-muted-foreground">
            Los gastos marcados como "a revisar" no necesariamente son incorrectos. 
            Pueden deberse a aumentos de tarifas o gastos extraordinarios justificados. 
            Te recomendamos revisar las actas del consorcio o consultar con la administración 
            si tenés dudas sobre algún ítem específico.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const Ejemplo = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Link>
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
          
          <SummaryCard />
          <ExpenseBreakdown />
          <ComparisonChart />
          <InfoCard />
          
          <div className="text-center pt-8">
            <p className="text-muted-foreground mb-4">
              ¿Querés analizar otra expensa?
            </p>
            <Button asChild variant="hero" size="lg">
              <Link to="/analizar">Subir nueva expensa</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Ejemplo;
