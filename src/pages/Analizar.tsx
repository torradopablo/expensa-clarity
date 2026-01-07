import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Upload, 
  FileText, 
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  CreditCard,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

const steps = [
  { number: 1, title: "Subir expensa", description: "Cargá tu archivo" },
  { number: 2, title: "Confirmar pago", description: "Pago seguro" },
  { number: 3, title: "Ver análisis", description: "Tu reporte listo" },
];

const Stepper = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-4 mb-12">
    {steps.map((step, index) => (
      <div key={step.number} className="flex items-center">
        <div className="flex flex-col items-center">
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              currentStep >= step.number 
                ? "bg-gradient-hero text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}
          >
            {currentStep > step.number ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              step.number
            )}
          </div>
          <div className="mt-2 text-center">
            <p className={`text-sm font-medium ${currentStep >= step.number ? "text-foreground" : "text-muted-foreground"}`}>
              {step.title}
            </p>
            <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
          </div>
        </div>
        {index < steps.length - 1 && (
          <div 
            className={`w-16 sm:w-24 h-0.5 mx-4 transition-all ${
              currentStep > step.number ? "bg-primary" : "bg-muted"
            }`}
          />
        )}
      </div>
    ))}
  </div>
);

const UploadStep = ({ 
  file, 
  onFileSelect, 
  onFileRemove, 
  onNext,
  isUploading
}: { 
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onNext: () => void;
  isUploading: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/"))) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Card variant="elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Subí tu liquidación de expensas</CardTitle>
          <CardDescription>
            Aceptamos archivos PDF e imágenes (JPG, PNG)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!file ? (
            <label
              className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                isDragging 
                  ? "border-primary bg-primary-soft" 
                  : "border-border hover:border-primary hover:bg-muted/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">
                    Arrastrá tu archivo aquí
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    o hacé clic para seleccionar
                  </p>
                </div>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-primary-soft rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onFileRemove}
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Link>
            </Button>
            <Button 
              variant="hero" 
              size="lg"
              disabled={!file || isUploading}
              onClick={onNext}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  Continuar al pago
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PaymentStep = ({ 
  onBack, 
  onNext,
  isProcessing
}: { 
  onBack: () => void;
  onNext: () => void;
  isProcessing: boolean;
}) => (
  <div className="max-w-lg mx-auto animate-fade-in-up">
    <Card variant="elevated">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Confirmar pago</CardTitle>
        <CardDescription>
          Pago único y seguro con Mercado Pago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Análisis de expensa</span>
            <span className="font-medium">$500 ARS</span>
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">$500 ARS</span>
            </div>
          </div>
        </div>

        <div className="bg-secondary-soft rounded-xl p-4 flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Pago seguro</p>
            <p className="text-xs text-muted-foreground">
              Procesado de forma segura por Mercado Pago. No almacenamos tus datos de pago.
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {[
            "Extracción automática de datos",
            "Comparación con historial",
            "Alertas de aumentos inusuales",
            "Reporte descargable en PDF"
          ].map((item, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        
        <div className="flex justify-between items-center pt-4">
          <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button 
            variant="hero" 
            size="lg"
            onClick={onNext}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Pagar con Mercado Pago
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ProcessingStep = () => (
  <div className="max-w-lg mx-auto text-center animate-fade-in-up">
    <Card variant="elevated">
      <CardContent className="py-16 space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary-soft mx-auto flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Analizando tu expensa</h2>
          <p className="text-muted-foreground">
            Esto tomará solo unos segundos...
          </p>
        </div>
        <div className="space-y-2 max-w-xs mx-auto">
          {[
            "Extrayendo datos del documento",
            "Identificando categorías de gastos",
            "Generando reporte visual"
          ].map((step, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: `${index * 0.5}s` }}
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-slow" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const Analizar = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleFileRemove = () => {
    setFile(null);
  };

  const handleUploadAndContinue = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Create analysis record
      const { data: analysis, error: analysisError } = await supabase
        .from("expense_analyses")
        .insert({
          user_id: user.id,
          period: new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
          total_amount: 0,
          status: "pending",
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      setAnalysisId(analysis.id);
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Error creating analysis:", error);
      toast.error("Error al preparar el análisis");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePayment = async () => {
    if (!analysisId || !file) return;

    setIsProcessing(true);
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No autorizado");

      // Create payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment",
        {
          body: { analysisId },
        }
      );

      if (paymentError) throw paymentError;

      // Move to processing step
      setCurrentStep(3);

      // Process the expense with AI
      const formData = new FormData();
      formData.append("file", file);
      formData.append("analysisId", analysisId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-expense`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar la expensa");
      }

      const result = await response.json();
      
      toast.success("¡Análisis completado!");
      navigate(`/analisis/${analysisId}`);
    } catch (error: any) {
      console.error("Error processing:", error);
      toast.error(error.message || "Error al procesar el pago");
      setCurrentStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container">
          <Stepper currentStep={currentStep} />
          
          {currentStep === 1 && (
            <UploadStep
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              onNext={handleUploadAndContinue}
              isUploading={isUploading}
            />
          )}
          
          {currentStep === 2 && (
            <PaymentStep
              onBack={() => setCurrentStep(1)}
              onNext={handlePayment}
              isProcessing={isProcessing}
            />
          )}
          
          {currentStep === 3 && <ProcessingStep />}
        </div>
      </main>
    </div>
  );
};

export default Analizar;
