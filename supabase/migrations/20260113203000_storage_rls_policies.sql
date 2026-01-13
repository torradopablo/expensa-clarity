-- Permitir que usuarios autenticados suban archivos al bucket expense-files
CREATE POLICY "Permitir subida a usuarios autenticados" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'expense-files');

-- Permitir que usuarios vean sus propios archivos
CREATE POLICY "Permitir lectura de archivos propios" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'expense-files');
