-- Add evolution_analysis and deviation_stats columns to expense_analyses
ALTER TABLE public.expense_analyses 
ADD COLUMN IF NOT EXISTS evolution_analysis TEXT,
ADD COLUMN IF NOT EXISTS deviation_stats JSONB;

-- Comment on columns for clarity
COMMENT ON COLUMN public.expense_analyses.evolution_analysis IS 'Stored AI analysis of the building evolution at the time this expense was processed';
COMMENT ON COLUMN public.expense_analyses.deviation_stats IS 'Stored deviation stats (vs inflation, vs market) used for the evolution analysis';
