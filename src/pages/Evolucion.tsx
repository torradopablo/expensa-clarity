import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  LogOut,
  LineChart,
  Building,
  Calendar,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EvolutionComparisonChart } from "@/components/EvolutionComparisonChart";

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
          <Button asChild variant="outline" size="sm">
            <Link to="/historial">Ver historial</Link>
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

const formatShortCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
};

// Spanish month mapping
const monthsEs: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

const parseSpanishPeriod = (period: string): Date | null => {
  const parts = period.toLowerCase().trim().split(/\s+/);
  if (parts.length >= 2) {
    const month = monthsEs[parts[0]];
    if (month !== undefined) {
      const year = parseInt(parts[1]) || new Date().getFullYear();
      return new Date(year, month, 1);
    }
  }
  return null;
};

const periodToYYYYMM = (period: string): string | null => {
  const date = parseSpanishPeriod(period);
  if (date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
};

interface Analysis {
  id: string;
  building_name: string | null;
  period: string;
  period_date: string | null;
  total_amount: number;
  created_at: string;
  scanned_at: string | null;
}

interface ChartData {
  period: string;
  periodDate: string | null;
  total: number;
  id: string;
}

interface InflationData {
  period: string;
  value: number;
  is_estimated: boolean;
}

interface BuildingsTrendData {
  period: string;
  average: number;
  normalizedPercent: number;
  count: number;
}

interface ComparisonDataPoint {
  period: string;
  userPercent: number;
  inflationPercent: number | null;
  inflationEstimated?: boolean;
  buildingsPercent: number | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const Evolucion = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<string>(
    searchParams.get("edificio") || "all"
  );
  
  // New states for comparison data
  const [inflationData, setInflationData] = useState<InflationData[]>([]);
  const [buildingsTrend, setBuildingsTrend] = useState<BuildingsTrendData[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [deviation, setDeviation] = useState<{
    fromInflation: number;
    fromBuildings: number;
    isSignificant: boolean;
  } | null>(null);

  // Get unique buildings
  const buildings = useMemo(() => {
    const unique = [...new Set(analyses.map(a => a.building_name).filter(Boolean))] as string[];
    return unique.sort();
  }, [analyses]);

  // Filter and prepare chart data
  const chartData = useMemo(() => {
    let filtered = analyses;
    
    if (selectedBuilding !== "all") {
      filtered = analyses.filter(a => a.building_name === selectedBuilding);
    }

    // Sort by period_date if available, otherwise parse period string
    const sorted = [...filtered].sort((a, b) => {
      if (a.period_date && b.period_date) {
        return new Date(a.period_date).getTime() - new Date(b.period_date).getTime();
      }
      const dateA = parseSpanishPeriod(a.period);
      const dateB = parseSpanishPeriod(b.period);
      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return sorted.map(a => ({
      period: a.period,
      periodDate: a.period_date,
      total: a.total_amount,
      id: a.id,
    }));
  }, [analyses, selectedBuilding]);

  // Create comparison chart data
  const comparisonData = useMemo((): ComparisonDataPoint[] => {
    if (chartData.length === 0) return [];

    const baseUserValue = chartData[0].total;
    
    // Prevent division by zero
    if (baseUserValue === 0) return [];
    
    const inflationMap = new Map(inflationData.map(d => [d.period, d]));
    const buildingsMap = new Map(buildingsTrend.map(d => [d.period, d]));

    // Helper to get YYYY-MM from period_date or parse from period string
    const getYYYYMM = (periodDate: string | null, period: string): string | null => {
      if (periodDate) {
        const date = new Date(periodDate);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      return periodToYYYYMM(period);
    };

    // Find base inflation value for the first user period
    const firstUserPeriodYYYYMM = getYYYYMM(chartData[0].periodDate, chartData[0].period);
    const baseInflation = firstUserPeriodYYYYMM ? inflationMap.get(firstUserPeriodYYYYMM) : null;
    
    // Find base buildings value - use period matching for more accurate comparison
    const baseBuildingsData = buildingsTrend.find(b => b.period === chartData[0].period);
    const baseNormalizedPercent = baseBuildingsData?.normalizedPercent ?? 0;

    return chartData.map((item) => {
      // Calculate user percent change from base
      const userPercent = ((item.total - baseUserValue) / baseUserValue) * 100;
      
      const periodYYYYMM = getYYYYMM(item.periodDate, item.period);
      const inflationItem = periodYYYYMM ? inflationMap.get(periodYYYYMM) : null;
      
      let inflationPercent: number | null = null;
      let inflationEstimated = false;
      
      if (inflationItem && baseInflation) {
        // Calculate inflation percent change from base (same normalization as user)
        inflationPercent = ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100;
        inflationEstimated = inflationItem.is_estimated;
      }

      const buildingsItem = buildingsMap.get(item.period);
      let buildingsPercent: number | null = null;
      
      if (buildingsItem && typeof buildingsItem.normalizedPercent === 'number') {
        // Calculate the relative change from base period
        // This should give us the % change from the first period, matching userPercent calculation
        buildingsPercent = buildingsItem.normalizedPercent - baseNormalizedPercent;
      }

      return {
        period: item.period,
        userPercent,
        inflationPercent,
        inflationEstimated,
        buildingsPercent,
      };
    });
  }, [chartData, inflationData, buildingsTrend]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const totals = chartData.map(d => d.total);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    
    const lastTwo = chartData.slice(-2);
    let changePercent = 0;
    if (lastTwo.length === 2 && lastTwo[0].total > 0) {
      changePercent = ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100;
    }

    return { min, max, avg, changePercent, count: chartData.length };
  }, [chartData]);

  const handleBuildingChange = (value: string) => {
    setSelectedBuilding(value);
    setAiAnalysis(null);
    setDeviation(null);
    if (value === "all") {
      searchParams.delete("edificio");
    } else {
      searchParams.set("edificio", value);
    }
    setSearchParams(searchParams);
  };

  // Fetch inflation data
  const fetchInflationData = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-inflation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setInflationData(result.data);
        }
      }
    } catch (error) {
      console.error("Error fetching inflation data:", error);
    }
  }, []);

  // Fetch buildings trend
  const fetchBuildingsTrend = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-buildings-trend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setBuildingsTrend(result.data);
        }
      }
    } catch (error) {
      console.error("Error fetching buildings trend:", error);
    }
  }, []);

  // Fetch AI analysis
  const fetchAiAnalysis = useCallback(async () => {
    if (comparisonData.length < 2 || selectedBuilding === "all") return;

    setIsLoadingAnalysis(true);
    try {
      const userTrend = comparisonData.map(d => ({ period: d.period, percent: d.userPercent }));
      const inflationTrend = comparisonData
        .filter(d => d.inflationPercent !== null)
        .map(d => ({ period: d.period, percent: d.inflationPercent! }));
      const buildingsTrendData = comparisonData
        .filter(d => d.buildingsPercent !== null)
        .map(d => ({ period: d.period, percent: d.buildingsPercent! }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-deviation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userTrend,
            inflationTrend,
            buildingsTrend: buildingsTrendData,
            buildingName: selectedBuilding,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setAiAnalysis(result.analysis);
        setDeviation(result.deviation);
      } else if (response.status === 429) {
        toast.error("Límite de análisis alcanzado. Intentá más tarde.");
      }
    } catch (error) {
      console.error("Error fetching AI analysis:", error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [comparisonData, selectedBuilding]);

  // Load comparison data
  const loadComparisonData = useCallback(async () => {
    setIsLoadingComparison(true);
    await Promise.all([fetchInflationData(), fetchBuildingsTrend()]);
    setIsLoadingComparison(false);
  }, [fetchInflationData, fetchBuildingsTrend]);

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
          .select("id, building_name, period, period_date, total_amount, created_at, scanned_at")
          .eq("status", "completed")
          .order("created_at", { ascending: true });

        if (error) throw error;
        setAnalyses(data || []);

        if (!searchParams.get("edificio") && data && data.length > 0) {
          const firstBuilding = data.find(a => a.building_name)?.building_name;
          if (firstBuilding) {
            setSelectedBuilding(firstBuilding);
          }
        }
      } catch (error: any) {
        console.error("Error fetching analyses:", error);
        toast.error("Error al cargar los análisis");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [navigate, searchParams]);

  // Load comparison data when analyses are loaded
  useEffect(() => {
    if (analyses.length > 0) {
      loadComparisonData();
    }
  }, [analyses.length, loadComparisonData]);

  // Calculate deviation when comparison data changes
  useEffect(() => {
    if (comparisonData.length >= 2) {
      const last = comparisonData[comparisonData.length - 1];
      const fromInflation = last.inflationPercent !== null 
        ? last.userPercent - last.inflationPercent 
        : 0;
      const fromBuildings = last.buildingsPercent !== null 
        ? last.userPercent - last.buildingsPercent 
        : 0;
      
      setDeviation({
        fromInflation,
        fromBuildings,
        isSignificant: Math.abs(fromInflation) > 5 || Math.abs(fromBuildings) > 5,
      });
    }
  }, [comparisonData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-5xl">
            <Skeleton className="h-10 w-64 mb-8" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container max-w-5xl">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
                <LineChart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Evolución de expensas</h1>
                <p className="text-muted-foreground text-sm">
                  Seguimiento histórico con comparativa de inflación
                </p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/historial">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>

          {analyses.length === 0 ? (
            <Card variant="soft" className="animate-fade-in-up">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                  <LineChart className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No hay datos para mostrar</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Necesitás al menos un análisis completado para ver la evolución.
                </p>
                <Button asChild variant="hero">
                  <Link to="/analizar">Analizar mi primera expensa</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Building Selector */}
              <Card variant="soft" className="mb-6 animate-fade-in-up">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Edificio:</span>
                    </div>
                    <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
                      <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Seleccionar edificio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los edificios</SelectItem>
                        {buildings.map((building) => (
                          <SelectItem key={building} value={building}>
                            {building}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoadingComparison && (
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card variant="soft" className="animate-fade-in-up">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Períodos analizados</p>
                      <p className="text-2xl font-bold">{stats.count}</p>
                    </CardContent>
                  </Card>
                  <Card variant="soft" className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Promedio mensual</p>
                      <p className="text-lg font-bold">{formatCurrency(stats.avg)}</p>
                    </CardContent>
                  </Card>
                  <Card variant="soft" className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                      <p className="text-lg font-bold text-status-ok">{formatCurrency(stats.min)}</p>
                    </CardContent>
                  </Card>
                  <Card variant="soft" className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Máximo</p>
                      <p className="text-lg font-bold text-status-attention">{formatCurrency(stats.max)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Evolution Chart (Absolute values) */}
              {chartData.length > 0 && (
                <Card variant="elevated" className="animate-fade-in-up mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-lg">Evolución del gasto total</CardTitle>
                        <CardDescription>
                          {selectedBuilding === "all" 
                            ? "Todos los edificios" 
                            : selectedBuilding}
                        </CardDescription>
                      </div>
                      {stats && stats.count >= 2 && (
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                          stats.changePercent > 0 
                            ? "bg-status-attention-bg text-status-attention" 
                            : stats.changePercent < 0 
                              ? "bg-status-ok-bg text-status-ok"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {stats.changePercent > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : stats.changePercent < 0 ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                          <span>
                            {stats.changePercent > 0 ? "+" : ""}
                            {stats.changePercent.toFixed(1)}% último período
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tickFormatter={formatShortCurrency}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            className="text-muted-foreground"
                            width={60}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comparison Chart (Normalized %) */}
              {comparisonData.length >= 2 && selectedBuilding !== "all" && (
                <div className="mb-6">
                  <EvolutionComparisonChart
                    data={comparisonData}
                    buildingName={selectedBuilding}
                    deviation={deviation || undefined}
                    analysis={aiAnalysis}
                    isLoadingAnalysis={isLoadingAnalysis}
                  />
                  
                  {/* AI Analysis Button */}
                  {!aiAnalysis && !isLoadingAnalysis && comparisonData.length >= 2 && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={fetchAiAnalysis}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Obtener análisis inteligente
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedBuilding === "all" && comparisonData.length >= 2 && (
                <Card variant="soft" className="mb-6 animate-fade-in-up">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      Seleccioná un edificio específico para ver la comparación con inflación y otros edificios.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Period List */}
              {chartData.length > 0 && (
                <Card variant="soft" className="animate-fade-in-up">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Detalle por período
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...chartData].reverse().map((item, index) => {
                        const prevItem = chartData[chartData.length - index - 2];
                        let change = 0;
                        if (prevItem && prevItem.total > 0) {
                          change = ((item.total - prevItem.total) / prevItem.total) * 100;
                        }

                        return (
                          <Link
                            key={item.id}
                            to={`/analisis/${item.id}`}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-medium group-hover:text-primary transition-colors">
                                {item.period}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              {index < chartData.length - 1 && change !== 0 && (
                                <span className={`text-xs font-medium ${
                                  change > 0 ? "text-status-attention" : "text-status-ok"
                                }`}>
                                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                                </span>
                              )}
                              <span className="font-bold">{formatCurrency(item.total)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Evolucion;
