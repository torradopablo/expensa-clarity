-- Create payment audits table for tracking all payment attempts and events
CREATE TABLE public.payment_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.expense_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Mercado Pago specific identifiers
  preference_id TEXT, -- The initial preference ID created
  mp_payment_id TEXT, -- The final payment ID from MP
  
  -- Audit details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'ARS',
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'cancelled', 'refunded', etc.
  payment_method_id TEXT, -- 'visa', 'master', 'mercadopago_wallet', etc.
  payment_type_id TEXT, -- 'credit_card', 'account_money', etc.
  
  -- Store full response for debugging and complete audit
  raw_response JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_audits ENABLE ROW LEVEL SECURITY;

-- Audit policies
CREATE POLICY "Users can view their own payment audits" ON public.payment_audits
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can manage (insert/update) from edge functions
CREATE POLICY "Service role can manage payment audits" ON public.payment_audits
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_payment_audits_analysis_id ON public.payment_audits(analysis_id);
CREATE INDEX idx_payment_audits_user_id ON public.payment_audits(user_id);
CREATE INDEX idx_payment_audits_preference_id ON public.payment_audits(preference_id);
CREATE INDEX idx_payment_audits_mp_payment_id ON public.payment_audits(mp_payment_id);

-- Trigger for update_updated_at_column
CREATE TRIGGER update_payment_audits_updated_at
  BEFORE UPDATE ON public.payment_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Description for the table
COMMENT ON TABLE public.payment_audits IS 'Auditoría completa de intentos y transacciones de pago vía Mercado Pago';
