
-- 1) Add dating_requests table for early dating flow
CREATE TABLE public.dating_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id),
  requester_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dating_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection participants can view dating requests"
  ON public.dating_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM connections c
    WHERE c.id = dating_requests.connection_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

CREATE POLICY "Connection participants can create dating requests"
  ON public.dating_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid() AND EXISTS (
    SELECT 1 FROM connections c
    WHERE c.id = dating_requests.connection_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

CREATE POLICY "Connection participants can update dating requests"
  ON public.dating_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM connections c
    WHERE c.id = dating_requests.connection_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

-- 2) Add game_sessions table
CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id),
  game_type text NOT NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection participants can view game sessions"
  ON public.game_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM connections c
    WHERE c.id = game_sessions.connection_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

CREATE POLICY "Connection participants can create game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM connections c
    WHERE c.id = game_sessions.connection_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

CREATE POLICY "Connection participants can update game sessions"
  ON public.game_sessions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM connections c
    WHERE c.id = game_sessions.connection_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

-- 3) Add game_answers table
CREATE TABLE public.game_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id),
  user_id uuid NOT NULL,
  question_index int NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view game answers"
  ON public.game_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM game_sessions gs
    JOIN connections c ON c.id = gs.connection_id
    WHERE gs.id = game_answers.session_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

CREATE POLICY "Users can insert own game answers"
  ON public.game_answers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 4) Add UPDATE policy for connections (needed for dating/marriage status changes)
CREATE POLICY "Connection participants can update connection"
  ON public.connections FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- 5) Add responded_at column to invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- 6) Triggers to keep community_posts counts accurate
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_post_likes_count ON public.community_post_likes;
CREATE TRIGGER trg_update_post_likes_count
AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_update_post_comments_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- 7) Add sound_enabled to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS sound_enabled boolean DEFAULT true;
