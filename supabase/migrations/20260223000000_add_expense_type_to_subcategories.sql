-- Add expense_type to subcategories to distinguish ordinary from extraordinary expenses
ALTER TABLE public.expense_subcategories 
ADD COLUMN expense_type TEXT CHECK (expense_type IN ('ordinaria', 'extraordinaria', 'fondo_reserva')) DEFAULT 'ordinaria';

-- Comment explaining the types in Argentine context
COMMENT ON COLUMN public.expense_subcategories.expense_type IS 'ordinaria: gastos comunes recurrentes. extraordinaria: gastos estructurales o de capital. fondo_reserva: ahorro del consorcio.';
