-- Create table to store Argentina inflation data
CREATE TABLE public.inflation_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL UNIQUE, -- Format: YYYY-MM
  value NUMERIC NOT NULL, -- Inflation index value
  is_estimated BOOLEAN NOT NULL DEFAULT false, -- True if value is estimated/projected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read access for all users)
ALTER TABLE public.inflation_data ENABLE ROW LEVEL SECURITY;

-- Everyone can read inflation data
CREATE POLICY "Anyone can view inflation data" 
ON public.inflation_data 
FOR SELECT 
USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage inflation data" 
ON public.inflation_data 
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for period lookups
CREATE INDEX idx_inflation_data_period ON public.inflation_data(period);

-- Create trigger for updated_at
CREATE TRIGGER update_inflation_data_updated_at
BEFORE UPDATE ON public.inflation_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();