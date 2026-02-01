import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Building,
  Wrench,
  Droplets,
  Zap,
  Users,
  Shield,
  ArrowRight,
  History
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
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="hidden sm:flex">
          <Link to="/historial">
            <History className="w-4 h-4 mr-2" />
            Ver historial
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="sm:hidden">
          <Link to="/historial">
            <History className="w-4 h-4" />
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/analizar">
            <span className="hidden sm:inline">Analizar mi expensa</span>
            <span className="sm:hidden">Analizar</span>
          </Link>
        </Button>
      </div>
    </div>
  </header>
);

// Datos de ejemplo simplificados
const expenseData = {
  building: "Torres del Parque",
  period: "Diciembre 2025",
  unit: "4° B",
  total: 125800,
  previousTotal: 98500,
  categories: [
    {
      name: "Sueldo encargado",
      icon: Users,
      current: 52000,
      previous: 45000,
      status: "ok" as const,
      explanation: "Aumento del 15.5% por paritarias. Dentro de lo esperado."
    },
    {
      name: "Electricidad",
      icon: Zap,
      current: 28500,
      previous: 18200,
      status: "attention" as const,
      explanation: "Subió un 56%. Coincide con el aumento de tarifas de noviembre."
    },
    {
      name: "Agua",
      icon: Droplets,
      current: 12300,
      previous: 11800,
      status: "ok" as const,
      explanation: "Variación mínima del 4.2%."
    },
    {
      name: "Mantenimiento",
      icon: Wrench,
      current: 18500,
      previous: 12000,
      status: "attention" as const,
      explanation: "Reparación del portón eléctrico incluida este mes."
    },
    {
      name: "Seguro",
      icon: Shield,
      current: 8200,
      previous: 7500,
      status: "ok" as const,
      explanation: "Ajuste anual del 9.3%."
    },
    {
      name: "Administración",
      icon: Building,
      current: 6300,
      previous: 4000,
      status: "attention" as const,
      explanation: "Aumento del 57.5%. Verificar con la administración."
    },
  ]
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateChange = (current: number, previous: number) => {
  return ((current - previous) / previous) * 100;
};

const Ejemplo = () => {
  const totalChange = calculateChange(expenseData.total, expenseData.previousTotal);
  const attentionItems = expenseData.categories.filter(c => c.status === "attention").length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-4xl">
            {/* Back button */}
            <div className="mb-8">
              <Button variant="ghost" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Link>
              </Button>
            </div>

            {/* Example badge */}
            <div className="flex justify-center mb-6">
              <Badge variant="outline" className="text-sm px-4 py-1.5 bg-muted/50">
                📋 Este es un ejemplo de análisis
              </Badge>
            </div>

            {/* Summary Card */}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={attentionItems > 0 ? "attention" : "ok"} className="text-sm px-3 py-1 cursor-help transition-transform hover:scale-105">
                            {attentionItems > 0 ? (
                              <><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />{attentionItems} puntos a revisar</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Todo en orden</>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          {attentionItems > 0 ? (
                            <p>Hay {attentionItems} categorías con aumentos mayores al promedio que vale la pena revisar.</p>
                          ) : (
                            <p>Todas las categorías tienen variaciones dentro de lo esperado.</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-lg">
                      Tu expensa tiene algunos aumentos que merecen atención.
                      A continuación te explicamos cada uno de forma clara.
                    </p>
                  </div>
                  <div className="flex flex-col justify-center items-start md:items-end">
                    <p className="text-sm text-muted-foreground mb-1">Total del mes</p>
                    <p className="text-3xl md:text-4xl font-bold">{formatCurrency(expenseData.total)}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-status-attention">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-medium">
                        +{totalChange.toFixed(1)}% vs mes anterior
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
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
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${category.status === "attention" ? "bg-status-attention-bg" : "bg-status-ok-bg"
                                }`}>
                                <Icon className={`w-6 h-6 ${category.status === "attention" ? "text-status-attention" : "text-status-ok"
                                  }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{category.name}</h3>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant={category.status}
                                        className="cursor-help transition-transform hover:scale-105"
                                      >
                                        {category.status === "ok" ? "OK" : "Revisar"}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      {category.status === "ok" ? (
                                        <p>✅ Este gasto está dentro de los parámetros normales.</p>
                                      ) : (
                                        <p>⚠️ Este gasto tuvo un aumento significativo. Te recomendamos verificarlo con la administración.</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
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
                            <div className={`flex items-center gap-1 text-sm font-medium ${change > 20 ? "text-status-attention" : change > 0 ? "text-muted-foreground" : "text-status-ok"
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

            {/* Info Card */}
            <Card variant="soft" className="mb-8 animate-fade-in-up">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">¿Qué significa "Revisar"?</h3>
                    <p className="text-sm text-muted-foreground">
                      Los ítems marcados como "Revisar" tuvieron aumentos mayores al promedio.
                      No significa que sean incorrectos, pero vale la pena verificarlos con
                      la administración o las actas del consorcio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card variant="glass" className="animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-bold mb-2">¿Querés analizar tu propia expensa?</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Subí el PDF de tu liquidación y recibí un análisis
                  personalizado en menos de 1 minuto.
                </p>
                <Button asChild variant="hero" size="lg">
                  <Link to="/analizar">
                    Analizar mi expensa
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Ejemplo;
