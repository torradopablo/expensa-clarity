import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Stepper } from "../components/layout/Stepper";
import { Button } from "../components/layout/ui/button";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAnalysis } from "../hooks/useAnalysis";
import { useFileUpload } from "../hooks/useFileUpload";
import { usePayment } from "../hooks/usePayment";
import { formatCurrency, formatChangePercent } from "../services/formatters/currency";
import { formatDate } from "../services/formatters/date";
import type { Step } from "../components/layout/Stepper";

const ANALYSIS_PRICE = 1500; // $1.500 ARS

const steps: Step[] = [
  { id: "upload", label: "Subir expensa", status: "pending" },
  { id: "payment", label: "Confirmar pago", status: "pending" },
  { id: "analysis", label: "Ver análisis", status: "pending" },
];

export default function Analizar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get("id");
  
  const [currentStep, setCurrentStep] = useState(0);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const {
    analyses,
    loading: analysisLoading,
    error: analysisError,
    createAnalysis,
    processExpense,
    fetchAnalyses,
  } = useAnalysis();
  
  const {
    file,
    preview,
    loading: fileLoading,
    error: fileError,
    selectFile,
    clearFile,
  } = useFileUpload("application/pdf,image/*", 10 * 1024 * 1024); // 10MB
  
  const {
    loading: paymentLoading,
    error: paymentError,
    paymentUrl,
    paymentStatus,
    createPayment,
  } = usePayment();

  // Load existing analysis if ID is provided
  useEffect(() => {
    if (analysisId) {
      const existingAnalysis = analyses.find(a => a.id === analysisId);
      if (existingAnalysis) {
        setAnalysis(existingAnalysis);
        // Set step based on analysis status
        if (existingAnalysis.status === "completed") {
          setCurrentStep(2);
          updateStepStatus(2, "completed");
        } else if (existingAnalysis.status === "processing") {
          setCurrentStep(2);
          updateStepStatus(2, "active");
        } else if (existingAnalysis.payment_id) {
          setCurrentStep(2);
          updateStepStatus(1, "completed");
          updateStepStatus(2, "active");
        }
      }
    }
  }, [analysisId, analyses]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const updateStepStatus = useCallback((stepIndex: number, status: "completed" | "active" | "pending") => {
    steps.forEach((step, index) => {
      if (index < stepIndex) {
        step.status = "completed";
      } else if (index === stepIndex) {
        step.status = status;
      } else {
        step.status = "pending";
      }
    });
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    selectFile(selectedFile);
  }, [selectFile]);

  const handleFileRemove = useCallback(() => {
    clearFile();
  }, [clearFile]);

  const handleUploadNext = useCallback(async () => {
    if (!file) return;

    try {
      // Create analysis record
      const newAnalysis = await createAnalysis({
        building_name: "Pendiente de análisis",
        period: "Pendiente de análisis",
        total_amount: 0,
      });

      if (!newAnalysis) return;

      setAnalysis(newAnalysis);
      updateStepStatus(0, "completed");
      updateStepStatus(1, "active");
      setCurrentStep(1);

      // Navigate with analysis ID
      navigate(`/analizar?id=${newAnalysis.id}`, { replace: true });
    } catch (error) {
      console.error("Error creating analysis:", error);
    }
  }, [file, createAnalysis, updateStepStatus, navigate]);

  const handlePayment = useCallback(async () => {
    if (!analysis) return;

    try {
      const paymentUrl = await createPayment(ANALYSIS_PRICE, "Análisis de expensas");
      
      if (paymentUrl) {
        // Update analysis with payment info
        // await updateAnalysis(analysis.id, { payment_id: paymentId });
        
        updateStepStatus(1, "completed");
        updateStepStatus(2, "active");
        setCurrentStep(2);
        
        // Process the file
        await processExpense(file, analysis.id);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
    }
  }, [analysis, file, createPayment, updateStepStatus, processExpense]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  if (analysisLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingState message="Cargando análisis..." size="lg" />
        </div>
      </div>
    );
  }

  if (analysisError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            title="Error al cargar análisis"
            message="No se pudo cargar la información del análisis. Por favor, intentá de nuevo."
            onRetry={fetchAnalyses}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Stepper steps={steps} className="mb-12" />
        
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Subí tu liquidación de expensas
              </h1>
              <p className="text-gray-600">
                Subí el archivo PDF o imagen de tu liquidación para obtener un análisis detallado
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  fileError ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-4">
                    {preview && (
                      <div className="flex justify-center">
                        <img
                          src={preview}
                          alt="Vista previa"
                          className="max-h-48 max-w-full rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={handleFileRemove}>
                        <X className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                      <Button onClick={handleUploadNext} disabled={fileLoading}>
                        {fileLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Continuar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Arrastrá y soltá tu archivo aquí
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        o hacé clic para seleccionarlo
                      </p>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-input"
                      />
                      <Button asChild>
                        <label htmlFor="file-input" className="cursor-pointer">
                          <FileText className="w-4 h-4 mr-2" />
                          Seleccionar archivo
                        </label>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                      PDF o imágenes (JPG, PNG) - Máximo 10MB
                    </p>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{fileError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Confirmá el pago
              </h1>
              <p className="text-gray-600">
                El análisis de tu liquidación cuesta {formatCurrency(ANALYSIS_PRICE)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Análisis de expensas</p>
                    <p className="text-sm text-gray-500">Procesamiento con IA</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(ANALYSIS_PRICE)}
                  </p>
                </div>

                {file && (
                  <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Archivo"
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full"
                  size="lg"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando pago...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagar {formatCurrency(ANALYSIS_PRICE)}
                    </>
                  )}
                </Button>

                {paymentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{paymentError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Tu análisis está listo
              </h1>
              <p className="text-gray-600">
                Revisá los resultados de tu liquidación de expensas
              </p>
            </div>

            {analysis?.status === "processing" ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <LoadingState message="Analizando tu liquidación..." size="lg" />
              </div>
            ) : analysis?.status === "completed" ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {analysis.building_name}
                      </h2>
                      <p className="text-gray-600">{analysis.period}</p>
                    </div>
                    <StatusBadge status="ok">
                      Completado
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Total actual</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analysis.total_amount)}
                      </p>
                    </div>
                    {analysis.previous_total && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Variación</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">
                            {formatChangePercent(analysis.total_amount, analysis.previous_total).value}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Button asChild className="w-full">
                      <Link to={`/analysis/${analysis.id}`}>
                        Ver análisis completo
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <ErrorState
                title="Error en el análisis"
                message="No se pudo completar el análisis de tu liquidación. Por favor, intentá de nuevo."
                onRetry={() => window.location.reload()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
