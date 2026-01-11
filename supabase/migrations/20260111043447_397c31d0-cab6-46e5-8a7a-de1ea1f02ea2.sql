-- Add country and province columns to building_profiles
ALTER TABLE public.building_profiles
ADD COLUMN country text DEFAULT 'Argentina',
ADD COLUMN province text;