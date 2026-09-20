
-- 1. Add status column to connections table
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'connected';

-- Add dating_started_at and married_at for tracking milestones
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS dating_started_at timestamp with time zone;

ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS married_at timestamp with time zone;

-- 2. Add category column to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';

-- Add image_url column to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS image_url text;

-- 3. Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE
  USING (user_id = auth.uid());

-- 4. Create matchmaking_sessions table
CREATE TABLE IF NOT EXISTS public.matchmaking_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  decision text, -- 'match' or 'not_now'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(connection_id, user_id)
);

ALTER TABLE public.matchmaking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection participants can view matchmaking"
  ON public.matchmaking_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = matchmaking_sessions.connection_id
      AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can submit matchmaking answers"
  ON public.matchmaking_sessions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = matchmaking_sessions.connection_id
      AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own matchmaking"
  ON public.matchmaking_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- 5. Create marriage_sessions table
CREATE TABLE IF NOT EXISTS public.marriage_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  decision text, -- 'yes' or 'not_yet'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(connection_id, user_id)
);

ALTER TABLE public.marriage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection participants can view marriage"
  ON public.marriage_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = marriage_sessions.connection_id
      AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can submit marriage answers"
  ON public.marriage_sessions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = marriage_sessions.connection_id
      AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own marriage"
  ON public.marriage_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- 6. Add allow_connection_requests to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS allow_connection_requests boolean DEFAULT true;

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS allow_requests_when_dating boolean DEFAULT false;

-- 7. Add trusted_contact fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trusted_contact_name text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trusted_contact_phone text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS city text;

-- 8. Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

-- 9. Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view voice messages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-messages');

CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-messages' AND auth.uid() IS NOT NULL);

-- 10. Add comments_count to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;
