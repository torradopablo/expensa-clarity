-- Migration para asegurar las tablas de cache
-- Habilitar RLS para cerrar el vector de seguridad

-- ====================================================================
-- 1. Asegurar building_profiles_cache
-- ====================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.building_profiles_cache ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para cache compartido
DROP POLICY IF EXISTS "Permitir lectura pública de cache" ON public.building_profiles_cache;
CREATE POLICY "Permitir lectura pública de cache" 
ON public.building_profiles_cache 
FOR SELECT 
USING (true);

-- Política para restringir inserción solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden insertar cache" ON public.building_profiles_cache;
CREATE POLICY "Solo usuarios autenticados pueden insertar cache" 
ON public.building_profiles_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden actualizar cache" ON public.building_profiles_cache;
CREATE POLICY "Solo usuarios autenticados pueden actualizar cache" 
ON public.building_profiles_cache 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden eliminar cache" ON public.building_profiles_cache;
CREATE POLICY "Solo usuarios autenticados pueden eliminar cache" 
ON public.building_profiles_cache 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- ====================================================================
-- 2. Asegurar inflation_cache
-- ====================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.inflation_cache ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para datos de inflación
DROP POLICY IF EXISTS "Permitir lectura pública de inflación" ON public.inflation_cache;
CREATE POLICY "Permitir lectura pública de inflación" 
ON public.inflation_cache 
FOR SELECT 
USING (true);

-- Política para restringir inserción solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden insertar inflación" ON public.inflation_cache;
CREATE POLICY "Solo usuarios autenticados pueden insertar inflación" 
ON public.inflation_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden actualizar inflación" ON public.inflation_cache;
CREATE POLICY "Solo usuarios autenticados pueden actualizar inflación" 
ON public.inflation_cache 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden eliminar inflación" ON public.inflation_cache;
CREATE POLICY "Solo usuarios autenticados pueden eliminar inflación" 
ON public.inflation_cache 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- ====================================================================
-- 3. Asegurar shared_analysis_cache
-- ====================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.shared_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para análisis compartidos
DROP POLICY IF EXISTS "Permitir lectura pública de análisis compartidos" ON public.shared_analysis_cache;
CREATE POLICY "Permitir lectura pública de análisis compartidos" 
ON public.shared_analysis_cache 
FOR SELECT 
USING (true);

-- Política para restringir inserción solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden insertar análisis" ON public.shared_analysis_cache;
CREATE POLICY "Solo usuarios autenticados pueden insertar análisis" 
ON public.shared_analysis_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden actualizar análisis" ON public.shared_analysis_cache;
CREATE POLICY "Solo usuarios autenticados pueden actualizar análisis" 
ON public.shared_analysis_cache 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden eliminar análisis" ON public.shared_analysis_cache;
CREATE POLICY "Solo usuarios autenticados pueden eliminar análisis" 
ON public.shared_analysis_cache 
FOR DELETE 
USING (auth.role() = 'authenticated');
