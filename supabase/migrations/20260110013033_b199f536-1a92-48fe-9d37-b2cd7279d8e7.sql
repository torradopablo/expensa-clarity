-- Add scanned_at column to track when the document was uploaded/scanned
ALTER TABLE public.expense_analyses 
ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now();