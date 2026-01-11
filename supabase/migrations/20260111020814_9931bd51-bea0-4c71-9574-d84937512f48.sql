-- Create building profiles table for more accurate comparisons
CREATE TABLE public.building_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  building_name TEXT NOT NULL,
  
  -- Unit count category
  unit_count_range TEXT, -- '1-20', '21-50', '51-100', '101-200', '200+'
  
  -- Amenities
  has_amenities BOOLEAN DEFAULT false,
  amenities TEXT[], -- Array of amenity names: 'pileta', 'gimnasio', 'sum', 'seguridad', etc.
  
  -- Building age
  construction_year INTEGER,
  age_category TEXT, -- 'nuevo (0-5 años)', 'moderno (6-20 años)', 'clásico (21-50 años)', 'antiguo (50+ años)'
  
  -- Location
  neighborhood TEXT,
  city TEXT DEFAULT 'Buenos Aires',
  zone TEXT, -- 'norte', 'sur', 'centro', 'oeste'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique building per user
  UNIQUE(user_id, building_name)
);

-- Enable RLS
ALTER TABLE public.building_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own building profiles"
ON public.building_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own building profiles"
ON public.building_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own building profiles"
ON public.building_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own building profiles"
ON public.building_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Policy to allow reading other buildings' profiles for comparison (anonymous aggregated data)
CREATE POLICY "Users can view all building profiles for comparison"
ON public.building_profiles
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_building_profiles_updated_at
BEFORE UPDATE ON public.building_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add building_profile_id to expense_analyses for linking
ALTER TABLE public.expense_analyses 
ADD COLUMN building_profile_id UUID REFERENCES public.building_profiles(id);