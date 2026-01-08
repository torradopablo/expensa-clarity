-- Add notes column to expense_analyses for user comments
ALTER TABLE public.expense_analyses 
ADD COLUMN notes TEXT DEFAULT NULL;

-- Add UPDATE policy for expense_categories to allow marking as reviewed
CREATE POLICY "Users can update categories of their analyses" 
ON public.expense_categories 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM expense_analyses 
  WHERE expense_analyses.id = expense_categories.analysis_id 
  AND expense_analyses.user_id = auth.uid()
));