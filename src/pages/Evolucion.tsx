import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

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

interface Analysis {
  id: string;
  building_name: string | null;
  period: string;
  total_amount: number;
  created_at: string;
  scanned_at: string | null;
}

interface ChartData {
  period: string;
  total: number;
  id: string;
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

    // Sort by period (try to parse month/year)
    const sorted = [...filtered].sort((a, b) => {
      // Try to extract date from period like "Enero 2024"
      const monthsEs: Record<string, number> = {
        enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
        julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
      };
      
      const parseDate = (period: string) => {
        const parts = period.toLowerCase().split(' ');
        if (parts.length >= 2) {
          const month = monthsEs[parts[0]] ?? 0;
          const year = parseInt(parts[1]) || 2024;
          return new Date(year, month);
        }
        return new Date(a.created_at);
      };

      return parseDate(a.period).getTime() - parseDate(b.period).getTime();
    });

    return sorted.map(a => ({
      period: a.period,
      total: a.total_amount,
      id: a.id,
    }));
  }, [analyses, selectedBuilding]);

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
    if (value === "all") {
      searchParams.delete("edificio");
    } else {
      searchParams.set("edificio", value);
    }
    setSearchParams(searchParams);
  };

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
          .select("id, building_name, period, total_amount, created_at, scanned_at")
          .eq("status", "completed")
          .order("created_at", { ascending: true });

        if (error) throw error;
        setAnalyses(data || []);

        // Auto-select first building if coming without param and buildings exist
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
                  Seguimiento histórico por edificio
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

              {/* Evolution Chart */}
              {chartData.length > 0 ? (
                <Card variant="elevated" className="animate-fade-in-up">
                  <CardHeader>
                    <div className="flex items-center justify-between">
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
                    <div className="h-[400px] w-full">
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
              ) : (
                <Card variant="soft" className="animate-fade-in-up">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      No hay datos para el edificio seleccionado.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Period List */}
              {chartData.length > 0 && (
                <Card variant="soft" className="mt-6 animate-fade-in-up">
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