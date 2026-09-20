
-- Add is_flagged to community_posts for moderation queue
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;

-- Add is_flagged to post_comments for moderation queue
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;

-- Create a function that auto-flags a post when it gets reported
CREATE OR REPLACE FUNCTION public.auto_flag_reported_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_id_val text;
BEGIN
  -- Check if the report details contains a post reference
  IF NEW.details LIKE 'Post: %' THEN
    post_id_val := trim(replace(NEW.details, 'Post: ', ''));
    UPDATE public.community_posts SET is_flagged = true WHERE id = post_id_val::uuid;
  END IF;
  
  -- Check if the report details contains a comment reference
  IF NEW.details LIKE 'Comment: %' THEN
    post_id_val := trim(replace(NEW.details, 'Comment: ', ''));
    UPDATE public.post_comments SET is_flagged = true WHERE id = post_id_val::uuid;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-flag on report insert
DROP TRIGGER IF EXISTS auto_flag_on_report ON public.reports;
CREATE TRIGGER auto_flag_on_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_flag_reported_post();
