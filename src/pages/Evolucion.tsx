import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  formatPeriod,
  periodToYearMonth
} from "@/services/formatters/date";
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
  Plus,
  Filter,
  X,
  User
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
          <Button asChild variant="ghost" size="icon" title="Mi Perfil">
            <Link to="/perfil">
              <User className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
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

interface AnalysisCategory {
  name: string;
  current_amount: number;
}

interface Analysis {
  id: string;
  building_name: string | null;
  period: string;
  period_date: string | null;
  total_amount: number;
  created_at: string;
  scanned_at: string | null;
  expense_categories?: AnalysisCategory[];
  evolution_analysis?: string | null;
  deviation_stats?: any | null;
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

interface BuildingProfile {
  id: string;
  building_name: string;
  unit_count_range: string | null;
  age_category: string | null;
  zone: string | null;
  has_amenities: boolean | null;
}

interface ComparisonDataPoint {
  period: string;
  userPercent: number;
  inflationPercent: number | null;
  inflationEstimated?: boolean;
  buildingsPercent: number | null;
}

interface BuildingsTrendStats {
  totalBuildings: number;
  totalAnalyses: number;
  periodsCount: number;
  filtersApplied: boolean;
  usedFallback?: boolean;
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
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("categoria") || "all"
  );

  // New states for comparison data
  const [inflationData, setInflationData] = useState<InflationData[]>([]);
  const [buildingsTrend, setBuildingsTrend] = useState<BuildingsTrendData[]>([]);
  const [buildingsTrendStats, setBuildingsTrendStats] = useState<BuildingsTrendStats | null>(null);
  const [buildingProfile, setBuildingProfile] = useState<BuildingProfile | null>(null);
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

  // Get unique categories for the selected building (or all buildings)
  const categories = useMemo(() => {
    let filteredAnalyses = analyses;
    if (selectedBuilding !== "all") {
      filteredAnalyses = analyses.filter(a => a.building_name === selectedBuilding);
    }

    const allCategories = filteredAnalyses.flatMap(a => (a.expense_categories || []).map(c => c.name));
    return [...new Set(allCategories)].sort();
  }, [analyses, selectedBuilding]);

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

    // Limit to latest 15 periods
    const sliced = sorted.slice(-15);

    return sliced.map(a => {
      let amount = a.total_amount;

      if (selectedCategory !== "all") {
        const cat = a.expense_categories?.find(c => c.name === selectedCategory);
        amount = cat ? cat.current_amount : 0;
      }

      return {
        period: a.period,
        periodDate: a.period_date,
        total: amount,
        id: a.id,
      };
    });
  }, [analyses, selectedBuilding, selectedCategory]);

  // Calculate evolutionary comparison data
  const comparisonData = useMemo(() => {
    if (chartData.length < 2) return [];

    const baseTotal = chartData[0].total;

    // Create inflation map
    const inflationMap = new Map<string, { value: number; is_estimated: boolean }>();
    if (inflationData) {
      inflationData.forEach(inf => {
        inflationMap.set(inf.period, { value: inf.value, is_estimated: inf.is_estimated });
      });
    }

    // Find base inflation value for the first user period
    const firstUserPeriodYYYYMM = periodToYearMonth(chartData[0].period, chartData[0].periodDate);
    const baseInflation = firstUserPeriodYYYYMM ? (inflationMap.get(firstUserPeriodYYYYMM) ?? null) : null;

    // Find base buildings value - use period matching for more accurate comparison
    const baseBuildingsData = buildingsTrend.find(b => b.period === chartData[0].period);
    const baseBuildingsAverage = baseBuildingsData?.average ?? null;

    return chartData.map(d => {
      const userPercent = baseTotal > 0 ? ((d.total - baseTotal) / baseTotal) * 100 : 0;

      let inflationPercent: number | null = null;
      let inflationEstimated = false;

      const periodYYYYMM = periodToYearMonth(d.period, d.periodDate);
      if (periodYYYYMM && baseInflation !== null && baseInflation.value !== 0) {
        const inflationItem = inflationMap.get(periodYYYYMM);
        if (inflationItem) {
          inflationPercent = ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100;
          inflationEstimated = inflationItem.is_estimated;
        }
      }

      let buildingsPercent: number | null = null;
      if (baseBuildingsAverage !== null && baseBuildingsAverage > 0) {
        const buildingsItem = buildingsTrend.find(b => b.period === d.period);
        if (buildingsItem) {
          buildingsPercent = ((buildingsItem.average - baseBuildingsAverage) / baseBuildingsAverage) * 100;
        }
      }

      return {
        period: d.period,
        userPercent,
        inflationPercent,
        inflationEstimated,
        buildingsPercent
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

    // Try to load persisted analysis for this building if we are in "total" view
    if (value !== "all" && selectedCategory === "all") {
      const latest = [...analyses]
        .filter(a => a.building_name === value)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (latest?.evolution_analysis) {
        setAiAnalysis(latest.evolution_analysis);
        setDeviation(latest.deviation_stats);
      } else {
        setAiAnalysis(null);
        setDeviation(null);
      }
    } else {
      setAiAnalysis(null);
      setDeviation(null);
    }

    if (value === "all") {
      searchParams.delete("edificio");
    } else {
      searchParams.set("edificio", value);
    }
    setSearchParams(searchParams);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);

    // Reset AI analysis when changing category - we only persist total analysis for now
    // If selecting "all" (Total), we try to restore the persisted one
    if (value === "all" && selectedBuilding !== "all") {
      const latest = [...analyses]
        .filter(a => a.building_name === selectedBuilding)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (latest?.evolution_analysis) {
        setAiAnalysis(latest.evolution_analysis);
        setDeviation(latest.deviation_stats);
      } else {
        setAiAnalysis(null);
        setDeviation(null);
      }
    } else {
      setAiAnalysis(null);
      setDeviation(null);
    }

    if (value === "all") {
      searchParams.delete("categoria");
    } else {
      searchParams.set("categoria", value);
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

  // Fetch building profile for the selected building
  const fetchBuildingProfile = useCallback(async (buildingName: string) => {
    if (buildingName === "all") {
      setBuildingProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("building_profiles")
        .select("id, building_name, unit_count_range, age_category, zone, has_amenities")
        .ilike("building_name", buildingName)
        .maybeSingle();

      if (error) throw error;
      setBuildingProfile(data);
      return data;
    } catch (error) {
      console.error("Error fetching building profile:", error);
      setBuildingProfile(null);
      return null;
    }
  }, []);

  // Fetch buildings trend with optional profile filters
  const fetchBuildingsTrend = useCallback(async (profile?: BuildingProfile | null, category?: string) => {
    try {
      // Build filters from profile if available
      const filters: Record<string, any> = {};
      if (profile) {
        if (profile.unit_count_range) filters.unit_count_range = profile.unit_count_range;
        if (profile.age_category) filters.age_category = profile.age_category;
        if (profile.zone) filters.zone = profile.zone;
        if (profile.has_amenities !== null) filters.has_amenities = profile.has_amenities;
      }

      if (category && category !== "all") {
        filters.category = category;
      }

      const hasFilters = Object.keys(filters).length > 0;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-buildings-trend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            filters: hasFilters ? filters : undefined,
            fallbackIfEmpty: true  // Request fallback to all buildings if no matches
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setBuildingsTrend(result.data);
          setBuildingsTrendStats(result.stats || null);
        }
      }
    } catch (error) {
      console.error("Error fetching buildings trend:", error);
    }
  }, []);


  // Load comparison data with profile-based filtering
  const loadComparisonData = useCallback(async (buildingName?: string, categoryName?: string) => {
    setIsLoadingComparison(true);

    // Fetch building profile first if a building is selected
    let profile: BuildingProfile | null = null;
    if (buildingName && buildingName !== "all") {
      profile = await fetchBuildingProfile(buildingName);
    }

    // Fetch inflation and buildings trend (with profile filters if available)
    await Promise.all([
      fetchInflationData(),
      fetchBuildingsTrend(profile, categoryName)
    ]);

    setIsLoadingComparison(false);
  }, [fetchInflationData, fetchBuildingsTrend, fetchBuildingProfile]);

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
          .select("id, building_name, period, period_date, total_amount, created_at, scanned_at, evolution_analysis, deviation_stats, expense_categories(name, current_amount)")
          .eq("status", "completed")
          .order("created_at", { ascending: true }) as { data: Analysis[] | null, error: any };

        if (error) throw error;
        setAnalyses(data || []);

        if (data && data.length > 0) {
          const bName = searchParams.get("edificio") || data.find(a => a.building_name)?.building_name;
          if (bName && searchParams.get("categoria") === null || searchParams.get("categoria") === "all") {
            const latest = [...data]
              .filter(a => a.building_name === bName)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            if (latest?.evolution_analysis) {
              setAiAnalysis(latest.evolution_analysis);
              setDeviation(latest.deviation_stats);
            }
          }

          if (!searchParams.get("edificio") && bName) {
            setSelectedBuilding(bName);
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

  // Load comparison data when analyses are loaded or building/category changes
  useEffect(() => {
    if (analyses.length > 0) {
      loadComparisonData(selectedBuilding, selectedCategory);
    }
  }, [analyses.length, selectedBuilding, selectedCategory, loadComparisonData]);

  // Calculate deviation when comparison data changes - automatically, without needing AI analysis
  useEffect(() => {
    if (comparisonData.length >= 2) {
      const last = comparisonData[comparisonData.length - 1];

      // Find the last data point with valid inflation data (not null)
      const lastWithInflation = [...comparisonData].reverse().find(d => d.inflationPercent !== null);
      const fromInflation = lastWithInflation
        ? lastWithInflation.userPercent - lastWithInflation.inflationPercent!
        : 0;

      // Find the last data point with valid buildings data (not null)
      const lastWithBuildings = [...comparisonData].reverse().find(d => d.buildingsPercent !== null);
      const fromBuildings = lastWithBuildings
        ? lastWithBuildings.userPercent - lastWithBuildings.buildingsPercent!
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild size="sm">
                <Link to="/historial">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Volver</span>
                </Link>
              </Button>
            </div>
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
              {/* Selectors */}
              <Card variant="soft" className="mb-6 animate-fade-in-up">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Edificio:</span>
                      </div>
                      <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
                        <SelectTrigger className="w-full sm:w-[220px]">
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
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Categoría:</span>
                      </div>
                      <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                          <SelectValue placeholder="Ver todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Monto total (todas)</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isLoadingComparison && (
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground shrink-0 self-center" />
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
                        <CardTitle className="text-lg">
                          {selectedCategory === "all" ? "Evolución del gasto total" : `Evolución de ${selectedCategory}`}
                        </CardTitle>
                        <CardDescription>
                          {selectedBuilding === "all"
                            ? "Todos los edificios"
                            : selectedBuilding}
                        </CardDescription>
                      </div>
                      {stats && stats.count >= 2 && (
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${stats.changePercent > 0
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
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                    categoryName={selectedCategory !== "all" ? selectedCategory : undefined}
                    deviation={deviation || undefined}
                    analysis={aiAnalysis}
                    isLoadingAnalysis={isLoadingAnalysis}
                    buildingsTrendStats={buildingsTrendStats}
                  />
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
                                <span className={`text-xs font-medium ${change > 0 ? "text-status-attention" : "text-status-ok"
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
