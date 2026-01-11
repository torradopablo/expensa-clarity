import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  X
} from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">ExpensaCheck</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cómo funciona
          </a>
          <a href="#beneficios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Beneficios
          </a>
          <a href="#precios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Precios
          </a>
          <Link to="/historial" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Mi historial
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <Button asChild size="default" className="hidden sm:inline-flex">
            <Link to="/analizar">Analizar expensas</Link>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-b border-border">
          <nav className="container py-4 flex flex-col gap-3">
            <a 
              href="#como-funciona" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cómo funciona
            </a>
            <a 
              href="#beneficios" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Beneficios
            </a>
            <a 
              href="#precios" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Precios
            </a>
            <Link 
              to="/historial" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Mi historial
            </Link>
            <Link 
              to="/comparar" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Comparar períodos
            </Link>
            <Link 
              to="/evolucion" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Evolución
            </Link>
            <Button asChild size="default" className="mt-2 w-full">
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
  <section className="pt-32 pb-20 bg-gradient-soft">
    <div className="container">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium">
            <Shield className="w-4 h-4" />
            Para propietarios y administradores
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Expensas claras,{" "}
            <span className="text-gradient">decisiones informadas</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Ya seas propietario o administrador, analizá expensas comparándolas con una <strong>comunidad de edificios</strong> y el <strong>contexto inflacionario</strong>. 
            Ideal para entender tus gastos o presentar informes claros en reuniones de consorcio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="hero" size="xl">
              <Link to="/analizar">
                Analizar mis expensas
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/ejemplo">Ver ejemplo de análisis</Link>
            </Button>
          </div>
          {/* Value proposition badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <div className="flex items-center gap-3 bg-card/50 rounded-lg p-3 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-secondary-soft flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">Propietarios</p>
                <p className="text-xs text-muted-foreground">Entendé si pagás lo justo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card/50 rounded-lg p-3 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Administradores</p>
                <p className="text-xs text-muted-foreground">Informes listos para presentar</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Sin suscripción
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Pago único por análisis
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Resultado inmediato
            </div>
          </div>
        </div>
        <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative">
            <img 
              src={heroIllustration} 
              alt="Ilustración de análisis de documentos" 
              className="w-full rounded-2xl shadow-soft-xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-soft-lg animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-status-ok-bg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-status-ok" />
                </div>
                <div>
                  <p className="text-sm font-medium">Análisis con contexto</p>
                  <p className="text-xs text-muted-foreground">Comunidad + Inflación</p>
                </div>
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
      description: "Cargá el PDF o imagen de la liquidación. Funciona para tu edificio o los que administrás."
    },
    {
      icon: BarChart3,
      title: "Análisis automático",
      description: "Comparamos los gastos con edificios similares y la inflación del país para darte contexto real."
    },
    {
      icon: Download,
      title: "Informe listo",
      description: "Recibí un reporte claro, ideal para revisar vos mismo o presentar en reuniones de consorcio."
    }
  ];

  return (
    <section id="como-funciona" className="py-20">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">¿Cómo funciona?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tres pasos simples para propietarios que quieren entender o administradores que necesitan presentar.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gradient-hero text-primary-foreground flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div className="bg-card rounded-2xl p-8 shadow-soft-sm hover:shadow-soft-md transition-all h-full">
                <div className="w-14 h-14 rounded-xl bg-primary-soft flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
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
      title: "Referencia de mercado",
      description: "Comparación con edificios similares",
      detail: "Contrastamos con una comunidad real de edificios para saber si los valores están en línea con el mercado.",
      color: "secondary"
    },
    {
      icon: LineChart,
      title: "Contexto económico",
      description: "Inflación y aumentos justificados",
      detail: "Verificamos si los incrementos tienen sentido según la inflación del país o si requieren atención.",
      color: "primary"
    },
    {
      icon: TrendingUp,
      title: "Historial del edificio",
      description: "Evolución mes a mes",
      detail: "Seguimiento de cómo evolucionan los gastos, ideal para detectar tendencias y explicarlas en reuniones.",
      color: "accent"
    }
  ];

  return (
    <section id="beneficios" className="py-20 bg-gradient-soft">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Información respaldada por datos</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Análisis que sirve para entender tus gastos o para presentar informes claros en el consorcio.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 md:p-8 shadow-soft-md hover:shadow-soft-lg transition-all animate-fade-in-up border border-border/50"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl ${pillar.color === 'primary' ? 'bg-primary-soft' : pillar.color === 'secondary' ? 'bg-secondary-soft' : 'bg-accent/10'} flex items-center justify-center mb-5`}>
                <pillar.icon className={`w-7 h-7 ${pillar.color === 'primary' ? 'text-primary' : pillar.color === 'secondary' ? 'text-secondary' : 'text-accent-foreground'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{pillar.title}</h3>
              <p className="text-sm font-medium text-muted-foreground mb-3">{pillar.description}</p>
              <p className="text-sm text-muted-foreground/80">{pillar.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => (
  <section id="precios" className="py-20">
    <div className="container">
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-card rounded-3xl p-8 md:p-12 shadow-soft-lg animate-scale-in">
          {/* Promo banner */}
          <div className="bg-gradient-hero text-primary-foreground rounded-xl p-4 mb-6 animate-pulse-soft">
            <p className="text-sm font-semibold">🎉 ¡Tu primer análisis es GRATIS!</p>
            <p className="text-xs opacity-90">Registrate y probá ExpensaCheck sin costo</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium mb-6">
            Sin suscripción
          </div>
          <h2 className="text-3xl font-bold mb-2">Pago por análisis</h2>
          <p className="text-muted-foreground mb-8">
            Ideal para propietarios o administradores. Pagás solo cuando lo necesitás.
          </p>
          <div className="mb-8">
            <span className="text-5xl font-bold">$1.500</span>
            <span className="text-muted-foreground ml-2">ARS / expensa</span>
          </div>
          <ul className="space-y-4 text-left mb-8">
            {[
              "Comparación con edificios similares",
              "Contexto inflacionario del país",
              "Detección de desvíos y anomalías",
              "Reporte listo para presentar",
              "Lenguaje claro y profesional"
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="hero" size="xl" className="w-full">
            <Link to="/analizar">
              Analizar mi expensa
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Pago seguro con Mercado Pago
          </p>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-12 border-t border-border">
    <div className="container">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">ExpensaCheck</span>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          © 2024 ExpensaCheck. Claridad y tranquilidad para tus expensas.
        </p>
        <div className="flex items-center gap-6">
          <Link to="/terminos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Términos
          </Link>
          <Link to="/privacidad" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacidad
          </Link>
          <Link to="/contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Contacto
          </Link>
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
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
