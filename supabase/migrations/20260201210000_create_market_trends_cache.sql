-- Tabla para cachear las tendencias del mercado
CREATE TABLE IF NOT EXISTS public.market_trends_cache (
    filter_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    stats JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para la tabla de caché (solo accesible por el rol de servicio)
ALTER TABLE public.market_trends_cache ENABLE ROW LEVEL SECURITY;
