import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { User, LogOut, Trash2, ArrowLeft, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full"></div>
                    <div className="h-4 w-32 bg-primary/10 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-soft py-12 px-4 sm:px-6 lg:px-8 pt-24">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">Mi Perfil</span>
                    </div>
                </div>

                <Card className="border-none shadow-premium bg-white/80 backdrop-blur-sm overflow-hidden animate-fade-in-up">
                    <CardHeader className="bg-gradient-hero text-white p-8">
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">
                            <User className="w-6 h-6" />
                            Información del Usuario
                        </CardTitle>
                        <CardDescription className="text-white/80">
                            Gestiona tu cuenta y tus datos personales.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <Mail className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Correo electrónico</p>
                                    <p className="text-lg font-semibold text-foreground">{user.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border mt-4 flex flex-col sm:flex-row gap-4">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 p-6 h-auto text-lg rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-5 h-5" />
                                Cerrar sesión
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-destructive/20 shadow-sm bg-destructive/5 overflow-hidden animate-fade-in-up delay-100">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5" />
                            Zona de Peligro
                        </CardTitle>
                        <CardDescription>
                            Al eliminar tu cuenta, se borrarán todos tus análisis, categorías e información personal de forma permanente.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="bg-destructive/10 p-6 flex justify-end mt-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="gap-2 rounded-xl px-6 py-5 h-auto hover:scale-105 transition-transform">
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar mi cuenta
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-8">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-bold text-destructive">
                                        ¿Estás absolutamente seguro?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-lg mt-4 text-muted-foreground">
                                        Esta acción <strong>no se puede deshacer</strong>. Esto eliminará permanentemente tu cuenta y todos tus datos personales de nuestros servidores, incluyendo todos tus análisis de expensas cargados hasta hoy.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-3 mt-8">
                                    <AlertDialogCancel className="rounded-xl px-6 py-5 h-auto border-muted-foreground/20">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteAccount}
                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl px-6 py-5 h-auto font-semibold"
                                        disabled={deleting}
                                    >
                                        {deleting ? "Eliminando..." : "Sí, eliminar cuenta definitivamente"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default Perfil;
