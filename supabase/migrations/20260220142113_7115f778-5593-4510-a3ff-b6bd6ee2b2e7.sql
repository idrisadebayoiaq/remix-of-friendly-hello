
-- Add video columns to community_posts
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_duration integer,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create post-videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-videos
CREATE POLICY "Anyone can view post videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-videos');

CREATE POLICY "Authenticated users can upload post videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own post videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add message_deletions table for delete-for-me
CREATE TABLE IF NOT EXISTS public.message_deletions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.connection_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletions"
ON public.message_deletions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create deletions"
ON public.message_deletions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add delete-for-everyone columns to connection_messages
ALTER TABLE public.connection_messages
  ADD COLUMN IF NOT EXISTS is_deleted_for_everyone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone_at timestamptz;

-- Add reply_to_message_id for threading
ALTER TABLE public.connection_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.connection_messages(id);

-- Message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.connection_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection participants can view message reactions"
ON public.message_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM connection_messages cm
  JOIN connections c ON c.id = cm.connection_id
  WHERE cm.id = message_reactions.message_id
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can add message reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own message reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users can update own message reactions"
ON public.message_reactions FOR UPDATE
USING (user_id = auth.uid());
