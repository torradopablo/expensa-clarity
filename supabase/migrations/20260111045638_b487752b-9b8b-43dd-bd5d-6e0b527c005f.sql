-- Add free_analysis flag to profiles table for test users
-- Default is false - all users must pay unless explicitly set to true
ALTER TABLE public.profiles
ADD COLUMN free_analysis boolean NOT NULL DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.free_analysis IS 'If true, user can analyze expenses without payment. Default false - users must pay.';