-- Fix 1: Add is_public column to prompt_results for privacy control
ALTER TABLE public.prompt_results ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Drop the overly permissive SELECT policy on prompt_results
DROP POLICY IF EXISTS "Results are viewable by everyone" ON public.prompt_results;

-- Create a more restrictive policy for viewing results
CREATE POLICY "Results viewable by owner, prompt author, or if public"
ON public.prompt_results
FOR SELECT
USING (
  is_public = true 
  OR auth.uid() = user_id 
  OR auth.uid() IN (SELECT author_id FROM public.prompts WHERE id = prompt_id)
);

-- Fix 2: Fix anonymous copy vulnerability - require authentication for copies
DROP POLICY IF EXISTS "Anyone can create copies" ON public.prompt_copies;

CREATE POLICY "Authenticated users can create copies"
ON public.prompt_copies
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- Fix 3: Make the storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'prompt-attachments';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Public can view prompt attachments" ON storage.objects;

-- Create authenticated-only policy for viewing attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'prompt-attachments' AND auth.role() = 'authenticated');