import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  FileText,
  LogOut,
  Plus,
  Filter,
  X,
  CalendarIcon,
  ArrowLeftRight,
  Trash2
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
  
  // Selection states for comparison
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<Analysis | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter states
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const handleDeleteClick = (analysis: Analysis, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnalysisToDelete(analysis);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!analysisToDelete) return;
    
    setIsDeleting(true);
    try {
      // First delete related categories
      const { error: categoriesError } = await supabase
        .from("expense_categories")
        .delete()
        .eq("analysis_id", analysisToDelete.id);

      if (categoriesError) throw categoriesError;

      // Then delete the analysis
      const { error: analysisError } = await supabase
        .from("expense_analyses")
        .delete()
        .eq("id", analysisToDelete.id);

      if (analysisError) throw analysisError;

      setAnalyses(prev => prev.filter(a => a.id !== analysisToDelete.id));
      toast.success("Análisis eliminado correctamente");
    } catch (error: any) {
      console.error("Error deleting analysis:", error);
      toast.error("Error al eliminar el análisis");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAnalysisToDelete(null);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < 2) {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 2) {
      navigate(`/comparar?left=${ids[0]}&right=${ids[1]}`);
    }
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Get unique buildings and periods for filter options
  const buildings = useMemo(() => {
    const unique = [...new Set(analyses.map(a => a.building_name).filter(Boolean))];
    return unique.sort();
  }, [analyses]);

  const periods = useMemo(() => {
    const unique = [...new Set(analyses.map(a => a.period))];
    return unique.sort().reverse();
  }, [analyses]);

  // Filter analyses
  const filteredAnalyses = useMemo(() => {
    return analyses.filter(analysis => {
      // Building filter
      if (buildingFilter !== "all" && analysis.building_name !== buildingFilter) {
        return false;
      }
      // Period filter
      if (periodFilter !== "all" && analysis.period !== periodFilter) {
        return false;
      }
      // Date range filter
      const analysisDate = new Date(analysis.created_at);
      if (dateFrom && analysisDate < dateFrom) {
        return false;
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (analysisDate > endOfDay) {
          return false;
        }
      }
      return true;
    });
  }, [analyses, buildingFilter, periodFilter, dateFrom, dateTo]);

  const hasActiveFilters = buildingFilter !== "all" || periodFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setBuildingFilter("all");
    setPeriodFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
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
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
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
            {analyses.length >= 2 && (
              <div className="flex items-center gap-2">
                {selectionMode ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={cancelSelection}>
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleCompare}
                      disabled={selectedIds.size !== 2}
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Comparar ({selectedIds.size}/2)
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Comparar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Filters Section */}
          {analyses.length > 0 && (
            <Card variant="soft" className="mb-6 animate-fade-in-up">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 ml-auto">
                      <X className="w-3 h-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Building filter */}
                  <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Edificio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los edificios</SelectItem>
                      {buildings.map((building) => (
                        <SelectItem key={building} value={building as string}>
                          {building}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Period filter */}
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date from */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Desde"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Date to */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Hasta"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Mostrando {filteredAnalyses.length} de {analyses.length} análisis
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
          ) : filteredAnalyses.length === 0 ? (
            <Card variant="soft" className="animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-6 h-6 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Sin resultados</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  No hay análisis que coincidan con los filtros seleccionados.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAnalyses.map((analysis, index) => {
                const change = calculateChange(analysis.total_amount, analysis.previous_total);
                const isSelected = selectedIds.has(analysis.id);
                
                const cardContent = (
                  <Card 
                    variant="interactive" 
                    className={cn(
                      "animate-fade-in-up transition-all",
                      isSelected && "ring-2 ring-primary"
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="flex-1 p-5 sm:p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {selectionMode && (
                                <Checkbox
                                  checked={isSelected}
                                  disabled={!isSelected && selectedIds.size >= 2}
                                  className="mt-1"
                                  onClick={(e) => toggleSelection(analysis.id, e)}
                                />
                              )}
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
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!selectionMode && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => handleDeleteClick(analysis, e)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Badge variant="ok">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completo
                              </Badge>
                            </div>
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
                );

                if (selectionMode) {
                  return (
                    <div 
                      key={analysis.id} 
                      className="cursor-pointer"
                      onClick={(e) => toggleSelection(analysis.id, e)}
                    >
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <Link 
                    key={analysis.id} 
                    to={`/analisis/${analysis.id}`}
                    className="block"
                  >
                    {cardContent}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este análisis?</AlertDialogTitle>
            <AlertDialogDescription>
              {analysisToDelete && (
                <>
                  Vas a eliminar el análisis de <strong>{analysisToDelete.building_name || "Edificio"}</strong> del período <strong>{analysisToDelete.period}</strong>.
                  <br /><br />
                  Esta acción no se puede deshacer. Se eliminarán todos los datos y categorías asociadas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Historial;
