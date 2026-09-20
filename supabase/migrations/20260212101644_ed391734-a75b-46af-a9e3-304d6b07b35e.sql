
-- 1) connection_messages: add edited_at for edit tracking
ALTER TABLE public.connection_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 2) community_posts: add is_deleted for soft delete
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 3) post_comments: add parent_comment_id, is_deleted, edited_at for threaded replies + edit/delete
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.post_comments(id);
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 4) Create post_reactions table
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.post_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reactions" ON public.post_reactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can remove own reactions" ON public.post_reactions FOR DELETE USING (user_id = auth.uid());

-- 5) Create comment_reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment reactions" ON public.comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add comment reactions" ON public.comment_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comment reactions" ON public.comment_reactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can remove own comment reactions" ON public.comment_reactions FOR DELETE USING (user_id = auth.uid());

-- 6) profiles: add country, timezone, preferred_currency
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD';

-- 7) Update post_comments RLS: allow update on own comments
CREATE POLICY "Users can update own comments" ON public.post_comments FOR UPDATE USING (user_id = auth.uid());

-- 8) Allow admins to delete any post
CREATE POLICY "Admins can delete any post" ON public.community_posts FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
