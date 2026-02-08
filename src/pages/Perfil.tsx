import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/layout/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    User,
    LogOut,
    Trash2,
    ArrowLeft,
    Mail,
    ShieldAlert,
    RefreshCw,
    FileText
} from "lucide-react";
import { toast } from "sonner";

const Header = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

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
                    <Button asChild variant="ghost" className="hidden sm:flex rounded-full px-6 hover:bg-accent font-semibold" size="sm">
                        <Link to="/analizar">Volver a analizar</Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión" className="rounded-full hover:bg-destructive/10 hover:text-destructive">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};

const Perfil = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/auth");
                return;
            }
            setUser(user);
            setLoading(false);
        };
        getUser();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const { data, error } = await supabase.functions.invoke("delete-account");

            if (error) throw error;

            await supabase.auth.signOut();
            toast.success("Cuenta eliminada correctamente");
            navigate("/");
        } catch (error: any) {
            console.error("Error deleting account:", error);
            toast.error(error.message || "Error al eliminar la cuenta");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
                {/* Dynamic Background */}
                <div className="absolute inset-0 -z-10 bg-background">
                    <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full"></div>
                </div>
                <div className="animate-pulse flex flex-col items-center gap-6">
                    <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] border border-primary/20 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <p className="text-lg font-bold text-muted-foreground">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            {/* Dynamic Background */}
            <div className="absolute inset-0 -z-10 bg-background">
                <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full"></div>
            </div>

            <Header />

            <main className="flex-1 pt-32 pb-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto space-y-12 relative z-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors group" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Volver
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                <User className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">Mi Perfil</h1>
                                <p className="text-muted-foreground font-medium">Configuración de cuenta</p>
                            </div>
                        </div>
                    </div>

                    <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden animate-fade-in-up">
                        <CardHeader className="p-10 pb-6">
                            <CardTitle className="text-2xl font-black flex items-center gap-4">
                                <FileText className="w-6 h-6 text-primary" />
                                Información General
                            </CardTitle>
                            <CardDescription className="text-base font-medium">
                                Gestioná tu identidad y preferencias de acceso.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 pb-10 space-y-8">
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-background/50 border border-border/50 flex items-center gap-5 group hover:border-primary/30 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-colors">
                                        <Mail className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Tu Email</p>
                                        <p className="text-xl font-bold text-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-border/30">
                                <Button
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl border-border/50 hover:bg-accent font-black text-lg gap-3 shadow-sm"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-5 h-5" />
                                    Cerrar sesión satisfactoriamente
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-destructive/5 backdrop-blur-sm border-destructive/20 shadow-xl rounded-[2.5rem] overflow-hidden animate-fade-in-up">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black text-destructive flex items-center gap-3">
                                <ShieldAlert className="w-6 h-6" />
                                Zona Crítica
                            </CardTitle>
                            <CardDescription className="text-destructive/80 font-medium">
                                Al eliminar tu cuenta, se borrarán todos tus análisis, categorías e información personal de forma <strong>permanente</strong>.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="bg-destructive/10 p-8 flex justify-end">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="gap-3 rounded-2xl px-8 h-12 font-black shadow-lg shadow-destructive/20 hover:scale-[1.02] transition-transform">
                                        <Trash2 className="w-5 h-5" />
                                        Eliminar mi cuenta definitivamente
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl p-10 max-w-xl">
                                    <AlertDialogHeader>
                                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                                            <ShieldAlert className="w-10 h-10 text-destructive" />
                                        </div>
                                        <AlertDialogTitle className="text-3xl font-black text-destructive tracking-tight">
                                            ¿Estás absolutamente seguro?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-lg mt-4 text-muted-foreground font-medium leading-relaxed">
                                            Esta acción <strong>no se puede deshacer</strong>. Borraremos permanentemente tu historial de análisis de expensas y tus credenciales de acceso de nuestros sistemas de forma segura.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-4 mt-10">
                                        <AlertDialogCancel className="rounded-2xl h-14 px-8 border-border font-bold hover:bg-accent">No, mantener mi cuenta</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteAccount}
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-2xl h-14 px-8 font-black shadow-lg shadow-destructive/20"
                                            disabled={deleting}
                                        >
                                            {deleting ? "Eliminando..." : "Sí, borrar todo ahora mismo"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default Perfil;
