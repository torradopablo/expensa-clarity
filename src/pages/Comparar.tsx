import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComparisonChart } from "@/components/ComparisonChart";
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
  AlertTriangle,
  Download,
  RefreshCw
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/layout/ui/logo";

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
          <Logo className="w-8 h-8" />
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
  const [isExporting, setIsExporting] = useState(false);

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

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById("comparar-report-content");
      if (!element) return;

      const filtersCard = document.getElementById("comparison-filters-card");
      const pdfSummary = document.getElementById("pdf-comparison-summary");

      // 1. Prepare View for Capture
      if (filtersCard) filtersCard.style.display = "none";
      if (pdfSummary) pdfSummary.style.display = "block";

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
      if (pdfSummary) pdfSummary.style.display = "none";

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
        pdf.text(`ExpensaCheck - Comparativa - Pág ${pageNumber}`, margin, margin);

        drawFooter(pageNumber);

        heightLeft -= availableHeight;
        printedHeight += availableHeight;
      }

      pdf.save(`Comparativa_Expensas_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Comparativa descargada correctamente");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsExporting(false);
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
            <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al historial
            </Button>
            {leftId && rightId && !loadingDetails && (
              <Button onClick={exportToPDF} disabled={isExporting} variant="outline" className="gap-2">
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? "Generando PDF..." : "Descargar comparativa"}
              </Button>
            )}
          </div>

          <div id="comparar-report-content">
            <h1 className="text-3xl font-bold mb-2">Comparar Análisis</h1>
            <p className="text-muted-foreground mb-8">
              Seleccioná dos análisis para ver las diferencias lado a lado
            </p>

            {/* Selection Area - Interactive (Hidden on PDF) */}
            <Card id="comparison-filters-card" className="mb-8">
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

            {/* Static PDF Summary (Hidden on Screen) */}
            <div id="pdf-comparison-summary" className="hidden mb-8 p-6 border rounded-xl bg-gray-50 border-gray-200">
              <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center text-sm">
                <div>
                  <span className="block font-semibold text-gray-500 mb-1">Análisis Base</span>
                  <span className="text-lg font-medium">
                    {leftAnalysis ? `${leftAnalysis.building_name || "Edificio"} - ${leftAnalysis.period}` : "No seleccionado"}
                  </span>
                </div>

                <div className="px-4 text-gray-400">vs</div>

                <div className="text-right">
                  <span className="block font-semibold text-gray-500 mb-1">Comparado con</span>
                  <span className="text-lg font-medium">
                    {rightAnalysis ? `${rightAnalysis.building_name || "Edificio"} - ${rightAnalysis.period}` : "No seleccionado"}
                  </span>
                </div>
              </div>
            </div>

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
                        <div className={`text-lg font-semibold flex items-center gap-1 ${totalDiff > 0 ? "text-status-attention" : totalDiff < 0 ? "text-status-ok" : "text-muted-foreground"
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

                {/* Bar Chart Comparison */}
                {categoryComparison.length > 0 && (
                  <div className="mb-8">
                    <ComparisonChart
                      data={categoryComparison}
                      leftLabel={`${leftAnalysis.building_name || "Edificio"} - ${leftAnalysis.period}`}
                      rightLabel={`${rightAnalysis.building_name || "Edificio"} - ${rightAnalysis.period}`}
                    />
                  </div>
                )}

                {/* Category Comparison */}
                <h2 className="text-xl font-semibold mb-4">Detalle por Categoría</h2>
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
                              <div className={`text-xs flex items-center gap-1 ${isIncrease ? "text-status-attention" : isDecrease ? "text-status-ok" : "text-muted-foreground"
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

            {/* Footer removed, handled by jsPDF */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompararPage;
