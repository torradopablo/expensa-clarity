-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create expense analyses table
CREATE TABLE public.expense_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_name TEXT,
  period TEXT NOT NULL,
  unit TEXT,
  total_amount DECIMAL(12, 2) NOT NULL,
  previous_total DECIMAL(12, 2),
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'completed', 'failed')),
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_analyses ENABLE ROW LEVEL SECURITY;

-- Expense analyses policies
CREATE POLICY "Users can view their own analyses" ON public.expense_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" ON public.expense_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" ON public.expense_analyses
  FOR UPDATE USING (auth.uid() = user_id);

-- Create expense categories table for detailed breakdown
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.expense_analyses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  current_amount DECIMAL(12, 2) NOT NULL,
  previous_amount DECIMAL(12, 2),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'attention', 'info')),
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Categories policies (inherit from parent analysis)
CREATE POLICY "Users can view categories of their analyses" ON public.expense_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expense_analyses 
      WHERE id = expense_categories.analysis_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create categories for their analyses" ON public.expense_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_analyses 
      WHERE id = expense_categories.analysis_id 
      AND user_id = auth.uid()
    )
  );

-- Create storage bucket for expense files
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-files', 'expense-files', false);

-- Storage policies for expense files
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'expense-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'expense-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'expense-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_analyses_updated_at
  BEFORE UPDATE ON public.expense_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();