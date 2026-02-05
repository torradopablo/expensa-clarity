-- Agregar columna para identificar comentarios de owner y respuestas
ALTER TABLE public.analysis_comments 
ADD COLUMN IF NOT EXISTS is_owner_comment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.analysis_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índices para rendimiento de respuestas
CREATE INDEX IF NOT EXISTS idx_analysis_comments_parent_id ON analysis_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_comments_user_id ON analysis_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_comments_is_owner ON analysis_comments(is_owner_comment);

-- Comentarios para actualizar RLS
COMMENT ON COLUMN public.analysis_comments.is_owner_comment IS 'Indica si el comentario fue hecho por el owner del análisis';
COMMENT ON COLUMN public.analysis_comments.parent_comment_id IS 'ID del comentario padre para respuestas';
COMMENT ON COLUMN public.analysis_comments.user_id IS 'ID del usuario autenticado (solo para comentarios de owner)';
