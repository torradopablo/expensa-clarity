-- Tabla para comentarios públicos en análisis compartidos
CREATE TABLE IF NOT EXISTS public.analysis_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  token TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  comment TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_analysis_comments_analysis_id ON analysis_comments(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_comments_token ON analysis_comments(token);
CREATE INDEX IF NOT EXISTS idx_analysis_comments_created_at ON analysis_comments(created_at DESC);

-- RLS para permitir lectura pública pero escritura controlada
ALTER TABLE public.analysis_comments ENABLE ROW LEVEL SECURITY;

-- Política para permitir leer comentarios de análisis compartidos
CREATE POLICY "Anyone can view analysis comments" 
ON public.analysis_comments 
FOR SELECT 
USING (true);

-- Política para permitir insertar comentarios (con validaciones en edge function)
CREATE POLICY "Anyone can insert analysis comments" 
ON public.analysis_comments 
FOR INSERT 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_analysis_comments_updated_at
BEFORE UPDATE ON public.analysis_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
