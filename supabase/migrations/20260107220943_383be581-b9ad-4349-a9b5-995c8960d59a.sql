-- Add pending_payment and payment_failed status options
ALTER TABLE public.expense_analyses 
DROP CONSTRAINT IF EXISTS expense_analyses_status_check;

ALTER TABLE public.expense_analyses 
ADD CONSTRAINT expense_analyses_status_check 
CHECK (status IN ('pending', 'pending_payment', 'paid', 'processing', 'completed', 'failed', 'payment_failed'));