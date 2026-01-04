-- Create storage bucket for prompt attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('prompt-attachments', 'prompt-attachments', true);

-- Allow anyone to view attachments
CREATE POLICY "Public can view prompt attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'prompt-attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prompt-attachments' AND auth.role() = 'authenticated');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'prompt-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add columns to prompts table for custom model and attachments
ALTER TABLE public.prompts
ADD COLUMN custom_model_name TEXT,
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;