-- Fix SECURITY DEFINER functions with better validation

-- 1. Update handle_new_user to validate username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Extract and validate username from metadata
  v_username := new.raw_user_meta_data ->> 'username';
  
  -- Sanitize username: trim whitespace, limit length, remove potentially harmful characters
  IF v_username IS NOT NULL THEN
    v_username := TRIM(v_username);
    v_username := LEFT(v_username, 50); -- Max 50 characters
    v_username := regexp_replace(v_username, '[^a-zA-Z0-9_-]', '', 'g'); -- Only alphanumeric, underscore, hyphen
    IF LENGTH(v_username) = 0 THEN
      v_username := NULL;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, v_username);
  RETURN new;
END;
$$;

-- 2. Update update_user_streak to require auth
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_streak RECORD;
BEGIN
  -- Validate that the caller is the user or this is called from a trigger
  IF auth.uid() IS NULL AND current_setting('session_replication_role', true) != 'replica' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- If called directly (not from trigger), verify the user is updating their own streak
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only update own streak';
  END IF;

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

-- 3. Add rate limiting via database constraints
-- Create a function to check daily limits for prompts
CREATE OR REPLACE FUNCTION public.check_daily_prompt_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.prompts 
  WHERE author_id = NEW.author_id 
    AND created_at > NOW() - INTERVAL '1 day';
  
  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Daily prompt limit (20) reached. Please try again tomorrow.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for prompt rate limiting
DROP TRIGGER IF EXISTS check_prompt_rate_limit ON public.prompts;
CREATE TRIGGER check_prompt_rate_limit
  BEFORE INSERT ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_daily_prompt_limit();

-- 4. Add rate limiting for comments
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute_count INTEGER;
  v_daily_count INTEGER;
BEGIN
  -- Check per-minute limit (max 5 comments per minute)
  SELECT COUNT(*) INTO v_minute_count 
  FROM public.comments 
  WHERE author_id = NEW.author_id 
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF v_minute_count >= 5 THEN
    RAISE EXCEPTION 'Comment rate limit exceeded. Please wait a moment before commenting again.';
  END IF;
  
  -- Check daily limit (max 100 comments per day)
  SELECT COUNT(*) INTO v_daily_count 
  FROM public.comments 
  WHERE author_id = NEW.author_id 
    AND created_at > NOW() - INTERVAL '1 day';
  
  IF v_daily_count >= 100 THEN
    RAISE EXCEPTION 'Daily comment limit (100) reached.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_comment_rate ON public.comments;
CREATE TRIGGER check_comment_rate
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_comment_rate_limit();

-- 5. Add rate limiting for upvotes (prevent rapid voting)
CREATE OR REPLACE FUNCTION public.check_upvote_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute_count INTEGER;
BEGIN
  -- Max 30 upvote actions per minute
  SELECT COUNT(*) INTO v_minute_count 
  FROM public.upvotes 
  WHERE user_id = NEW.user_id 
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF v_minute_count >= 30 THEN
    RAISE EXCEPTION 'Voting too fast. Please slow down.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_upvote_rate ON public.upvotes;
CREATE TRIGGER check_upvote_rate
  BEFORE INSERT ON public.upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_upvote_rate_limit();

-- 6. Add rate limiting for follows
CREATE OR REPLACE FUNCTION public.check_follow_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute_count INTEGER;
BEGIN
  -- Max 20 follow actions per minute
  SELECT COUNT(*) INTO v_minute_count 
  FROM public.follows 
  WHERE follower_id = NEW.follower_id 
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF v_minute_count >= 20 THEN
    RAISE EXCEPTION 'Follow rate limit exceeded. Please slow down.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_follow_rate ON public.follows;
CREATE TRIGGER check_follow_rate
  BEFORE INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.check_follow_rate_limit();