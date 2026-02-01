import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  LogOut,
  Share2,
  MessageCircle,
  Mail,
  History,
  Link2,
  Copy,
  Check,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { AnomalyAlerts } from "@/components/AnomalyAlerts";
import { AnalysisNotes } from "@/components/AnalysisNotes";
import { HistoricalEvolutionChart } from "@/components/HistoricalEvolutionChart";
import { EvolutionComparisonChart } from "@/components/EvolutionComparisonChart";
import { ComparisonChart } from "@/components/ComparisonChart";


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
              <span className="hidden sm:inline">Analizar otra expensa</span>
              <span className="sm:hidden">Analizar</span>
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
  scanned_at: string | null;
  notes: string | null;
}

interface HistoricalDataPoint {
  id: string;
  period: string;
  total_amount: number;
  period_date: string | null;
}

interface EvolutionDataPoint {
  period: string;
  userPercent: number;
  inflationPercent: number | null;
  inflationEstimated?: boolean;
  buildingsPercent: number | null;
}

interface Deviation {
  fromInflation: number;
  fromBuildings: number;
  isSignificant: boolean;
}

interface BuildingsTrendStats {
  totalBuildings: number;
  totalAnalyses: number;
  periodsCount: number;
  filtersApplied: boolean;
  usedFallback?: boolean;
}

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

const formatShortDate = (dateString: string) => {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
};

const AnalysisPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previousPeriodLabel, setPreviousPeriodLabel] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [evolutionData, setEvolutionData] = useState<EvolutionDataPoint[]>([]);
  const [deviation, setDeviation] = useState<Deviation | null>(null);
  const [buildingsTrendStats, setBuildingsTrendStats] = useState<BuildingsTrendStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      try {
        // Fetch analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from("expense_analyses")
          .select("*")
          .eq("id", id)
          .single();

        if (analysisError) throw analysisError;
        setAnalysis(analysisData);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("expense_categories")
          .select("*")
          .eq("analysis_id", id)
          .order("current_amount", { ascending: false });

        if (categoriesError) throw categoriesError;
        const rawCategories = (categoriesData || []) as Category[];
        setCategories(rawCategories);
        setPreviousPeriodLabel(null);

        // Check for existing shared link
        const { data: existingLink } = await supabase
          .from("shared_analysis_links")
          .select("token, is_active")
          .eq("analysis_id", id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingLink) {
          setSharedLink(`${window.location.origin}/compartido/${existingLink.token}`);
        }

        // Fetch historical data and evolution if building name exists
        if (analysisData?.building_name) {
          // Fetch historical analyses for this building
          const { data: historicalAnalyses } = await supabase
            .from("expense_analyses")
            .select("id, period, total_amount, period_date")
            .eq("user_id", session.user.id)
            .eq("building_name", analysisData.building_name)
            .order("period_date", { ascending: true, nullsFirst: false });

          if (historicalAnalyses && historicalAnalyses.length > 0) {
            // Limit historical analyses to 15 periods ending at the current analysis
            let slicedHistoricalAnalyses = historicalAnalyses || [];
            if (slicedHistoricalAnalyses.length > 0) {
              const currentIdx = slicedHistoricalAnalyses.findIndex((h) => h.id === analysisData.id);
              if (currentIdx !== -1) {
                const startIdx = Math.max(0, currentIdx - 14); // 15 periods total
                slicedHistoricalAnalyses = slicedHistoricalAnalyses.slice(startIdx, currentIdx + 1);
              } else {
                slicedHistoricalAnalyses = slicedHistoricalAnalyses.slice(-15);
              }
            }

            setHistoricalData(slicedHistoricalAnalyses);

            // Enrich previous-period data for older analyses (when previous_* fields are null)
            const globalCurrentIdx = historicalAnalyses.findIndex((h) => h.id === analysisData.id);
            const previousAnalysis = globalCurrentIdx > 0 ? historicalAnalyses[globalCurrentIdx - 1] : null;

            if (previousAnalysis) {
              setPreviousPeriodLabel(previousAnalysis.period);

              const needsPrevTotal = analysisData.previous_total === null;
              const needsPrevCategories = rawCategories.some((c) => c.previous_amount === null);

              if (needsPrevTotal || needsPrevCategories) {
                const { data: prevCats, error: prevCatsError } = await supabase
                  .from("expense_categories")
                  .select("name, current_amount")
                  .eq("analysis_id", previousAnalysis.id);

                if (prevCatsError) throw prevCatsError;

                const normalizeName = (name: string) => name.toLowerCase().trim();
                const prevMap = new Map<string, number>(
                  (prevCats || []).map((c) => [normalizeName(c.name), c.current_amount])
                );

                if (needsPrevCategories) {
                  const enriched = rawCategories.map((c) => ({
                    ...c,
                    previous_amount:
                      c.previous_amount !== null
                        ? c.previous_amount
                        : (prevMap.get(normalizeName(c.name)) ?? null),
                  }));

                  setCategories(enriched);
                }

                if (needsPrevTotal) {
                  setAnalysis({ ...(analysisData as any), previous_total: previousAnalysis.total_amount });
                }
              }
            }

            // Fetch inflation data using the same method as Evolucion.tsx
            const inflationResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-inflation`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
              }
            );

            let inflationData = null;
            if (inflationResponse.ok) {
              const result = await inflationResponse.json();
              if (result.data) {
                inflationData = result.data;
              }
            }

            // Fetch other buildings data for comparison
            const { data: otherBuildingsData } = await supabase
              .from("expense_analyses")
              .select("id, period, total_amount, period_date, building_name, user_id")
              .neq("building_name", analysisData.building_name)
              .order("period_date", { ascending: true, nullsFirst: false });

            // Calculate evolution data
            if (slicedHistoricalAnalyses.length >= 2) {
              const baseTotal = slicedHistoricalAnalyses[0].total_amount;

              // Create inflation map - use YYYY-MM format like in Evolucion.tsx
              const inflationMap = new Map<string, { value: number; is_estimated: boolean }>();
              if (inflationData) {
                inflationData.forEach(inf => {
                  inflationMap.set(inf.period, { value: inf.value, is_estimated: inf.is_estimated });
                });
              }

              // Helper to get YYYY-MM from period_date or parse from period string (same as Evolucion.tsx)
              const getYYYYMM = (periodDate: string | null, period: string): string | null => {
                if (periodDate) {
                  // Direct extraction from YYYY-MM-DD string to avoid timezone issues
                  const parts = periodDate.split('-');
                  if (parts.length >= 2) {
                    return `${parts[0]}-${parts[1].padStart(2, '0')}`;
                  }
                }
                // Check if period is already in YYYY-MM format
                if (/^\d{4}-\d{2}$/.test(period)) {
                  return period;
                }
                // Parse Spanish period like "enero 2024"
                const monthsEs: Record<string, number> = {
                  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
                  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
                };
                const parts = period.toLowerCase().trim().split(/\s+/);
                if (parts.length >= 2) {
                  const month = monthsEs[parts[0]];
                  if (month !== undefined) {
                    const year = parseInt(parts[1]) || new Date().getFullYear();
                    return `${year}-${String(month + 1).padStart(2, '0')}`;
                  }
                }
                return null;
              };

              // Find base inflation value for the first sliced period (same as Evolucion.tsx)
              const firstSlicedPeriodData = slicedHistoricalAnalyses[0];
              const firstSlicedPeriodYYYYMM = getYYYYMM(firstSlicedPeriodData.period_date, firstSlicedPeriodData.period);
              const baseInflation = firstSlicedPeriodYYYYMM ? (inflationMap.get(firstSlicedPeriodYYYYMM) ?? null) : null;

              // Calculate other buildings average by period
              const buildingsAvgByPeriod = new Map<string, number[]>();
              if (otherBuildingsData) {
                otherBuildingsData.forEach(b => {
                  const pKey = b.period;
                  if (!buildingsAvgByPeriod.has(pKey)) {
                    buildingsAvgByPeriod.set(pKey, []);
                  }
                  buildingsAvgByPeriod.get(pKey)!.push(b.total_amount);
                });
              }

              // Get first sliced period averages for other buildings
              const firstSlicedPeriod = slicedHistoricalAnalyses[0].period;
              const firstSlicedPeriodOtherBuildingsArr = buildingsAvgByPeriod.get(firstSlicedPeriod);
              const baseOtherBuildings = firstSlicedPeriodOtherBuildingsArr && firstSlicedPeriodOtherBuildingsArr.length > 0
                ? firstSlicedPeriodOtherBuildingsArr.reduce((a, b) => a + b, 0) / firstSlicedPeriodOtherBuildingsArr.length
                : null;

              const evolution: EvolutionDataPoint[] = slicedHistoricalAnalyses.map((h) => {
                const userPercent = baseTotal > 0 ? ((h.total_amount - baseTotal) / baseTotal) * 100 : 0;

                // Calculate inflation percent change from base (same as Evolucion.tsx)
                let inflationPercent: number | null = null;
                let inflationEstimated = false;

                const periodYYYYMM = getYYYYMM(h.period_date, h.period);
                if (periodYYYYMM && baseInflation !== null) {
                  const inflationItem = inflationMap.get(periodYYYYMM);
                  if (inflationItem) {
                    inflationPercent = ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100;
                    inflationEstimated = inflationItem.is_estimated;
                  }
                }

                let buildingsPercent: number | null = null;
                if (baseOtherBuildings !== null) {
                  const periodBuildings = buildingsAvgByPeriod.get(h.period);
                  if (periodBuildings && periodBuildings.length > 0) {
                    const avgThisPeriod = periodBuildings.reduce((a, b) => a + b, 0) / periodBuildings.length;
                    buildingsPercent = ((avgThisPeriod - baseOtherBuildings) / baseOtherBuildings) * 100;
                  }
                }

                return {
                  period: h.period,
                  userPercent,
                  inflationPercent,
                  inflationEstimated,
                  buildingsPercent
                };
              });

              setEvolutionData(evolution);

              // Calculate deviation for latest period
              const latestEvolution = evolution[evolution.length - 1];
              if (latestEvolution) {
                const fromInflation = latestEvolution.inflationPercent !== null
                  ? latestEvolution.userPercent - latestEvolution.inflationPercent
                  : 0;
                const fromBuildings = latestEvolution.buildingsPercent !== null
                  ? latestEvolution.userPercent - latestEvolution.buildingsPercent
                  : 0;

                setDeviation({
                  fromInflation,
                  fromBuildings,
                  isSignificant: Math.abs(fromInflation) > 10 || Math.abs(fromBuildings) > 10
                });
              }

              // Set buildings trend stats
              if (otherBuildingsData) {
                const uniqueBuildings = new Set(otherBuildingsData.map(b => b.building_name));
                const uniquePeriods = new Set(otherBuildingsData.map(b => b.period));
                setBuildingsTrendStats({
                  totalBuildings: uniqueBuildings.size,
                  totalAnalyses: otherBuildingsData.length,
                  periodsCount: uniquePeriods.size,
                  filtersApplied: false
                });
              }
            }
          }
        }
      } catch (error: any) {
        console.error("Error fetching analysis:", error);
        toast.error("Error al cargar el análisis");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, navigate]);

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

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Análisis no encontrado</h1>
          <Button asChild>
            <Link to="/analizar">Volver</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totalChange = calculateChange(analysis.total_amount, analysis.previous_total);
  const attentionItems = categories.filter(c => c.status === "attention").length;

  const generateShareText = () => {
    const statusText = attentionItems > 0
      ? `⚠️ ${attentionItems} punto(s) a revisar`
      : "✅ Todo en orden";

    // Find categories with biggest changes
    const sortedByChange = [...categories]
      .filter(c => c.previous_amount)
      .map(c => ({
        name: c.name,
        change: calculateChange(c.current_amount, c.previous_amount) || 0,
        current: c.current_amount,
        previous: c.previous_amount!,
        status: c.status
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const topChanges = sortedByChange.slice(0, 3);
    const difference = analysis.previous_total
      ? analysis.total_amount - analysis.previous_total
      : null;

    let detailText = "";
    if (topChanges.length > 0) {
      detailText = "\n📋 *Principales variaciones:*\n" + topChanges.map(c =>
        `• ${c.name}: ${c.change > 0 ? "+" : ""}${c.change.toFixed(1)}% (${formatCurrency(c.current)})`
      ).join("\n");
    }

    const attentionCategories = categories.filter(c => c.status === "attention");
    let attentionText = "";
    if (attentionCategories.length > 0) {
      attentionText = "\n\n🔍 *Puntos de atención:*\n" + attentionCategories.map(c =>
        `• ${c.name}`
      ).join("\n");
    }

    return `📊 *Análisis de Expensas - ExpensaCheck*

🏢 ${analysis.building_name || "Mi edificio"}
📅 Período: ${analysis.period}

💰 *Total: ${formatCurrency(analysis.total_amount)}*
${analysis.previous_total ? `📈 Mes anterior: ${formatCurrency(analysis.previous_total)}
💵 Diferencia: ${difference && difference > 0 ? "+" : ""}${difference ? formatCurrency(difference) : "-"} (${totalChange && totalChange > 0 ? "+" : ""}${totalChange?.toFixed(1) || 0}%)` : ""}

${statusText}
${detailText}${attentionText}

---
Analizá tu expensa en ExpensaCheck`;
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Análisis de Expensas - ${analysis.period}`);
    const body = encodeURIComponent(generateShareText().replace(/\*/g, ""));
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const generateShareableLink = async () => {
    if (!analysis || !id) return;

    setIsGeneratingLink(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión para generar un enlace");
        return;
      }

      // Generate a unique token
      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

      const { error } = await supabase
        .from("shared_analysis_links")
        .insert({
          analysis_id: id,
          token: token,
          created_by: session.user.id,
          is_active: true
        });

      if (error) throw error;

      const link = `${window.location.origin}/compartido/${token}`;
      setSharedLink(link);

      // Copy to clipboard
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);

      toast.success("Enlace creado y copiado al portapapeles");
    } catch (error: any) {
      console.error("Error generating link:", error);
      toast.error("Error al generar el enlace");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copySharedLink = async () => {
    if (!sharedLink) return;
    await navigator.clipboard.writeText(sharedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success("Enlace copiado al portapapeles");
  };


  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container max-w-4xl">
            <div className="flex items-center justify-between mb-8">
              <Button variant="ghost" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Link>
              </Button>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartir
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {sharedLink ? (
                      <DropdownMenuItem onClick={copySharedLink} className="cursor-pointer">
                        {linkCopied ? (
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2 text-primary" />
                        )}
                        {linkCopied ? "¡Copiado!" : "Copiar enlace público"}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={generateShareableLink} className="cursor-pointer" disabled={isGeneratingLink}>
                        {isGeneratingLink ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4 mr-2 text-primary" />
                        )}
                        Crear enlace público
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={shareViaWhatsApp} className="cursor-pointer">
                      <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareViaEmail} className="cursor-pointer">
                      <Mail className="w-4 h-4 mr-2 text-blue-600" />
                      Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                      {attentionItems > 0
                        ? "Tu expensa de este mes tiene algunos aumentos que merecen atención. A continuación te explicamos cada uno en detalle."
                        : "Tu expensa de este mes está dentro de los rangos normales. No detectamos aumentos inusuales."}
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

            {/* AI Summary */}
            <Card variant="soft" className="mb-8 animate-fade-in-up border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Resumen IA</p>
                  <p className="text-sm text-muted-foreground">
                    {attentionItems > 0
                      ? `Tu expensa de ${analysis.period} totaliza ${formatCurrency(analysis.total_amount)}${analysis.previous_total ? ` (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(0)}% vs anterior)` : ''}. ${attentionItems} categoría${attentionItems > 1 ? 's merecen' : ' merece'} revisión por aumentos significativos.`
                      : `Tu expensa de ${analysis.period} totaliza ${formatCurrency(analysis.total_amount)}${analysis.previous_total ? ` (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(0)}% vs anterior)` : ''}. Todos los rubros están dentro de parámetros normales.`}
                  </p>
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
                                          variant={category.status as any}
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
                                <div className={`flex items-center gap-1 text-sm font-medium ${change > 10 ? "text-status-attention" : change > 0 ? "text-muted-foreground" : "text-status-ok"
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

            {/* Anomaly Alerts */}
            {categories.length > 0 && (
              <div className="mb-8">
                <AnomalyAlerts categories={categories} threshold={30} />
              </div>
            )}


            {/* Visual Comparison Chart - Bar chart comparing with previous period */}
            {categories.length > 0 && categories.some(c => c.previous_amount !== null) && (
              <div className="mb-8">
                <ComparisonChart
                  data={categories
                    .filter(c => c.previous_amount !== null)
                    .map(c => ({
                      name: c.name,
                      leftAmount: c.previous_amount || 0,
                      rightAmount: c.current_amount,
                      diff: c.current_amount - (c.previous_amount || 0),
                      changePercent: c.previous_amount
                        ? ((c.current_amount - c.previous_amount) / c.previous_amount) * 100
                        : null
                    }))
                    .sort((a, b) => b.rightAmount - a.rightAmount)}
                  leftLabel={previousPeriodLabel ? previousPeriodLabel : "Mes anterior"}
                  rightLabel={analysis.period}
                />
              </div>
            )}

            {/* Historical Evolution Chart - Absolute values */}
            {analysis.building_name && (
              <div className="mb-8">
                <HistoricalEvolutionChart
                  buildingName={analysis.building_name}
                  currentAnalysisId={analysis.id}
                  currentPeriod={analysis.period}
                />
              </div>
            )}

            {/* Evolution Comparison Chart - Percentage with inflation and other buildings */}
            {evolutionData.length >= 2 && (
              <div className="mb-8">
                <EvolutionComparisonChart
                  data={evolutionData}
                  buildingName={analysis.building_name || "Este edificio"}
                  deviation={deviation || undefined}
                  buildingsTrendStats={buildingsTrendStats}
                />
              </div>
            )}


            {/* Analysis Notes */}
            <div className="mb-8">
              <AnalysisNotes
                analysisId={analysis.id}
                initialNotes={analysis.notes}
                onNotesUpdate={(notes) => setAnalysis(prev => prev ? { ...prev, notes } : null)}
              />
            </div>

            {/* Info Card */}
            <Card variant="soft" className="mb-8 animate-fade-in-up">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">¿Qué significa esto?</h3>
                    <p className="text-sm text-muted-foreground">
                      Los gastos marcados como "a revisar" no necesariamente son incorrectos.
                      Pueden deberse a aumentos de tarifas o gastos extraordinarios justificados.
                      Te recomendamos revisar las actas del consorcio o consultar con la administración
                      si tenés dudas sobre algún ítem específico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center pt-8">
              <p className="text-muted-foreground mb-4">
                ¿Querés analizar otra expensa?
              </p>
              <Button asChild variant="hero" size="lg">
                <Link to="/analizar">Subir nueva expensa</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default AnalysisPage;
