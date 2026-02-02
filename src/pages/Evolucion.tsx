import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
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
  TrendingUp,
  TrendingDown,
  Minus,
  LogOut,
  LineChart,
  Building,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  User,
  Download
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
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
import { useAnalysis } from "@/hooks/useAnalysis";
import { useEvolution } from "@/hooks/useEvolution";
import type { EvolutionData } from "@/types/analysis";

import { Logo } from "@/components/layout/ui/logo";

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
          <Logo className="w-8 h-8" />
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

const Evolucion = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);

  const { analyses, loading: loadingAnalyses } = useAnalysis();
  const {
    inflationData,
    buildingsTrendStats,
    loading: loadingEvolution,
    calculateEvolution
  } = useEvolution();

  const [selectedBuilding, setSelectedBuilding] = useState<string>(
    searchParams.get("edificio") || "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("categoria") || "all"
  );
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [deviation, setDeviation] = useState<any | null>(null);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById("evolucion-report-content");
      if (!element) return;

      const filtersCard = document.getElementById("filters-card");
      const pdfFilterSummary = document.getElementById("pdf-filter-summary");

      // 1. Prepare View for Capture
      if (filtersCard) filtersCard.style.display = "none";
      if (pdfFilterSummary) pdfFilterSummary.style.display = "block";

      // 2. Set fixed width for consistency
      const originalWidth = element.style.width;
      const originalPadding = element.style.padding;
      const originalBg = element.style.backgroundColor;

      element.style.width = "1100px";
      element.style.padding = "40px";
      element.style.backgroundColor = "#ffffff";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200
      });

      // 3. Restore View
      element.style.width = originalWidth;
      element.style.padding = originalPadding;
      element.style.backgroundColor = originalBg;

      if (filtersCard) filtersCard.style.display = "";
      if (pdfFilterSummary) pdfFilterSummary.style.display = "none";

      // 4. Generate PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const footerHeight = 15; // Space reserved for footer

      const printWidth = pdfWidth - (margin * 2);

      const imgHeight = (canvas.height * printWidth) / canvas.width;
      let heightLeft = imgHeight;
      let printedHeight = 0;
      let pageNumber = 1;

      // Helper to draw footer
      const drawFooter = (pageNo: number) => {
        const footerY = pdfHeight - 10;
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, footerY - 5, pdfWidth - margin, footerY - 5);

        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text("ExpensaCheck", margin, footerY);
        pdf.text(`Generado el ${new Date().toLocaleDateString()}`, pdfWidth - margin, footerY, { align: "right" });
        pdf.text(`Pág ${pageNo}`, pdfWidth / 2, footerY, { align: "center" });
      };

      // --- First Page ---
      // Content area on Page 1: from [margin] to [pdfHeight - margin - footerHeight]
      const startY = margin;
      const maxContentY = pdfHeight - margin - footerHeight;
      const firstPageCap = maxContentY - startY; // Available height for content

      pdf.addImage(imgData, "PNG", margin, startY, printWidth, imgHeight);

      // MASK BOTTOM (to protect footer)
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, maxContentY, pdfWidth, pdfHeight - maxContentY, "F");

      drawFooter(1);

      heightLeft -= firstPageCap;
      printedHeight += firstPageCap;

      // --- Subsequent Pages ---
      while (heightLeft > 0) {
        pageNumber++;
        pdf.addPage();

        const headerHeight = 8;
        const pageStartY = margin + headerHeight;
        const pageMaxContentY = pdfHeight - margin - footerHeight;
        const availableHeight = pageMaxContentY - pageStartY;

        pdf.addImage(imgData, "PNG", margin, pageStartY - printedHeight, printWidth, imgHeight);

        // MASK TOP (Cover previous content above header)
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pageStartY, "F");

        // MASK BOTTOM (Cover future content below footer area)
        pdf.rect(0, pageMaxContentY, pdfWidth, pdfHeight - pageMaxContentY, "F");

        // Header
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        pdf.text(`ExpensaCheck - Informe de Evolución`, margin, margin);

        drawFooter(pageNumber);

        heightLeft -= availableHeight;
        printedHeight += availableHeight;
      }

      pdf.save(`Evolución_Expensas_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Informe descargado correctamente");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Get unique buildings from completed analyses
  const buildings = useMemo(() => {
    const completed = analyses.filter(a => a.status === "completed");
    const unique = [...new Set(completed.map(a => a.building_name).filter(Boolean))] as string[];
    return unique.sort();
  }, [analyses]);

  // If no building is selected, try to pick one
  useEffect(() => {
    if (selectedBuilding === "all" && buildings.length > 0 && !searchParams.get("edificio")) {
      setSelectedBuilding(buildings[0]);
    }
  }, [buildings, selectedBuilding, searchParams]);

  // Get unique categories for the selected building (or all buildings)
  const categories = useMemo(() => {
    let filteredAnalyses = analyses.filter(a => a.status === "completed");
    if (selectedBuilding !== "all") {
      filteredAnalyses = filteredAnalyses.filter(a => a.building_name === selectedBuilding);
    }

    const allCategories = filteredAnalyses.flatMap(a => (a.expense_categories || []).map(c => c.name));
    return [...new Set(allCategories)].sort();
  }, [analyses, selectedBuilding]);

  // Filter and prepare chart data
  const chartData = useMemo(() => {
    let filtered = analyses.filter(a => a.status === "completed");

    if (selectedBuilding !== "all") {
      filtered = filtered.filter(a => a.building_name === selectedBuilding);
    }

    // Sort by period_date if available, otherwise fallback
    const sorted = [...filtered].sort((a, b) => {
      if (a.period_date && b.period_date) {
        return new Date(a.period_date).getTime() - new Date(b.period_date).getTime();
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

  // Use the hook to calculate comparison data
  const comparisonData = useMemo(() => {
    const baseEvolution = calculateEvolution(analyses.filter(a =>
      a.status === "completed" &&
      (selectedBuilding === "all" || a.building_name === selectedBuilding)
    ), selectedCategory);

    if (baseEvolution.length < 2) return [];

    // Enhance with inflation and buildings data
    const inflationMap = new Map(inflationData.map(d => [d.period, d.value]));
    const firstPeriod = periodToYearMonth(baseEvolution[0].period, null);
    const baseInflation = firstPeriod ? inflationMap.get(firstPeriod) : null;

    return baseEvolution.map(point => {
      const yyyymm = periodToYearMonth(point.period, (point as any).periodDate);

      let infPercent = null;
      if (yyyymm && baseInflation) {
        const currentInf = inflationMap.get(yyyymm);
        if (currentInf) {
          infPercent = ((currentInf - baseInflation) / baseInflation) * 100;
        }
      }

      return {
        ...point,
        inflationPercent: infPercent,
        buildingsPercent: buildingsTrendStats ? buildingsTrendStats.averageIncrease : null
      } as EvolutionData;
    });
  }, [analyses, selectedBuilding, selectedCategory, inflationData, buildingsTrendStats, calculateEvolution]);

  // Update AI analysis based on selected building
  useEffect(() => {
    const completed = analyses.filter(a => a.status === "completed");
    if (selectedBuilding !== "all" && selectedCategory === "all") {
      const latest = [...completed]
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
  }, [analyses, selectedBuilding, selectedCategory]);

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

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value === "all") {
      searchParams.delete("categoria");
    } else {
      searchParams.set("categoria", value);
    }
    setSearchParams(searchParams);
  };

  const isLoading = loadingAnalyses || loadingEvolution;

  if (isLoading && analyses.length === 0) {
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <Button variant="ghost" className="pl-0 mb-2 hover:bg-transparent" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al historial
              </Button>
            </div>
            <Button onClick={exportToPDF} disabled={isExporting || loadingAnalyses} variant="outline" className="gap-2">
              {isExporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? "Generando PDF..." : "Descargar informe"}
            </Button>
          </div>

          <div id="evolucion-report-content">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Evolución de Expensas</h1>
              <p className="text-muted-foreground mt-1">
                Analizá cómo variaron tus gastos en comparación con la inflación y el mercado.
              </p>
            </div>

            {analyses.filter(a => a.status === "completed").length === 0 ? (
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
                {/* Selectors - Interactive (Hidden on PDF) */}
                <Card id="filters-card" variant="soft" className="mb-6 animate-fade-in-up">
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

                      {loadingEvolution && (
                        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground shrink-0 self-center" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Static Filter Summary for PDF (Hidden on Screen) */}
                <div id="pdf-filter-summary" className="hidden mb-6 p-4 border rounded-xl bg-gray-50 border-gray-200">
                  <div className="flex flex-row justify-between items-center text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold">Edificio: </span>
                      <span>{selectedBuilding === "all" ? "Todos los edificios" : selectedBuilding}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold">Categoría: </span>
                      <span>{selectedCategory === "all" ? "Monto total (todas)" : selectedCategory}</span>
                    </div>
                  </div>
                </div>

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
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="period"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                              dy={10}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "12px",
                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                fontSize: "12px"
                              }}
                              formatter={(value: number) => [formatCurrency(value), "Monto"]}
                            />
                            <Area
                              type="monotone"
                              dataKey="total"
                              stroke="hsl(var(--primary))"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorTotal)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comparison Chart */}
                {comparisonData.length >= 2 && (
                  <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                    <EvolutionComparisonChart
                      data={comparisonData}
                      buildingName={selectedBuilding !== "all" ? selectedBuilding : "Mis edificios"}
                      categoryName={selectedCategory !== "all" ? selectedCategory : "Total"}
                      buildingsTrendStats={buildingsTrendStats}
                    />
                  </div>
                )}

                {/* AI Analysis / Evolution Insights */}
                {aiAnalysis && (
                  <Card variant="elevated" className="mt-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Análisis de evolución inteligente</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                        {aiAnalysis}
                      </div>

                      {deviation && deviation.isSignificant && (
                        <div className="mt-6 p-4 bg-status-attention-bg border border-status-attention/20 rounded-xl flex gap-3">
                          <TrendingUp className="w-5 h-5 text-status-attention shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-status-attention">Desviación detectada</p>
                            <p className="text-xs text-muted-foreground">
                              Tus expensas están {deviation.fromInflation > 0 ? "por encima" : "por debajo"} de la inflación acumulada en un {Math.abs(deviation.fromInflation).toFixed(1)}%.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Footer removed, handled by jsPDF */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Evolucion;
