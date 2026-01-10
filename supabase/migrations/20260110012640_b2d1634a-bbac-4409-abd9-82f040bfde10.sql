-- Add DELETE policy for expense_analyses
CREATE POLICY "Users can delete their own analyses"
ON public.expense_analyses
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for expense_categories (cascade delete categories when analysis is deleted)
CREATE POLICY "Users can delete categories of their analyses"
ON public.expense_categories
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM expense_analyses
  WHERE expense_analyses.id = expense_categories.analysis_id
  AND expense_analyses.user_id = auth.uid()
));