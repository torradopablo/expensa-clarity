import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle2, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Building,
  Wrench,
  Droplets,
  Zap,
  Users,
  Shield,
  LogOut,
  ArrowLeftRight,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  users: Users,
  zap: Zap,
  droplets: Droplets,
  wrench: Wrench,
  shield: Shield,
  building: Building,
};

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
            <Link to="/analizar">Analizar otra expensa</Link>
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

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return 0;
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
  categories?: Category[];
}

const CompararPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const leftId = searchParams.get("left");
  const rightId = searchParams.get("right");

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
        toast.error("Error al cargar los análisis");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [navigate]);

  const [leftAnalysis, setLeftAnalysis] = useState<Analysis | null>(null);
  const [rightAnalysis, setRightAnalysis] = useState<Analysis | null>(null);
  const [leftCategories, setLeftCategories] = useState<Category[]>([]);
  const [rightCategories, setRightCategories] = useState<Category[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!leftId || !rightId) {
        setLeftAnalysis(null);
        setRightAnalysis(null);
        setLeftCategories([]);
        setRightCategories([]);
        return;
      }

      setLoadingDetails(true);
      try {
        const [leftData, rightData] = await Promise.all([
          supabase.from("expense_analyses").select("*").eq("id", leftId).single(),
          supabase.from("expense_analyses").select("*").eq("id", rightId).single(),
        ]);

        if (leftData.error) throw leftData.error;
        if (rightData.error) throw rightData.error;

        setLeftAnalysis(leftData.data);
        setRightAnalysis(rightData.data);

        const [leftCats, rightCats] = await Promise.all([
          supabase.from("expense_categories").select("*").eq("analysis_id", leftId).order("current_amount", { ascending: false }),
          supabase.from("expense_categories").select("*").eq("analysis_id", rightId).order("current_amount", { ascending: false }),
        ]);

        if (leftCats.error) throw leftCats.error;
        if (rightCats.error) throw rightCats.error;

        setLeftCategories(leftCats.data || []);
        setRightCategories(rightCats.data || []);
      } catch (error: any) {
        console.error("Error fetching details:", error);
        toast.error("Error al cargar los detalles");
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [leftId, rightId]);

  const categoryComparison = useMemo(() => {
    if (!leftCategories.length || !rightCategories.length) return [];

    const allCategoryNames = new Set([
      ...leftCategories.map(c => c.name),
      ...rightCategories.map(c => c.name),
    ]);

    return Array.from(allCategoryNames).map(name => {
      const left = leftCategories.find(c => c.name === name);
      const right = rightCategories.find(c => c.name === name);
      const leftAmount = left?.current_amount || 0;
      const rightAmount = right?.current_amount || 0;
      const diff = rightAmount - leftAmount;
      const changePercent = leftAmount > 0 ? calculateChange(rightAmount, leftAmount) : null;

      return {
        name,
        icon: left?.icon || right?.icon || "building",
        leftAmount,
        rightAmount,
        diff,
        changePercent,
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [leftCategories, rightCategories]);

  const handleSelectLeft = (id: string) => {
    setSearchParams({ left: id, right: rightId || "" });
  };

  const handleSelectRight = (id: string) => {
    setSearchParams({ left: leftId || "", right: id });
  };

  const swapSelections = () => {
    if (leftId && rightId) {
      setSearchParams({ left: rightId, right: leftId });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-6xl">
            <Skeleton className="h-48 w-full mb-8" />
          </div>
        </main>
      </div>
    );
  }

  if (analyses.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-4xl text-center">
            <h1 className="text-2xl font-bold mb-4">Comparar Análisis</h1>
            <p className="text-muted-foreground mb-6">
              Necesitás al menos 2 análisis completados para poder compararlos.
            </p>
            <Button asChild>
              <Link to="/analizar">Analizar una expensa</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const totalDiff = leftAnalysis && rightAnalysis 
    ? rightAnalysis.total_amount - leftAnalysis.total_amount 
    : 0;
  const totalChangePercent = leftAnalysis && rightAnalysis && leftAnalysis.total_amount > 0
    ? calculateChange(rightAnalysis.total_amount, leftAnalysis.total_amount)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" asChild>
              <Link to="/historial">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al historial
              </Link>
            </Button>
          </div>

          <h1 className="text-3xl font-bold mb-2">Comparar Análisis</h1>
          <p className="text-muted-foreground mb-8">
            Seleccioná dos análisis para ver las diferencias lado a lado
          </p>

          {/* Selection Area */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Análisis Base</label>
                  <Select value={leftId || ""} onValueChange={handleSelectLeft}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar análisis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {analyses.map((a) => (
                        <SelectItem key={a.id} value={a.id} disabled={a.id === rightId}>
                          {a.building_name || "Edificio"} - {a.period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={swapSelections}
                  disabled={!leftId || !rightId}
                  className="mb-0.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Análisis a Comparar</label>
                  <Select value={rightId || ""} onValueChange={handleSelectRight}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar análisis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {analyses.map((a) => (
                        <SelectItem key={a.id} value={a.id} disabled={a.id === leftId}>
                          {a.building_name || "Edificio"} - {a.period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingDetails && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {leftAnalysis && rightAnalysis && !loadingDetails && (
            <>
              {/* Summary Comparison */}
              <Card className="mb-8 animate-fade-in-up">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-[1fr,auto,1fr] gap-6 items-center">
                    <div className="text-center md:text-left">
                      <p className="text-sm text-muted-foreground mb-1">
                        {leftAnalysis.building_name || "Edificio"} - {leftAnalysis.period}
                      </p>
                      <p className="text-3xl font-bold">{formatCurrency(leftAnalysis.total_amount)}</p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className={`text-lg font-semibold flex items-center gap-1 ${
                        totalDiff > 0 ? "text-status-attention" : totalDiff < 0 ? "text-status-ok" : "text-muted-foreground"
                      }`}>
                        {totalDiff > 0 ? <TrendingUp className="w-5 h-5" /> : totalDiff < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                        {totalDiff > 0 ? "+" : ""}{formatCurrency(totalDiff)}
                      </div>
                      <Badge variant={totalDiff > 0 ? "attention" : totalDiff < 0 ? "ok" : "default"}>
                        {totalChangePercent > 0 ? "+" : ""}{totalChangePercent.toFixed(1)}%
                      </Badge>
                    </div>

                    <div className="text-center md:text-right">
                      <p className="text-sm text-muted-foreground mb-1">
                        {rightAnalysis.building_name || "Edificio"} - {rightAnalysis.period}
                      </p>
                      <p className="text-3xl font-bold">{formatCurrency(rightAnalysis.total_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Comparison */}
              <h2 className="text-xl font-semibold mb-4">Comparativa por Categoría</h2>
              <div className="space-y-3">
                {categoryComparison.map((cat, index) => {
                  const Icon = iconMap[cat.icon] || Building;
                  const isIncrease = cat.diff > 0;
                  const isDecrease = cat.diff < 0;
                  const isSignificant = cat.changePercent !== null && Math.abs(cat.changePercent) > 20;

                  return (
                    <Card 
                      key={cat.name} 
                      className={`animate-fade-in-up ${isSignificant && isIncrease ? "border-status-attention/50" : ""}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardContent className="p-4">
                        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                          <div className="text-right">
                            <p className="text-lg font-semibold">{formatCurrency(cat.leftAmount)}</p>
                          </div>

                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <div className={`text-xs flex items-center gap-1 ${
                              isIncrease ? "text-status-attention" : isDecrease ? "text-status-ok" : "text-muted-foreground"
                            }`}>
                              {isIncrease ? <TrendingUp className="w-3 h-3" /> : isDecrease ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {cat.changePercent !== null ? (
                                <span>{cat.changePercent > 0 ? "+" : ""}{cat.changePercent.toFixed(1)}%</span>
                              ) : (
                                <span>N/A</span>
                              )}
                            </div>
                            {isSignificant && isIncrease && (
                              <AlertTriangle className="w-3 h-3 text-status-attention" />
                            )}
                          </div>

                          <div className="text-left">
                            <p className="text-lg font-semibold">{formatCurrency(cat.rightAmount)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {categoryComparison.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No hay categorías para comparar
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!leftId && !rightId && !loadingDetails && (
            <Card>
              <CardContent className="p-8 text-center">
                <ArrowLeftRight className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Seleccioná dos análisis arriba para comenzar la comparación
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CompararPage;
