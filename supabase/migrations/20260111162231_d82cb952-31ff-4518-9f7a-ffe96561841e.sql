-- Create a table for shareable analysis links
CREATE TABLE public.shared_analysis_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.expense_analyses(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL
);

-- Create index for faster token lookups
CREATE INDEX idx_shared_analysis_token ON public.shared_analysis_links(token);
CREATE INDEX idx_shared_analysis_analysis_id ON public.shared_analysis_links(analysis_id);

-- Enable Row Level Security
ALTER TABLE public.shared_analysis_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create links for their own analyses
CREATE POLICY "Users can create links for their own analyses"
ON public.shared_analysis_links
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.expense_analyses 
    WHERE id = analysis_id AND user_id = auth.uid()
  )
);

-- Policy: Users can view their own shared links
CREATE POLICY "Users can view their own shared links"
ON public.shared_analysis_links
FOR SELECT
USING (created_by = auth.uid());

-- Policy: Users can update their own shared links
CREATE POLICY "Users can update their own shared links"
ON public.shared_analysis_links
FOR UPDATE
USING (created_by = auth.uid());

-- Policy: Users can delete their own shared links
CREATE POLICY "Users can delete their own shared links"
ON public.shared_analysis_links
FOR DELETE
USING (created_by = auth.uid());

-- Policy: Anyone can view active shared links by token (for public access)
CREATE POLICY "Anyone can view active shared links by token"
ON public.shared_analysis_links
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));