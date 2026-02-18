-- Migration para asegurar las tablas de cache
-- Habilitar RLS para cerrar el vector de seguridad

-- ====================================================================
-- 1. Asegurar building_profiles_cache
-- ====================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.building_profiles_cache ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para cache compartido
-- Permite que cualquier persona con el anon_key pueda leer los datos del cache
CREATE POLICY "Permitir lectura pública de cache" 
ON public.building_profiles_cache 
FOR SELECT 
USING (true);

-- Política para restringir inserción solo a usuarios autenticados
-- Evita que clientes anónimos puedan escribir en el cache
CREATE POLICY "Solo usuarios autenticados pueden insertar cache" 
ON public.building_profiles_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir actualización solo a usuarios autenticados
-- Evita que clientes anónimos puedan modificar el cache
CREATE POLICY "Solo usuarios autenticados pueden actualizar cache" 
ON public.building_profiles_cache 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir eliminación solo a usuarios autenticados
-- Evita que clientes anónimos puedan borrar el cache
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
-- Permite que cualquier persona con el anon_key pueda leer los datos de inflación
CREATE POLICY "Permitir lectura pública de inflación" 
ON public.inflation_cache 
FOR SELECT 
USING (true);

-- Política para restringir inserción solo a usuarios autenticados
-- Evita que clientes anónimos puedan escribir en el cache de inflación
CREATE POLICY "Solo usuarios autenticados pueden insertar inflación" 
ON public.inflation_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir actualización solo a usuarios autenticados
-- Evita que clientes anónimos puedan modificar el cache de inflación
CREATE POLICY "Solo usuarios autenticados pueden actualizar inflación" 
ON public.inflation_cache 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir eliminación solo a usuarios autenticados
-- Evita que clientes anónimos puedan borrar el cache de inflación
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
-- Permite que cualquier persona con el anon_key pueda leer los análisis compartidos
CREATE POLICY "Permitir lectura pública de análisis compartidos" 
ON public.shared_analysis_cache 
FOR SELECT 
USING (true);

-- Política para restringir inserción solo a usuarios autenticados
-- Evita que clientes anónimos puedan escribir en el cache de análisis compartidos
CREATE POLICY "Solo usuarios autenticados pueden insertar análisis" 
ON public.shared_analysis_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir actualización solo a usuarios autenticados
-- Evita que clientes anónimos puedan modificar el cache de análisis compartidos
CREATE POLICY "Solo usuarios autenticados pueden actualizar análisis" 
ON public.shared_analysis_cache 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para restringir eliminación solo a usuarios autenticados
-- Evita que clientes anónimos puedan borrar el cache de análisis compartidos
CREATE POLICY "Solo usuarios autenticados pueden eliminar análisis" 
ON public.shared_analysis_cache 
FOR DELETE 
USING (auth.role() = 'authenticated');
