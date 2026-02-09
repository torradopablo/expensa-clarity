-- Create table to track meeting preparation generations
CREATE TABLE IF NOT EXISTS public.meeting_preparation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    building_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_preparation_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own logs
CREATE POLICY "Users can view their own meeting preparation logs"
    ON public.meeting_preparation_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create index for faster querying by user and date
CREATE INDEX IF NOT EXISTS idx_meeting_prep_logs_user_date ON public.meeting_preparation_logs (user_id, created_at);
