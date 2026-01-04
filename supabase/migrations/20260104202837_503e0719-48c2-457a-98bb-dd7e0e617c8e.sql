-- Create badges enum and table
CREATE TYPE public.badge_type AS ENUM (
  'first_prompt',
  'first_upvote',
  'top_10',
  'helpful_reviewer',
  'prolific_author',
  'popular_prompt',
  'streak_7',
  'streak_30',
  'early_adopter',
  'challenge_winner'
);

CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type badge_type NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Create streaks table
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create following table
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user challenge progress table
CREATE TABLE public.user_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Add follower counts to profiles
ALTER TABLE public.profiles 
ADD COLUMN followers_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS on all new tables
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_badges
CREATE POLICY "Badges are viewable by everyone" 
ON public.user_badges FOR SELECT USING (true);

CREATE POLICY "System can insert badges" 
ON public.user_badges FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for user_streaks
CREATE POLICY "Streaks are viewable by everyone" 
ON public.user_streaks FOR SELECT USING (true);

CREATE POLICY "Users can manage their own streak" 
ON public.user_streaks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" 
ON public.user_streaks FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for follows
CREATE POLICY "Follows are viewable by everyone" 
ON public.follows FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow" 
ON public.follows FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.follows FOR DELETE 
USING (auth.uid() = follower_id);

-- RLS policies for challenges
CREATE POLICY "Challenges are viewable by everyone" 
ON public.challenges FOR SELECT USING (true);

-- RLS policies for user_challenges
CREATE POLICY "User challenges are viewable by everyone" 
ON public.user_challenges FOR SELECT USING (true);

CREATE POLICY "Users can join challenges" 
ON public.user_challenges FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their challenge progress" 
ON public.user_challenges FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to update follower counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_follow_changed
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Function to update streak on activity
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_streak RECORD;
BEGIN
  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today);
  ELSIF v_streak.last_activity_date = v_today THEN
    -- Already active today, do nothing
    NULL;
  ELSIF v_streak.last_activity_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE public.user_streaks 
    SET 
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_activity_date = v_today,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken, reset
    UPDATE public.user_streaks 
    SET 
      current_streak = 1,
      last_activity_date = v_today,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Trigger to update streak when user submits prompt
CREATE OR REPLACE FUNCTION public.update_streak_on_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_user_streak(NEW.author_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_prompt_update_streak
  AFTER INSERT ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_prompt();

-- Insert some initial challenges
INSERT INTO public.challenges (title, description, challenge_type, target_count, xp_reward, start_date, end_date) VALUES
('First Steps', 'Submit your first prompt this week', 'submit_prompt', 1, 25, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Helpful Contributor', 'Share 3 prompt results with the community', 'submit_result', 3, 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Community Builder', 'Upvote 5 prompts you find useful', 'upvote', 5, 30, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Prolific Week', 'Submit 5 prompts in one week', 'submit_prompt', 5, 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days');