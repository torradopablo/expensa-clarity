import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/layout/ui/logo";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast.success("¡Bienvenido de vuelta!");
        navigate("/analizar");
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        toast.success("¡Cuenta creada exitosamente!");
        navigate("/analizar");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Email o contraseña incorrectos");
      } else if (error.message?.includes("User already registered")) {
        toast.error("Este email ya está registrado");
      } else {
        toast.error(error.message || "Error de autenticación");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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
          <Link to="/" className="inline-flex items-center gap-3 mb-8 group">
            <Logo className="w-12 h-12 group-hover:rotate-12 transition-transform duration-500" />
            <span className="text-3xl font-black tracking-tighter text-foreground">ExpensaCheck</span>
          </Link>
          <h1 className="text-4xl font-black tracking-tight mb-3">
            {isLogin ? "Bienvenido" : "Unite a nosotros"}
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            {isLogin
              ? "Accedé a tus análisis inteligentes"
              : "Empezá a optimizar tus gastos hoy mismo"}
          </p>
        </div>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre completo</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Tu nombre"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="pl-12 h-14 bg-background/50 border-border/50 rounded-2xl focus:ring-primary/20 text-base"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email corporativo o personal</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-12 h-14 bg-background/50 border-border/50 rounded-2xl focus:ring-primary/20 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contraseña</Label>
                  {isLogin && (
                    <button type="button" className="text-xs font-bold text-primary hover:underline">
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
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
                    Procesando...
                  </>
                ) : (
                  <>
                    {isLogin ? "Iniciar sesión" : "Crear cuenta"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-border/50 text-center">
              <p className="text-base text-muted-foreground font-medium">
                {isLogin ? "¿No tenés cuenta todavía?" : "¿Ya tenés una cuenta?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary font-black hover:underline ml-1"
                >
                  {isLogin ? "Registrate gratis" : "Iniciá sesión"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8 px-6 font-medium leading-relaxed">
          Al continuar, aceptás nuestros{" "}
          <Link to="/terminos" className="text-foreground font-bold hover:underline">
            Términos de Servicio
          </Link>{" "}
          y{" "}
          <Link to="/privacidad" className="text-foreground font-bold hover:underline">
            Política de Privacidad
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
