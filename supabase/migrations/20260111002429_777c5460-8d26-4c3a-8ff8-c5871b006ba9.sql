-- Add standardized period_date column (first day of the expense period month)
ALTER TABLE public.expense_analyses 
ADD COLUMN period_date DATE;

-- Create index for period queries
CREATE INDEX idx_expense_analyses_period_date ON public.expense_analyses(period_date);

-- Populate existing data by parsing Spanish month names from 'period' field
UPDATE public.expense_analyses
SET period_date = 
  CASE 
    WHEN lower(period) LIKE 'enero%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 1, 1)
    WHEN lower(period) LIKE 'febrero%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 2, 1)
    WHEN lower(period) LIKE 'marzo%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 3, 1)
    WHEN lower(period) LIKE 'abril%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 4, 1)
    WHEN lower(period) LIKE 'mayo%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 5, 1)
    WHEN lower(period) LIKE 'junio%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 6, 1)
    WHEN lower(period) LIKE 'julio%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 7, 1)
    WHEN lower(period) LIKE 'agosto%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 8, 1)
    WHEN lower(period) LIKE 'septiembre%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 9, 1)
    WHEN lower(period) LIKE 'octubre%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 10, 1)
    WHEN lower(period) LIKE 'noviembre%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 11, 1)
    WHEN lower(period) LIKE 'diciembre%' THEN make_date(
      COALESCE(NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::int, EXTRACT(YEAR FROM created_at)::int), 12, 1)
    ELSE DATE_TRUNC('month', created_at)::date
  END
WHERE period_date IS NULL;