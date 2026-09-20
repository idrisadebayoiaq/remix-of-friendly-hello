
-- A) Add connection type columns
ALTER TABLE public.connections 
  ADD COLUMN IF NOT EXISTS origin_type text NOT NULL DEFAULT 'invite',
  ADD COLUMN IF NOT EXISTS relationship_track text NOT NULL DEFAULT 'romantic',
  ADD COLUMN IF NOT EXISTS upgraded_to_romantic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS friendship_started_at timestamp with time zone DEFAULT now();

-- Update existing connections to be invite/romantic
UPDATE public.connections SET origin_type = 'invite', relationship_track = 'romantic';

-- D) Post shares table
CREATE TABLE IF NOT EXISTS public.post_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shares" ON public.post_shares FOR SELECT USING (true);
CREATE POLICY "Users can share posts" ON public.post_shares FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own shares" ON public.post_shares FOR DELETE USING (user_id = auth.uid());

-- Add shares_count to community_posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0;

-- Trigger to update shares count
CREATE OR REPLACE FUNCTION public.update_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_shares_count
AFTER INSERT OR DELETE ON public.post_shares
FOR EACH ROW EXECUTE FUNCTION public.update_post_shares_count();

-- Add actor_id to notifications for post interaction notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id uuid;
