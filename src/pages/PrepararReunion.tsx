import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Users,
    Calendar,
    CheckCircle2,
    ArrowRight,
    Plus,
    ArrowLeft,
    Search,
    Building,
    ClipboardList,
    MessageSquare,
    AlertCircle,
    Loader2,
    Printer,
    Download,
    Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAnalysis } from "@/hooks/useAnalysis";
import type { Analysis } from "@/types/analysis";
import { Logo } from "@/components/layout/ui/logo";
import { cn } from "@/lib/utils";

const Header = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="container flex items-center justify-between h-20">
                <Link to="/" className="flex items-center gap-2 group">
                    <Logo className="w-10 h-10 group-hover:rotate-12 transition-transform duration-500" />
                    <span className="text-2xl font-bold tracking-tight bg-clip-text text-foreground">
                        ExpensaCheck
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" className="rounded-full px-6 hover:bg-accent font-semibold">
                        <Link to="/historial">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver al historial
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
};

interface MeetingItem {
    id: string;
    category: string;
    title: string;
    description: string;
    source: string;
    importance: "high" | "medium" | "low";
    selected?: boolean;
}

interface MeetingSummary {
    title: string;
    items: MeetingItem[];
}

const PrepararReunion = () => {
    const navigate = useNavigate();
    const { analyses, loading } = useAnalysis();

    const [selectedBuilding, setSelectedBuilding] = useState<string>("");
    const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [summary, setSummary] = useState<MeetingSummary | null>(null);
    const [activeItems, setActiveItems] = useState<Set<string>>(new Set());

    // Get unique buildings
    const buildings = useMemo(() => {
        const completedAnalyses = analyses.filter(a => a.status === "completed");
        const unique = [...new Set(completedAnalyses.map(a => a.building_name).filter(Boolean))];
        return unique.sort();
    }, [analyses]);

    // Get analyses for selected building
    const buildingAnalyses = useMemo(() => {
        if (!selectedBuilding) return [];
        return analyses
            .filter(a => a.building_name === selectedBuilding && a.status === "completed")
            .sort((a, b) => {
                const dateA = a.period_date ? new Date(a.period_date).getTime() : new Date(a.created_at).getTime();
                const dateB = b.period_date ? new Date(b.period_date).getTime() : new Date(b.created_at).getTime();
                return dateB - dateA;
            });
    }, [selectedBuilding, analyses]);

    const toggleAnalysis = (id: string) => {
        setSelectedAnalyses(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (selectedAnalyses.length === 0) {
            toast.error("Seleccioná al menos un período");
            return;
        }

        setIsGenerating(true);
        setSummary(null);

        // Force deploy comment: v1.0.1
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error("Tu sesión ha expirado. Por favor, reingresá.");
                navigate("/auth");
                return;
            }

            const { data, error } = await supabase.functions.invoke("prepare-meeting", {
                body: {
                    analysis_ids: selectedAnalyses,
                    building_name: selectedBuilding
                }
            });

            if (error) throw error;

            setSummary(data);
            // Initialize all items as active
            setActiveItems(new Set(data.items.map((item: MeetingItem) => item.id)));
            toast.success("Temario generado con éxito");
        } catch (error: any) {
            console.error("Error generating meeting prep:", error);
            toast.error("No se pudo generar el temario. Reintentá en unos minutos.");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleItem = (id: string) => {
        setActiveItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleCopy = () => {
        if (!summary) return;
        const activeSummaryItems = summary.items.filter(item => activeItems.has(item.id));
        const text = activeSummaryItems.map(item =>
            `[ ] ${item.title} (${item.category})\n    ${item.description}\n    Fuente: ${item.source}`
        ).join('\n\n');

        navigator.clipboard.writeText(`${summary.title}\n\n${text}`);
        toast.success("Copiado al portapapeles");
    };


    const exportToPDF = async () => {
        if (!summary) return;
        setIsExporting(true);
        try {
            const element = document.getElementById("meeting-temario-content");
            if (!element) return;
            // 1. Prepare View for Capture (High Contrast & Hide UI)
            element.classList.add("pdf-export-container");
            const originalWidth = element.style.width;
            const originalPadding = element.style.padding;

            element.style.width = "1000px"; // Fixed width for consistent capture
            element.style.padding = "40px";

            // Simple PDF generation
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false
            });

            // Restore View
            element.classList.remove("pdf-export-container");
            element.style.width = originalWidth;
            element.style.padding = originalPadding;

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const imgWidth = 190;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Temario_${selectedBuilding}_${new Date().toLocaleDateString()}.pdf`);
            toast.success("Temario exportado como PDF");
        } catch (error) {
            console.error("Error exporting PDF:", error);
            toast.error("Error al generar el PDF");
        } finally {
            setIsExporting(false);
        }
    };

    if (loading && analyses.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-soft">
                <Header />
                <main className="pt-32 pb-20 container max-w-4xl">
                    <Skeleton className="h-10 w-64 mb-8" />
                    <Skeleton className="h-64 w-full" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Background Decor */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-secondary/5 blur-[120px] rounded-full"></div>
            </div>

            <Header />

            <main className="pt-32 pb-32">
                <div className="container max-w-4xl relative z-10">
                    <div className="flex items-center gap-5 mb-12">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight">Preparar Reunión</h1>
                            <p className="text-muted-foreground font-medium mt-1">
                                Generá un temario inteligente para tu próxima reunión de consorcio.
                            </p>
                        </div>
                    </div>

                    {!summary ? (
                        <div className="grid gap-8">
                            {/* Step 1: Select Building */}
                            <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in-up">
                                <CardHeader className="p-8 md:p-10 border-b border-border/50 bg-primary/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                        <div>
                                            <CardTitle className="text-xl">Seleccioná el Edificio</CardTitle>
                                            <CardDescription>Elegí el consorcio para el cual querés preparar la reunión</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 md:p-10">
                                    <Select value={selectedBuilding} onValueChange={(val) => {
                                        setSelectedBuilding(val);
                                        setSelectedAnalyses([]);
                                    }}>
                                        <SelectTrigger className="h-14 bg-background/50 border-border/50 rounded-2xl text-lg group focus:ring-primary/20 transition-all">
                                            <div className="flex items-center gap-3">
                                                <Building className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                                <SelectValue placeholder="Seleccionar consorcio..." />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50">
                                            {buildings.map(b => (
                                                <SelectItem key={b} value={b as string} className="py-3 focus:bg-primary/5">{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            {/* Step 2: Select Periods */}
                            {selectedBuilding && (
                                <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in-up">
                                    <CardHeader className="p-8 md:p-10 border-b border-border/50 bg-secondary/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold">2</div>
                                            <div>
                                                <CardTitle className="text-xl">Seleccioná los Períodos</CardTitle>
                                                <CardDescription>Marcá las expensas que se van a tratar en la reunión</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 md:p-10">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {buildingAnalyses.map((analysis) => (
                                                <div
                                                    key={analysis.id}
                                                    onClick={() => toggleAnalysis(analysis.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                                                        selectedAnalyses.includes(analysis.id)
                                                            ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
                                                            : "bg-background/50 border-border/50 hover:border-primary/30"
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={selectedAnalyses.includes(analysis.id)}
                                                        onCheckedChange={() => toggleAnalysis(analysis.id)}
                                                        className="w-5 h-5 rounded-lg border-2"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-base truncate">{analysis.period}</p>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                                                            {analysis.unit ? `UF: ${analysis.unit}` : "General"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            onClick={handleGenerate}
                                            disabled={isGenerating || selectedAnalyses.length === 0}
                                            variant="hero"
                                            size="xl"
                                            className="w-full mt-10 rounded-2xl h-16 text-lg font-black shadow-xl shadow-primary/20"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 animate-spin mr-3" />
                                                    Procesando con IA...
                                                </>
                                            ) : (
                                                <>
                                                    Generar Temario Inteligente
                                                    <ClipboardList className="w-6 h-6 ml-3" />
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <div id="meeting-temario-content" className="space-y-8 animate-fade-in print:p-0">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 print:hidden">
                                <div>
                                    <h2 className="text-3xl font-black text-foreground">{summary.title}</h2>
                                    <p className="text-muted-foreground font-medium mt-1">
                                        Seleccioná los puntos que querés mantener en el temario final.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" onClick={() => setSummary(null)} className="rounded-full px-6 font-bold h-12">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Reiniciar
                                    </Button>
                                    <Button onClick={handleCopy} className="rounded-full px-6 bg-primary text-white font-bold h-12 shadow-lg shadow-primary/20">
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copiar
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {summary.items.map((item) => (
                                    <Card
                                        key={item.id}
                                        className={cn(
                                            "rounded-[2rem] border-border/50 transition-all duration-300",
                                            activeItems.has(item.id)
                                                ? "bg-card/40 backdrop-blur-xl border-primary/20 shadow-xl opacity-100 scale-100 pdf-item-active"
                                                : "bg-muted/10 border-transparent opacity-60 scale-[0.98] item-inactive pdf-item-hidden"
                                        )}
                                    >
                                        <CardContent className="p-0">
                                            <div className="flex items-stretch overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "w-12 sm:w-16 flex items-center justify-center cursor-pointer transition-colors border-r border-border/30",
                                                        activeItems.has(item.id) ? "bg-primary/5" : "bg-transparent"
                                                    )}
                                                    onClick={() => toggleItem(item.id)}
                                                >
                                                    <Checkbox
                                                        checked={activeItems.has(item.id)}
                                                        onCheckedChange={() => toggleItem(item.id)}
                                                        className="w-6 h-6 rounded-lg border-2"
                                                    />
                                                </div>
                                                <div className="flex-1 p-6 md:p-8">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <Badge className={cn(
                                                                "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest",
                                                                item.importance === 'high' ? "bg-secondary/20 text-secondary border-secondary/30" :
                                                                    item.importance === 'medium' ? "bg-primary/20 text-primary border-primary/30" :
                                                                        "bg-muted text-muted-foreground border-border"
                                                            )}>
                                                                {item.importance === 'high' ? 'Crítico' : item.importance === 'medium' ? 'Importante' : 'Rutinario'}
                                                            </Badge>
                                                            <Badge variant="outline" className="rounded-full px-4 py-1 text-[10px] uppercase font-bold text-muted-foreground border-border">
                                                                {item.category}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
                                                            <Search className="w-3.5 h-3.5" />
                                                            {item.source}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                                    <p className="text-muted-foreground text-base leading-relaxed">{item.description}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="pt-16 flex flex-col items-center gap-6 print:hidden">
                                <Button
                                    variant="hero"
                                    onClick={exportToPDF}
                                    disabled={isExporting}
                                    size="xl"
                                    className="w-full sm:w-auto min-w-[300px] rounded-3xl h-20 text-xl font-black shadow-2xl shadow-primary/30 group relative overflow-hidden transition-all hover:scale-[1.02]"
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin mr-3" />
                                            Generando Documento...
                                        </>
                                    ) : (
                                        <>
                                            Finalizar y Descargar PDF
                                            <Download className="w-6 h-6 ml-3 group-hover:translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </Button>

                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={handleCopy}
                                        className="rounded-full px-8 h-12 font-bold text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Copy className="w-5 h-5 mr-2" />
                                        Copiar Texto del Temario
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PrepararReunion;
