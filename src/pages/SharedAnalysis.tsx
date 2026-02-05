import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ExternalLink,
  History,
  MessageSquare,
  Send,
  User
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Sparkles } from "lucide-react";
import { EvolutionComparisonChart } from "@/components/EvolutionComparisonChart";
import { ComparisonChart } from "@/components/ComparisonChart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Create a separate client for function calls that bypasses authentication
const supabaseFunctions = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

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

const formatShortCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value}`;
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
  user_id: string;
  building_name: string;
  building_address: string;
  period: string;
  period_date: string;
  total_amount: number;
  categories_count: number;
  created_at: string;
  owner_notes?: string;
}

interface HistoricalDataPoint {
  id: string;
  period: string;
  total_amount: number;
  created_at: string;
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

interface AnalysisComment {
  id: string;
  author_name: string;
  author_email: string | null;
  comment: string;
  created_at: string;
  is_owner_comment: boolean;
  user_id: string | null;
  parent_comment_id: string | null;
}

interface BuildingsTrendStats {
  totalBuildings: number;
  totalAnalyses: number;
  periodsCount: number;
  filtersApplied: boolean;
  usedFallback?: boolean;
}

import { Logo } from "@/components/layout/ui/logo";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
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

// Inline HistoricalEvolutionChart for shared view (no auth required)
const SharedHistoricalChart = ({
  historicalData,
  currentAnalysisId,
  currentPeriod,
  buildingName
}: {
  historicalData: HistoricalDataPoint[];
  currentAnalysisId: string;
  currentPeriod: string;
  buildingName: string | null;
}) => {
  if (historicalData.length < 2) {
    return null;
  }

  const chartData = historicalData.map((item) => ({
    period: item.period,
    total: item.total_amount,
    isCurrent: item.id === currentAnalysisId,
  }));

  const totals = historicalData.map((d) => d.total_amount);
  const average = totals.reduce((a, b) => a + b, 0) / totals.length;
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const currentTotal = historicalData.find((d) => d.id === currentAnalysisId)?.total_amount || 0;

  const firstTotal = historicalData[0]?.total_amount;
  const totalEvolution = firstTotal
    ? ((currentTotal - firstTotal) / firstTotal) * 100
    : null;

  return (
    <Card variant="glass" className="animate-fade-in-up">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center">
              <History className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">Evolución histórica</CardTitle>
              <p className="text-sm text-muted-foreground">
                {historicalData.length} análisis de {buildingName}
              </p>
            </div>
          </div>
          {totalEvolution !== null && (
            <Badge
              variant={totalEvolution > 0 ? "attention" : "ok"}
              className="flex items-center gap-1"
            >
              {totalEvolution > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {totalEvolution > 0 ? "+" : ""}{totalEvolution.toFixed(1)}% desde el primer análisis
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Promedio</p>
            <p className="font-semibold text-sm">{formatCurrency(average)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
            <p className="font-semibold text-sm text-status-ok">{formatCurrency(min)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Máximo</p>
            <p className="font-semibold text-sm text-status-attention">{formatCurrency(max)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Actual</p>
            <p className="font-semibold text-sm">{formatCurrency(currentTotal)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotalShared" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="period"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickFormatter={formatShortCurrency}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: number) => [formatCurrency(value), "Total"]}
              labelFormatter={(label) => `Período: ${label}`}
            />
            <ReferenceLine
              y={average}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              label={{
                value: "Promedio",
                position: "right",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorTotalShared)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isCurrent) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{
                r: 6,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-xs text-muted-foreground text-center mt-4">
          El punto más grande indica el análisis actual ({currentPeriod})
        </p>
      </CardContent>
    </Card>
  );
};

const SharedAnalysis = () => {
  const { token } = useParams<{ token: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [evolutionData, setEvolutionData] = useState<EvolutionDataPoint[]>([]);
  const [deviation, setDeviation] = useState<Deviation | null>(null);
  const [buildingsTrendStats, setBuildingsTrendStats] = useState<BuildingsTrendStats | null>(null);
  const [comments, setComments] = useState<AnalysisComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for new comment
  const [newComment, setNewComment] = useState({ author_name: '', author_email: '', comment: '' });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  
  // State for owner reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [ownerReply, setOwnerReply] = useState('');

  useEffect(() => {
    const fetchSharedAnalysis = async () => {
      if (!token) {
        setError("Token inválido");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Fetching shared analysis for token:", token);

        // Use edge function for all operations (bypasses RLS and works for both logged in and anonymous users)
        const { data: analysisResult, error: analysisError } = await supabaseFunctions
          .functions.invoke('get-shared-analysis', {
            body: { token }
          });

        console.log("Edge function response:", { analysisResult, analysisError });

        if (analysisError) {
          console.error("Edge function error:", analysisError);

          // Handle specific error cases from edge function
          if (analysisError.message?.includes("Link not found")) {
            setError("Este enlace no existe o ya no está disponible");
          } else if (analysisError.message?.includes("Link is deactivated")) {
            setError("Este enlace fue desactivado");
          } else if (analysisError.message?.includes("Link has expired")) {
            setError("Este enlace ha expirado");
          } else if (analysisError.message?.includes("Token is required")) {
            setError("Token inválido");
          } else {
            setError("Error al cargar el análisis compartido");
          }
          setIsLoading(false);
          return;
        }

        if (analysisResult.analysis) {
          console.log("Analysis loaded successfully");
          setAnalysis(analysisResult.analysis);
          setCategories(analysisResult.categories || []);
          setHistoricalData(analysisResult.historicalData || []);
          setEvolutionData(analysisResult.evolutionData || []);
          setDeviation(analysisResult.deviation || null);
          setBuildingsTrendStats(analysisResult.buildingsTrendStats || null);
          setComments(analysisResult.comments || []);
        } else {
          console.log("No analysis data in response");
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

  // Function to submit owner reply
  const handleOwnerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyingTo || !ownerReply.trim()) {
      setCommentError("Por favor escribe una respuesta");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      console.log('Submitting owner reply:', {
        token: token?.substring(0, 10) + '...',
        user_id: 'owner-user-id', // Esto debería venir del auth real
        parent_comment_id: replyingTo,
        comment: ownerReply.trim()
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-owner-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          token,
          user_id: 'owner-user-id', // Esto debería venir del auth real
          parent_comment_id: replyingTo,
          comment: ownerReply.trim()
        })
      });

      const responseData = await response.json();
      console.log('Response from owner-reply:', { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(responseData.error || `Error ${response.status}: ${response.statusText}`);
      }

      // Add new reply to local state
      const newReplyData = responseData.comment;
      setComments(prev => [...prev, newReplyData]);
      
      // Invalidate cache to ensure updated comments are shown
      try {
        await supabaseFunctions.functions.invoke('invalidate-share-cache', {
          body: { analysis_id: analysis?.id }
        });
      } catch (cacheError) {
        console.log('Cache invalidation failed:', cacheError);
        // Don't fail the comment submission if cache invalidation fails
      }
      
      // Reset form
      setOwnerReply('');
      setReplyingTo(null);
      
    } catch (err: any) {
      console.error('Error submitting owner reply:', err);
      setCommentError(err.message || 'Error al enviar la respuesta');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Function to submit a new comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !newComment.author_name.trim() || !newComment.comment.trim()) {
      setCommentError("Por favor completa tu nombre y el comentario");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      console.log('Submitting comment:', {
        token: token?.substring(0, 10) + '...',
        author_name: newComment.author_name.trim(),
        author_email: newComment.author_email.trim() || undefined,
        comment: newComment.comment.trim()
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-analysis-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          token,
          author_name: newComment.author_name.trim(),
          author_email: newComment.author_email.trim() || undefined,
          comment: newComment.comment.trim()
        })
      });

      const responseData = await response.json();
      console.log('Response from add-comment:', { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(responseData.error || `Error ${response.status}: ${response.statusText}`);
      }

      // Add the new comment to the local state
      const newCommentData = responseData.comment;
      setComments(prev => [...prev, newCommentData]);
      
      // Invalidate cache to ensure updated comments are shown
      try {
        await supabaseFunctions.functions.invoke('invalidate-share-cache', {
          body: { analysis_id: analysis?.id }
        });
      } catch (cacheError) {
        console.log('Cache invalidation failed:', cacheError);
        // Don't fail the comment submission if cache invalidation fails
      }
      
      // Reset form
      setNewComment({ author_name: '', author_email: '', comment: '' });
      
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setCommentError(err.message || 'Error al enviar el comentario');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                      ? `Esta expensa de ${analysis.period} totaliza ${formatCurrency(analysis.total_amount)}${analysis.previous_total ? ` (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(0)}% vs anterior)` : ''}. ${attentionItems} categoría${attentionItems > 1 ? 's merecen' : ' merece'} revisión por aumentos significativos.`
                      : `Esta expensa de ${analysis.period} totaliza ${formatCurrency(analysis.total_amount)}${analysis.previous_total ? ` (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(0)}% vs anterior)` : ''}. Todos los rubros están dentro de parámetros normales.`}
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
                  leftLabel="Mes anterior"
                  rightLabel={analysis.period}
                />
              </div>
            )}

            {/* Historical Evolution Chart */}
            {historicalData.length >= 2 && (
              <div className="mb-8">
                <SharedHistoricalChart
                  historicalData={historicalData}
                  currentAnalysisId={analysis.id}
                  currentPeriod={analysis.period}
                  buildingName={analysis.building_name}
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

            {/* Owner's Notes Section */}
            {analysis?.owner_notes && (
              <Card variant="glass" className="mb-8 animate-fade-in-up">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Notas del Owner</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Información adicional proporcionada por el dueño del análisis
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.owner_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <Card variant="glass" className="mb-8 animate-fade-in-up">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Comentarios</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {comments.length} comentario{comments.length !== 1 ? 's' : ''} sobre este análisis
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Comment Form */}
                <form onSubmit={handleCommentSubmit} className="mb-6 p-4 bg-muted/30 rounded-lg">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Tu nombre *</label>
                        <input
                          type="text"
                          value={newComment.author_name}
                          onChange={(e) => setNewComment(prev => ({ ...prev, author_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Juan Pérez"
                          maxLength={100}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email (opcional)</label>
                        <input
                          type="email"
                          value={newComment.author_email}
                          onChange={(e) => setNewComment(prev => ({ ...prev, author_email: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="juan@ejemplo.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tu comentario *</label>
                      <textarea
                        value={newComment.comment}
                        onChange={(e) => setNewComment(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        rows={3}
                        placeholder="¿Qué opinas sobre este análisis de expensas?"
                        maxLength={500}
                        required
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {newComment.comment.length}/500 caracteres
                      </div>
                    </div>
                    {commentError && (
                      <div className="text-sm text-status-attention bg-status-attention-bg p-3 rounded-lg">
                        {commentError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isSubmittingComment}
                        className="w-full md:w-auto"
                      >
                        Enviar comentario
                      </Button>
                    </div>
                  </div>
                </form>

                {/* Comments List */}
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Sé el primero en comentar sobre este análisis</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-l-4 border-primary/20 pl-4 py-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              comment.is_owner_comment 
                                ? 'bg-primary text-white' 
                                : 'bg-primary/10'
                            }`}>
                              {comment.is_owner_comment ? (
                                <span className="text-xs font-bold">O</span>
                              ) : (
                                <User className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {comment.is_owner_comment ? 'Owner' : comment.author_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
                            </div>
                          </div>
                          {/* Reply button for owner */}
                          {analysis?.user_id === 'owner-user-id' && !comment.is_owner_comment && (
                            <button
                              onClick={() => setReplyingTo(comment.id)}
                              className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              Responder
                            </button>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{comment.comment}</p>
                        
                        {/* Owner Reply Form */}
                        {replyingTo === comment.id && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg border-l-4 border-primary/30">
                            <form onSubmit={handleOwnerReply} className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Tu respuesta como Owner:</label>
                                <textarea
                                  value={ownerReply}
                                  onChange={(e) => setOwnerReply(e.target.value)}
                                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                  rows={3}
                                  placeholder="Responde al comentario..."
                                  maxLength={1000}
                                  required
                                />
                                <div className="text-xs text-muted-foreground mt-1">
                                  {ownerReply.length}/1000 caracteres
                                </div>
                              </div>
                              {commentError && (
                                <div className="text-sm text-status-attention bg-status-attention-bg p-3 rounded-lg">
                                  {commentError}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button 
                                  type="submit" 
                                  disabled={isSubmittingComment}
                                  size="sm"
                                >
                                  {isSubmittingComment ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                      <span>Enviando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-2" />
                                      <span>Enviar respuesta</span>
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setOwnerReply('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                        
                        {/* Show replies */}
                        {comments.filter(c => c.parent_comment_id === comment.id).map((reply) => (
                          <div key={reply.id} className="ml-8 mt-3 p-3 bg-muted/20 rounded-lg border-l-4 border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                                <span className="text-xs font-bold">O</span>
                              </div>
                              <div>
                                <p className="font-medium text-xs text-primary">Owner</p>
                                <p className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</p>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed">{reply.comment}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
