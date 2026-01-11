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
  Download
} from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
    <div className="container flex items-center justify-between h-16">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold">ExpensaCheck</span>
      </Link>
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
      <Button asChild size="default">
        <Link to="/analizar">Analizar expensas</Link>
      </Button>
    </div>
  </header>
);

const HeroSection = () => (
  <section className="pt-32 pb-20 bg-gradient-soft">
    <div className="container">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium">
            <Shield className="w-4 h-4" />
            Transparencia y tranquilidad en tus expensas
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Entendé tus expensas{" "}
            <span className="text-gradient">sin complicaciones</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Subí tu liquidación de expensas y recibí un análisis claro y visual. 
            Detectamos aumentos inusuales y te explicamos todo en español simple.
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
          <div className="flex items-center gap-6 pt-4">
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
                  <p className="text-sm font-medium">Análisis completo</p>
                  <p className="text-xs text-muted-foreground">En menos de 1 minuto</p>
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
      title: "Subí tu expensa",
      description: "Arrastrá o seleccioná el PDF o imagen de tu liquidación mensual de expensas."
    },
    {
      icon: BarChart3,
      title: "Análisis automático",
      description: "Nuestro sistema extrae los datos y los compara con meses anteriores."
    },
    {
      icon: Download,
      title: "Recibí tu reporte",
      description: "Obtené un informe visual con alertas claras y explicaciones sencillas."
    }
  ];

  return (
    <section id="como-funciona" className="py-20">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">¿Cómo funciona?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            En tres simples pasos, pasás de la confusión a la claridad total sobre tus expensas.
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
  const benefits = [
    {
      icon: Shield,
      title: "Transparencia total",
      description: "Sabé exactamente a dónde va cada peso de tus expensas."
    },
    {
      icon: TrendingUp,
      title: "Detectá aumentos inusuales",
      description: "Te alertamos cuando algo subió más de lo esperado."
    },
    {
      icon: FileText,
      title: "Explicaciones claras",
      description: "Sin jerga contable. Todo explicado en palabras simples."
    },
    {
      icon: CheckCircle2,
      title: "Sin compromiso",
      description: "Pagás solo cuando querés analizar. Sin suscripciones."
    }
  ];

  return (
    <section id="beneficios" className="py-20 bg-gradient-soft">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">¿Por qué ExpensaCheck?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Diseñado para darte tranquilidad, no más preocupaciones.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 shadow-soft-sm hover:shadow-soft-md transition-all animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary-soft flex items-center justify-center mb-4">
                <benefit.icon className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium mb-6">
            Sin suscripción
          </div>
          <h2 className="text-3xl font-bold mb-2">Pago por análisis</h2>
          <p className="text-muted-foreground mb-8">
            Simple y transparente. Pagás solo cuando lo necesitás.
          </p>
          <div className="mb-8">
            <span className="text-5xl font-bold">$500</span>
            <span className="text-muted-foreground ml-2">ARS / expensa</span>
          </div>
          <ul className="space-y-4 text-left mb-8">
            {[
              "Extracción automática de datos",
              "Comparación con meses anteriores",
              "Detección de aumentos inusuales",
              "Reporte visual descargable",
              "Explicaciones en español simple"
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
