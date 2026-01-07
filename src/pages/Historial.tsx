import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  FileText,
  LogOut,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">ExpensaCheck</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/analizar">
              <Plus className="w-4 h-4 mr-2" />
              Nueva expensa
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
};

const calculateChange = (current: number, previous: number | null) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

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

const Historial = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("expense_analyses")
          .select("*")
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAnalyses(data || []);
      } catch (error: any) {
        console.error("Error fetching analyses:", error);
        toast.error("Error al cargar el historial");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-4xl">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
              <History className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Historial de expensas</h1>
              <p className="text-muted-foreground text-sm">
                {analyses.length} {analyses.length === 1 ? "análisis realizado" : "análisis realizados"}
              </p>
            </div>
          </div>

          {analyses.length === 0 ? (
            <Card variant="soft" className="animate-fade-in-up">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No tenés análisis todavía</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Subí tu primera liquidación de expensas y obtené un análisis detallado con comparaciones y alertas.
                </p>
                <Button asChild variant="hero" size="lg">
                  <Link to="/analizar">
                    <Plus className="w-4 h-4 mr-2" />
                    Analizar mi primera expensa
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {analyses.map((analysis, index) => {
                const change = calculateChange(analysis.total_amount, analysis.previous_total);
                
                return (
                  <Link 
                    key={analysis.id} 
                    to={`/analisis/${analysis.id}`}
                    className="block"
                  >
                    <Card 
                      variant="interactive" 
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          <div className="flex-1 p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm text-muted-foreground truncate">
                                  {analysis.building_name || "Edificio"}
                                  {analysis.unit && ` · ${analysis.unit}`}
                                </p>
                                <h3 className="text-lg font-semibold">{analysis.period}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Analizado el {formatDate(analysis.created_at)}
                                </p>
                              </div>
                              <Badge variant="ok" className="flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completo
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-center gap-4 p-5 sm:p-6 bg-muted/30 sm:w-48 border-t sm:border-t-0 sm:border-l border-border">
                            <div className="text-left sm:text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                              <p className="text-lg font-bold">{formatCurrency(analysis.total_amount)}</p>
                              {change !== null && (
                                <div className={`flex items-center justify-center gap-1 text-xs font-medium mt-1 ${
                                  change > 10 ? "text-status-attention" : change > 0 ? "text-muted-foreground" : "text-status-ok"
                                }`}>
                                  {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground sm:hidden" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Comparison hint */}
          {analyses.length >= 2 && (
            <Card variant="soft" className="mt-8 animate-fade-in-up">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Comparación automática</h3>
                    <p className="text-sm text-muted-foreground">
                      Cada análisis compara automáticamente con el mes anterior. 
                      Podés ver la evolución de tus gastos haciendo clic en cada período.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Historial;
