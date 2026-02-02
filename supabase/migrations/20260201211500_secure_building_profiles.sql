-- Revocamos la política permisiva que permitía ver todos los perfiles de edificios
-- Esto cierra el vector de Information Disclosure.
DROP POLICY IF EXISTS "Users can view all building profiles for comparison" ON public.building_profiles;

-- Aseguramos que solo el dueño pueda ver sus perfiles (ya cubierto por "Users can view their own building profiles")
-- Las Edge Functions usarán service_role para las agregaciones estadísticas.
