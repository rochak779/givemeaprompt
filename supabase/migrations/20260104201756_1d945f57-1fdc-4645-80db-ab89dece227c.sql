-- Create prompt_results table for tracking user experiences with prompts
CREATE TABLE public.prompt_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  worked_as_expected BOOLEAN NOT NULL DEFAULT true,
  output_text TEXT,
  modifications TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prompt_copies table to track when prompts are copied
CREATE TABLE public.prompt_copies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  copied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add gamification columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN total_xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN prompts_submitted INTEGER NOT NULL DEFAULT 0,
ADD COLUMN upvotes_received INTEGER NOT NULL DEFAULT 0,
ADD COLUMN prompts_copied INTEGER NOT NULL DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.prompt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_copies ENABLE ROW LEVEL SECURITY;

-- RLS policies for prompt_results
CREATE POLICY "Results are viewable by everyone" 
ON public.prompt_results FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create results" 
ON public.prompt_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own results" 
ON public.prompt_results FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results" 
ON public.prompt_results FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for prompt_copies
CREATE POLICY "Copies are viewable by everyone" 
ON public.prompt_copies FOR SELECT USING (true);

CREATE POLICY "Anyone can create copies" 
ON public.prompt_copies FOR INSERT 
WITH CHECK (true);

-- Function to update author stats when a prompt is submitted
CREATE OR REPLACE FUNCTION public.update_author_stats_on_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    prompts_submitted = prompts_submitted + 1,
    total_xp = total_xp + 10
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$;

-- Function to update author stats when upvote is added/removed
CREATE OR REPLACE FUNCTION public.update_author_xp_on_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prompt_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO prompt_author_id FROM public.prompts WHERE id = NEW.prompt_id;
    UPDATE public.profiles 
    SET 
      upvotes_received = upvotes_received + 1,
      total_xp = total_xp + 5
    WHERE id = prompt_author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO prompt_author_id FROM public.prompts WHERE id = OLD.prompt_id;
    UPDATE public.profiles 
    SET 
      upvotes_received = GREATEST(upvotes_received - 1, 0),
      total_xp = GREATEST(total_xp - 5, 0)
    WHERE id = prompt_author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update author stats when prompt is copied
CREATE OR REPLACE FUNCTION public.update_author_stats_on_copy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prompt_author_id UUID;
BEGIN
  SELECT author_id INTO prompt_author_id FROM public.prompts WHERE id = NEW.prompt_id;
  UPDATE public.profiles 
  SET 
    prompts_copied = prompts_copied + 1,
    total_xp = total_xp + 2
  WHERE id = prompt_author_id;
  RETURN NEW;
END;
$$;

-- Function to give XP when user submits a result
CREATE OR REPLACE FUNCTION public.update_user_xp_on_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET total_xp = total_xp + 5
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_prompt_created
  AFTER INSERT ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_author_stats_on_prompt();

CREATE TRIGGER on_upvote_changed
  AFTER INSERT OR DELETE ON public.upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_author_xp_on_upvote();

CREATE TRIGGER on_prompt_copied
  AFTER INSERT ON public.prompt_copies
  FOR EACH ROW EXECUTE FUNCTION public.update_author_stats_on_copy();

CREATE TRIGGER on_result_submitted
  AFTER INSERT ON public.prompt_results
  FOR EACH ROW EXECUTE FUNCTION public.update_user_xp_on_result();