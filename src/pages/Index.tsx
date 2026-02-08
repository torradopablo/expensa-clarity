import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Shield,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Upload,
  BarChart3,
  Download,
  Users,
  LineChart,
  Menu,
  X,
  Home,
  Briefcase,
  Building2,
  User
} from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";

import { Logo } from "@/components/layout/ui/logo";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2 group">
          <Logo className="w-10 h-10 group-hover:rotate-12 transition-transform duration-500" />
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-foreground">
            ExpensaCheck
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-10">
          <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Cómo funciona
          </a>
          <a href="#beneficios" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Beneficios
          </a>
          <a href="#precios" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Precios
          </a>
          {session && (
            <Link to="/historial" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Mi historial
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {session ? (
            <Button asChild variant="ghost" size="icon" title="Mi Perfil" className="rounded-full hover:bg-accent">
              <Link to="/perfil">
                <User className="w-5 h-5" />
              </Link>
            </Button>
          ) : (
            <Link to="/auth" className="hidden sm:inline-flex text-sm font-medium hover:text-primary transition-colors">
              Iniciar sesión
            </Link>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>

          <Button asChild size="lg" className="hidden sm:inline-flex rounded-full shadow-lg shadow-primary/25 font-semibold">
            <Link to="/analizar">Analizar ahora</Link>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border animate-fade-in">
          <nav className="container py-8 flex flex-col gap-6">
            <a
              href="#como-funciona"
              className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cómo funciona
            </a>
            <a
              href="#beneficios"
              className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Beneficios
            </a>
            <a
              href="#precios"
              className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Precios
            </a>
            {session && (
              <>
                <Link
                  to="/historial"
                  className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mi historial
                </Link>
                <Link
                  to="/perfil"
                  className="text-lg font-medium text-primary flex items-center gap-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  Mi Perfil
                </Link>
              </>
            )}
            {!session && (
              <Link
                to="/auth"
                className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Iniciar sesión
              </Link>
            )}
            <Button asChild size="xl" className="mt-4 w-full rounded-2xl">
              <Link to="/analizar" onClick={() => setMobileMenuOpen(false)}>
                Analizar expensas
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

const HeroSection = () => (
  <section className="relative pt-40 pb-24 overflow-hidden">
    {/* Decorative background elements */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
    </div>

    <div className="container">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-accent border border-primary/20 text-primary text-sm font-semibold tracking-wide shadow-sm">
            <Shield className="w-4 h-4" />
            <span className="uppercase">Inteligencia Artificial para tu Consorcio</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-foreground">
            Expensas claras,{" "}
            <span className="text-gradient">decisiones inteligentes</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
            Analizá tus expensas comparándolas con una <strong className="text-foreground">red de edificios</strong> y el impacto de la <strong className="text-foreground">inflación</strong>. Claridad total para propietarios y administradores.
          </p>
          <div className="flex flex-col sm:flex-row gap-5">
            <Button asChild variant="hero" size="xl" className="rounded-2xl px-10 shadow-xl shadow-primary/20">
              <Link to="/analizar">
                Analizar expensas
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="rounded-2xl px-10 border-border hover:bg-accent hover:text-foreground transition-all">
              <Link to="/ejemplo">Ver demostración</Link>
            </Button>
          </div>

          <div className="flex items-center gap-8 pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Pago por uso
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Sin suscripción
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Reporte PDF
            </div>
          </div>
        </div>

        <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="relative z-10 p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-[2.5rem] backdrop-blur-sm border border-white/10 shadow-2xl">
            <img
              src={heroIllustration}
              alt="Análisis inteligente"
              className="w-full rounded-[2rem] shadow-2xl"
            />
          </div>

          {/* Floating cards for premium feel */}
          <div className="absolute -bottom-10 -left-10 bg-card/90 backdrop-blur-xl rounded-2xl p-5 border border-border shadow-2xl animate-float z-20 hidden md:block">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Detección de Desvíos</p>
                <p className="text-xs text-muted-foreground">Comparativa con mercado</p>
              </div>
            </div>
          </div>

          <div className="absolute -top-6 -right-6 bg-card/90 backdrop-blur-xl rounded-2xl p-5 border border-border shadow-2xl animate-float z-20 hidden md:block" style={{ animationDelay: "1.5s" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-bold">Contexto Real</p>
                <p className="text-xs text-muted-foreground">Inflación vs Histórico</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Upload,
      title: "Subí la expensa",
      description: "Cargá el PDF de la liquidación. Nuestro sistema procesa todos los rubros automáticamente."
    },
    {
      icon: BarChart3,
      title: "IA en acción",
      description: "Comparamos tus gastos con miles de edificios similares para identificar anomalías."
    },
    {
      icon: Download,
      title: "Reporte Ejecutivo",
      description: "Obtené claridad absoluta con sugerencias concretas y gráficas profesionales."
    }
  ];

  return (
    <section id="como-funciona" className="py-32 relative">
      <div className="container">
        <div className="text-center space-y-6 mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Proceso simple, resultados potentes</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Diseñado para ser intuitivo y darte la información que importa en segundos.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute -top-6 -left-6 w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-bold border border-primary/30 z-10 backdrop-blur-md">
                {index + 1}
              </div>
              <div className="bg-card/50 backdrop-blur-sm rounded-[2rem] p-10 border border-border/50 hover:border-primary/50 transition-all duration-500 h-full group-hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-primary/5">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 border border-border">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BenefitsSection = () => {
  const pillars = [
    {
      icon: Users,
      title: "Comunidad Inteligente",
      description: "Referencia de mercado real",
      detail: "Contrastamos tus gastos con una red de edificios similares para saber si tus costos están optimizados.",
      color: "secondary"
    },
    {
      icon: LineChart,
      title: "Economía de Escala",
      description: "Detección de sobreprecios",
      detail: "Analizamos rubro por rubro para identificar áreas donde podrías estar pagando más de lo necesario.",
      color: "primary"
    },
    {
      icon: TrendingUp,
      title: "Visión a Largo Plazo",
      description: "Seguimiento de tendencias",
      detail: "Evolución histórica detallada que te permite anticipar gastos y planificar el futuro de tu consorcio.",
      color: "accent"
    }
  ];

  return (
    <section id="beneficios" className="py-32 bg-muted/30">
      <div className="container">
        <div className="text-center space-y-6 mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Información que genera valor</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Herramientas profesionales para una gestión transparente y eficiente de tus gastos compartidos.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="bg-card/40 backdrop-blur-sm rounded-[2rem] p-8 md:p-12 border border-border/50 hover:bg-card/60 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-20 h-20 rounded-3xl ${pillar.color === 'primary' ? 'bg-primary/10 border-primary/20' : pillar.color === 'secondary' ? 'bg-secondary/10 border-secondary/20' : 'bg-accent'} border flex items-center justify-center mb-8`}>
                <pillar.icon className={`w-10 h-10 ${pillar.color === 'primary' ? 'text-primary' : pillar.color === 'secondary' ? 'text-secondary' : 'text-foreground'}`} />
              </div>
              <h3 className="text-2xl font-bold mb-3">{pillar.title}</h3>
              <p className="text-primary text-sm font-semibold mb-5 uppercase tracking-wider">{pillar.description}</p>
              <p className="text-muted-foreground leading-relaxed text-lg">{pillar.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const UseCasesSection = () => {
  const useCases = [
    {
      icon: Home,
      role: "Propietarios",
      title: "Justicia en tus Gastos",
      scenarios: [
        "¿Recibiste un aumento injustificado?",
        "Compará con edificios de tu zona",
        "Argumentos sólidos para asambleas",
        "Control total de tu patrimonio"
      ]
    },
    {
      icon: Briefcase,
      role: "Administradores",
      title: "Gestión Profesional",
      scenarios: [
        "Reportes visuales para reuniones",
        "Justificá gastos con IA y datos",
        "Transparencia que genera confianza",
        "Anticipate a las dudas de los vecinos"
      ]
    },
    {
      icon: Building2,
      role: "Inversores",
      title: "Rentabilidad Clara",
      scenarios: [
        "Evaluá costos antes de comprar",
        "Optimizá el ROI de tus unidades",
        "Detectá ineficiencias operativas",
        "Data-driven real estate management"
      ]
    }
  ];

  return (
    <section id="casos-de-uso" className="py-32">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Diseñado para cada perfil</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Diferentes necesidades, una misma herramienta poderosa para dar claridad financiera.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group bg-card/30 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border/50 hover:bg-card/50 hover:border-primary/30 transition-all duration-500 animate-fade-in-up shadow-sm"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                  <useCase.icon className="w-10 h-10 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">{useCase.role}</span>
                <h3 className="text-2xl font-bold">{useCase.title}</h3>
              </div>
              <ul className="space-y-4">
                {useCase.scenarios.map((scenario, idx) => (
                  <li key={idx} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-muted-foreground font-medium">{scenario}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center mt-20">
          <Button asChild variant="outline" size="xl" className="rounded-2xl px-12 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
            <Link to="/analizar" className="flex items-center gap-3">
              Empezar ahora
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => (
  <section id="precios" className="py-32 relative overflow-hidden">
    {/* Background Glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full -z-10"></div>

    <div className="container">
      <div className="text-center space-y-6 mb-20 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Planes a tu medida</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
          Elegí la opción que mejor se adapte a tus necesidades. Transparencia total desde el primer momento.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
        {/* Individual Card */}
        <div className="bg-card/40 backdrop-blur-xl rounded-[3rem] p-10 border border-primary/20 shadow-2xl animate-fade-in-up relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10"></div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 shadow-sm uppercase tracking-widest">
              Uso Individual
            </div>

            <div className="mb-8">
              <span className="text-6xl font-black text-foreground">$1.500</span>
              <span className="text-muted-foreground text-lg ml-2">/ análisis</span>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-10">
              <p className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="text-lg">🎁</span>
                ¡Primer análisis BONIFICADO!
              </p>
            </div>

            <ul className="space-y-4 mb-10">
              {[
                "Comparativa con Red de Edificios",
                "Monitoreo de Impacto Inflacionario",
                "IA con Detección de Desvíos",
                "Reporte Profesional Exportable",
                "Dashboard Histórico de Evolución"
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-muted-foreground font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button asChild variant="hero" size="xl" className="w-full rounded-2xl py-7 text-lg font-bold shadow-xl shadow-primary/25 hover:scale-[1.02] transition-transform mt-auto">
            <Link to="/analizar">
              Empezar Análisis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>

          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium">
              Pago seguro vía Mercado Pago
            </p>
          </div>
        </div>

        {/* Administrators Card */}
        <div className="bg-card/40 backdrop-blur-xl rounded-[3rem] p-10 border border-border/50 shadow-2xl animate-fade-in-up relative overflow-hidden flex flex-col h-full border-dashed" style={{ animationDelay: "0.2s" }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 blur-3xl -z-10"></div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold mb-8 shadow-sm uppercase tracking-widest">
              Administradores
            </div>

            <div className="mb-8">
              <span className="text-5xl font-black text-foreground">Custom</span>
              <p className="text-muted-foreground mt-2 font-medium">Planes por volumen de edificios</p>
            </div>

            <div className="bg-secondary/5 border border-secondary/10 rounded-2xl p-4 mb-10">
              <p className="text-sm font-bold text-secondary flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Soporte para múltiples consorcios
              </p>
            </div>

            <ul className="space-y-4 mb-10">
              {[
                "Membresías Mensuales Flexibles",
                "Panel Multi-Consorcio Centralizado",
                "Facturación A/B Automatizada",
                "Reportes de Analisis de Gestión",
                "Soporte Prioritario Dedicado"
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                  </div>
                  <span className="text-muted-foreground font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button asChild variant="outline" size="xl" className="w-full rounded-2xl py-7 text-lg font-bold border-secondary/50 text-secondary hover:bg-secondary/10 transition-all mt-auto">
            <Link to="/contacto">
              Contactar al equipo
              <Briefcase className="w-5 h-5 ml-2" />
            </Link>
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6 font-medium">
            Atención personalizada para grandes volúmenes
          </p>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-20 border-t border-border bg-background relative overflow-hidden">
    <div className="container">
      <div className="grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-2 space-y-6">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo className="w-10 h-10 group-hover:rotate-12 transition-transform" />
            <span className="text-2xl font-bold tracking-tight">ExpensaCheck</span>
          </Link>
          <p className="text-muted-foreground text-lg max-w-sm">
            Nuestra misión es brindar transparencia y claridad financiera a cada consorcio de Argentina utilizando inteligencia artificial y datos de mercado.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-lg mb-6">Producto</h4>
          <ul className="space-y-4">
            <li><a href="#como-funciona" className="text-muted-foreground hover:text-primary transition-colors font-medium">Cómo funciona</a></li>
            <li><a href="#beneficios" className="text-muted-foreground hover:text-primary transition-colors font-medium">Beneficios</a></li>
            <li><a href="#precios" className="text-muted-foreground hover:text-primary transition-colors font-medium">Precios</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-lg mb-6">Legal</h4>
          <ul className="space-y-4">
            <li><Link to="/terminos" className="text-muted-foreground hover:text-primary transition-colors font-medium">Términos</Link></li>
            <li><Link to="/privacidad" className="text-muted-foreground hover:text-primary transition-colors font-medium">Privacidad</Link></li>
            <li><Link to="/contacto" className="text-muted-foreground hover:text-primary transition-colors font-medium">Contacto</Link></li>
          </ul>
        </div>
      </div>
      <div className="pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-muted-foreground font-medium">
          © 2024 ExpensaCheck. Todos los derechos reservados.
        </p>
        <div className="flex gap-8">
          {/* Social icons could go here */}
        </div>
      </div>
    </div>
  </footer>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <BenefitsSection />
        <UseCasesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
