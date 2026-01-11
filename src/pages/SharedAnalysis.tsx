import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CheckCircle2, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building,
  Wrench,
  Droplets,
  Zap,
  Users,
  Shield,
  Lock,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, any> = {
  users: Users,
  zap: Zap,
  droplets: Droplets,
  wrench: Wrench,
  shield: Shield,
  building: Building,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateChange = (current: number, previous: number | null) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

interface Category {
  id: string;
  name: string;
  icon: string;
  current_amount: number;
  previous_amount: number | null;
  status: string;
  explanation: string | null;
}

interface Analysis {
  id: string;
  building_name: string | null;
  period: string;
  unit: string | null;
  total_amount: number;
  previous_total: number | null;
  status: string;
  created_at: string;
}

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">ExpensaCheck</span>
        </Link>
        <Button asChild size="sm">
          <Link to="/analizar">
            Analizar mi expensa
          </Link>
        </Button>
      </div>
    </header>
  );
};

const SharedAnalysis = () => {
  const { token } = useParams<{ token: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedAnalysis = async () => {
      if (!token) {
        setError("Token inválido");
        setIsLoading(false);
        return;
      }

      try {
        // First, get the shared link to find the analysis_id
        const { data: linkData, error: linkError } = await supabase
          .from("shared_analysis_links")
          .select("analysis_id, is_active, expires_at")
          .eq("token", token)
          .maybeSingle();

        if (linkError) throw linkError;
        
        if (!linkData) {
          setError("Este enlace no existe o ya no está disponible");
          setIsLoading(false);
          return;
        }

        if (!linkData.is_active) {
          setError("Este enlace fue desactivado");
          setIsLoading(false);
          return;
        }

        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
          setError("Este enlace ha expirado");
          setIsLoading(false);
          return;
        }

        // Fetch analysis using edge function for security (bypasses RLS)
        const { data: analysisData, error: analysisError } = await supabase
          .functions.invoke('get-shared-analysis', {
            body: { token }
          });

        if (analysisError) throw analysisError;

        if (analysisData.analysis) {
          setAnalysis(analysisData.analysis);
          setCategories(analysisData.categories || []);
        } else {
          setError("No se pudo cargar el análisis");
        }
      } catch (err: any) {
        console.error("Error fetching shared analysis:", err);
        setError("Error al cargar el análisis compartido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedAnalysis();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-4xl">
            <Skeleton className="h-48 w-full mb-8" />
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-xl font-bold mb-2">Enlace no disponible</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button asChild>
                <Link to="/">
                  Ir al inicio
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const totalChange = calculateChange(analysis.total_amount, analysis.previous_total);
  const attentionItems = categories.filter(c => c.status === "attention").length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-4xl">
            {/* Shared badge */}
            <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
              <ExternalLink className="w-4 h-4" />
              <span>Análisis compartido</span>
            </div>

            {/* Summary Card */}
            <Card variant="glass" className="mb-8 animate-fade-in-up">
              <CardContent className="p-6 md:p-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {analysis.building_name || "Edificio"}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold">{analysis.period}</h1>
                        {analysis.unit && (
                          <p className="text-muted-foreground">{analysis.unit}</p>
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={attentionItems > 0 ? "attention" : "ok"} className="text-sm px-3 py-1 cursor-help">
                            {attentionItems > 0 ? (
                              <><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />{attentionItems} puntos a revisar</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Todo en orden</>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          {attentionItems > 0 ? (
                            <p>Hay {attentionItems} categorías con aumentos mayores al promedio.</p>
                          ) : (
                            <p>Todas las categorías tienen variaciones dentro de lo esperado.</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-lg">
                      {attentionItems > 0
                        ? "Esta expensa tiene algunos aumentos que merecen atención."
                        : "Esta expensa está dentro de los rangos normales."}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center items-start md:items-end">
                    <p className="text-sm text-muted-foreground mb-1">Total del mes</p>
                    <p className="text-3xl md:text-4xl font-bold">
                      {formatCurrency(analysis.total_amount)}
                    </p>
                    {analysis.previous_total && (
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories Breakdown */}
            {categories.length > 0 && (
              <div className="grid gap-4 mb-8">
                <h2 className="text-xl font-semibold">Detalle por categoría</h2>
                <div className="grid gap-4">
                  {categories.map((category, index) => {
                    const change = calculateChange(category.current_amount, category.previous_amount);
                    const Icon = iconMap[category.icon] || Building;
                    
                    return (
                      <Card 
                        key={category.id} 
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
                                    <Badge variant={category.status as any}>
                                      {category.status === "ok" ? "OK" : "Revisar"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {category.explanation || "Sin observaciones"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex md:flex-col items-center justify-between md:justify-center gap-4 p-5 md:p-6 bg-muted/30 md:w-48 border-t md:border-t-0 md:border-l border-border">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-0.5">Este mes</p>
                                <p className="text-lg font-bold">{formatCurrency(category.current_amount)}</p>
                              </div>
                              {category.previous_amount && (
                                <div className={`flex items-center gap-1 text-sm font-medium ${
                                  change > 10 ? "text-status-attention" : change > 0 ? "text-muted-foreground" : "text-status-ok"
                                }`}>
                                  {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <Card variant="soft" className="animate-fade-in-up">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">¿Querés analizar tu propia expensa?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Subí tu liquidación y obtené un análisis detallado en segundos.
                </p>
                <Button asChild variant="hero">
                  <Link to="/analizar">Analizar mi expensa</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default SharedAnalysis;