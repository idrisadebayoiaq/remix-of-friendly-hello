
-- 1) Announcement replies
CREATE TABLE public.announcement_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_deleted boolean DEFAULT false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.announcement_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcement replies" ON public.announcement_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create replies" ON public.announcement_replies FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own replies" ON public.announcement_replies FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own replies" ON public.announcement_replies FOR DELETE USING (user_id = auth.uid());

-- 2) Announcement reactions
CREATE TABLE public.announcement_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT '❤️',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcement reactions" ON public.announcement_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can add reactions" ON public.announcement_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own reactions" ON public.announcement_reactions FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users can update own reactions" ON public.announcement_reactions FOR UPDATE USING (user_id = auth.uid());

-- 3) Shared songs for music feature
CREATE TABLE public.shared_songs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  url text NOT NULL,
  title text,
  platform text NOT NULL DEFAULT 'unknown',
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection participants can view songs" ON public.shared_songs FOR SELECT
USING (EXISTS (SELECT 1 FROM connections WHERE connections.id = shared_songs.connection_id AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())));

CREATE POLICY "Connection participants can add songs" ON public.shared_songs FOR INSERT
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM connections WHERE connections.id = shared_songs.connection_id AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())));

CREATE POLICY "Sender can update own songs" ON public.shared_songs FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "Sender can delete own songs" ON public.shared_songs FOR DELETE USING (sender_id = auth.uid());

-- 4) Add is_deleted to profiles for soft delete account
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
