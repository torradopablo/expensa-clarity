-- Tabla para cachear análisis compartidos completos
CREATE TABLE IF NOT EXISTS public.shared_analysis_cache (
    analysis_id TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    response_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_shared_analysis_cache_token ON shared_analysis_cache(token);
CREATE INDEX IF NOT EXISTS idx_shared_analysis_cache_expires_at ON shared_analysis_cache(expires_at);

-- RLS deshabilitado para acceso por servicio
ALTER TABLE public.shared_analysis_cache DISABLE ROW LEVEL SECURITY;

-- Tabla para cachear datos de inflación (cambian mensualmente)
CREATE TABLE IF NOT EXISTS public.inflation_cache (
  cache_key TEXT PRIMARY KEY DEFAULT 'inflation_data',
  data JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para rendimiento
CREATE INDEX IF NOT EXISTS idx_inflation_cache_expires_at ON inflation_cache(expires_at);

-- RLS deshabilitado para acceso por servicio
ALTER TABLE public.inflation_cache DISABLE ROW LEVEL SECURITY;

-- Tabla para cachear perfiles de edificios (cambian poco frecuentemente)
CREATE TABLE IF NOT EXISTS public.building_profiles_cache (
  building_name TEXT PRIMARY KEY,
  profile_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_building_profiles_cache_updated_at ON building_profiles_cache(updated_at);

-- RLS deshabilitado para acceso por servicio
ALTER TABLE public.building_profiles_cache DISABLE ROW LEVEL SECURITY;