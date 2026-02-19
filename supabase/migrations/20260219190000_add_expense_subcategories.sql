-- Create expense subcategories table for detailed breakdown within categories
CREATE TABLE IF NOT EXISTS public.expense_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  percentage DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;

-- Subcategories policies (inherit from category -> analysis)
DROP POLICY IF EXISTS "Users can view subcategories of their analyses" ON public.expense_subcategories;
CREATE POLICY "Users can view subcategories of their analyses" ON public.expense_subcategories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expense_categories
      JOIN public.expense_analyses ON expense_categories.analysis_id = expense_analyses.id
      WHERE expense_categories.id = expense_subcategories.category_id
      AND expense_analyses.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert subcategories for their analyses" ON public.expense_subcategories;
CREATE POLICY "Users can insert subcategories for their analyses" ON public.expense_subcategories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_categories
      JOIN public.expense_analyses ON expense_categories.analysis_id = expense_analyses.id
      WHERE expense_categories.id = expense_subcategories.category_id
      AND expense_analyses.user_id = auth.uid()
    )
  );

-- Function to update updated_at if needed (though subcategories usually static after creation)
-- Skipping specific update trigger for now as they are mostly immutable per analysis
