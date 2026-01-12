import { useState, useCallback } from "react";

export interface PaymentState {
  loading: boolean;
  error: string | null;
  paymentUrl: string | null;
  paymentStatus: "idle" | "pending" | "completed" | "failed";
}

export interface PaymentActions {
  createPayment: (amount: number, description: string) => Promise<string | null>;
  checkPaymentStatus: (paymentId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export function usePayment(): PaymentState & PaymentActions {
  const [state, setState] = useState<PaymentState>({
    loading: false,
    error: null,
    paymentUrl: null,
    paymentStatus: "idle",
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      paymentUrl: null,
      paymentStatus: "idle",
    });
  }, []);

  const createPayment = useCallback(async (amount: number, description: string): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      setState(prev => ({ ...prev, paymentStatus: "pending" }));

      // Call Mercado Pago API to create payment
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
          currency: "ARS",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear pago");
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        paymentUrl: data.payment_url,
        paymentStatus: "pending",
      }));

      return data.payment_url;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al crear pago");
      setState(prev => ({ ...prev, paymentStatus: "failed" }));
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payments/status/${paymentId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al verificar estado del pago");
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        paymentStatus: data.status === "approved" ? "completed" : "pending",
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al verificar pago");
      setState(prev => ({ ...prev, paymentStatus: "failed" }));
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  return {
    ...state,
    createPayment,
    checkPaymentStatus,
    clearError,
    reset,
  };
}
