-- Migración para mejorar el rendimiento de las consultas de historial y tendencias
-- Estos índices optimizan el filtrado por estado y por nombre de edificio

-- Índice para el estado de los análisis (utilizado en casi todas las consultas de la app)
CREATE INDEX IF NOT EXISTS idx_expense_analyses_status ON public.expense_analyses(status);

-- Índice para el nombre del edificio (utilizado en el historial y en las comparativas de mercado)
CREATE INDEX IF NOT EXISTS idx_expense_analyses_building_name ON public.expense_analyses(building_name);

-- También agregamos un índice compuesto para las categorías, que se usa frecuentemente al filtrar tendencias por rubro
CREATE INDEX IF NOT EXISTS idx_expense_categories_name_analysis_id ON public.expense_categories(name, analysis_id);
