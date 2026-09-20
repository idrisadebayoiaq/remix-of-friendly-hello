
-- Fix community_posts: drop restrictive SELECT and create permissive one
DROP POLICY IF EXISTS "Anyone can view community posts" ON public.community_posts;
CREATE POLICY "Anyone can view community posts"
  ON public.community_posts FOR SELECT
  USING (true);

-- Fix community_post_likes: drop restrictive SELECT and create permissive one
DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_post_likes;
CREATE POLICY "Anyone can view likes"
  ON public.community_post_likes FOR SELECT
  USING (true);

-- Fix community_posts INSERT - make permissive
DROP POLICY IF EXISTS "Users can create posts" ON public.community_posts;
CREATE POLICY "Users can create posts"
  ON public.community_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fix community_posts UPDATE - make permissive
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
CREATE POLICY "Users can update own posts"
  ON public.community_posts FOR UPDATE
  USING (user_id = auth.uid());

-- Fix community_posts DELETE - make permissive
DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;
CREATE POLICY "Users can delete own posts"
  ON public.community_posts FOR DELETE
  USING (user_id = auth.uid());

-- Fix community_post_likes INSERT - make permissive
DROP POLICY IF EXISTS "Users can like posts" ON public.community_post_likes;
CREATE POLICY "Users can like posts"
  ON public.community_post_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fix community_post_likes DELETE - make permissive
DROP POLICY IF EXISTS "Users can unlike posts" ON public.community_post_likes;
CREATE POLICY "Users can unlike posts"
  ON public.community_post_likes FOR DELETE
  USING (user_id = auth.uid());
