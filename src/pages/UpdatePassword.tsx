import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/layout/ui/logo";

const UpdatePassword = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        // Check if we have a session (Supabase sets it automatically after clicking the link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error("Tu sesión ha expirado o el link es inválido");
                navigate("/auth");
            }
        });
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            toast.success("Contraseña actualizada correctamente");
            navigate("/analizar");
        } catch (error: any) {
            console.error("Update password error:", error);
            toast.error(error.message || "Error al actualizar la contraseña");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Dynamic Background */}
            <div className="absolute inset-0 -z-10 bg-background">
                <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="w-full max-w-md animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-8 group">
                        <Logo className="w-12 h-12" />
                        <span className="text-3xl font-black tracking-tighter text-foreground">ExpensaCheck</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-3">Nueva Contraseña</h1>
                    <p className="text-lg text-muted-foreground font-medium">
                        Ingresá tu nueva clave para acceder a tu cuenta
                    </p>
                </div>

                <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-8 md:p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nueva Contraseña</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-12 h-14 bg-background/50 border-border/50 rounded-2xl focus:ring-primary/20 text-base"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Contraseña</Label>
                                <div className="relative group">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-12 h-14 bg-background/50 border-border/50 rounded-2xl focus:ring-primary/20 text-base"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="hero"
                                size="xl"
                                className="w-full rounded-2xl shadow-xl shadow-primary/20 h-14 text-lg font-black"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Actualizando...
                                    </>
                                ) : (
                                    <>
                                        Restablecer contraseña
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UpdatePassword;
