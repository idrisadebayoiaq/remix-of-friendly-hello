CREATE TABLE IF NOT EXISTS public.dating_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bio text DEFAULT ''::text,
  location text DEFAULT ''::text,
  looking_for text NOT NULL DEFAULT 'serious'::text,
  interests text[] DEFAULT '{}'::text[],
  photos text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_profiles' AND policyname = 'Users can view active dating profiles'
  ) THEN
    CREATE POLICY "Users can view active dating profiles"
    ON public.dating_profiles
    FOR SELECT
    TO authenticated
    USING (is_active = true OR user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_profiles' AND policyname = 'Users can insert own dating profile'
  ) THEN
    CREATE POLICY "Users can insert own dating profile"
    ON public.dating_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_profiles' AND policyname = 'Users can update own dating profile'
  ) THEN
    CREATE POLICY "Users can update own dating profile"
    ON public.dating_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_profiles' AND policyname = 'Users can delete own dating profile'
  ) THEN
    CREATE POLICY "Users can delete own dating profile"
    ON public.dating_profiles
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.dating_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL,
  liked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dating_likes_unique_pair UNIQUE (liker_id, liked_id)
);

ALTER TABLE public.dating_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_likes' AND policyname = 'Users can view own dating likes'
  ) THEN
    CREATE POLICY "Users can view own dating likes"
    ON public.dating_likes
    FOR SELECT
    TO authenticated
    USING (liker_id = auth.uid() OR liked_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_likes' AND policyname = 'Users can insert own dating likes'
  ) THEN
    CREATE POLICY "Users can insert own dating likes"
    ON public.dating_likes
    FOR INSERT
    TO authenticated
    WITH CHECK (liker_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dating_likes' AND policyname = 'Users can delete own dating likes'
  ) THEN
    CREATE POLICY "Users can delete own dating likes"
    ON public.dating_likes
    FOR DELETE
    TO authenticated
    USING (liker_id = auth.uid());
  END IF;
END $$;

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS matchmaking_unlocked_at timestamp with time zone;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_dating_profiles_user_id ON public.dating_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_active ON public.dating_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_looking_for ON public.dating_profiles(looking_for);
CREATE INDEX IF NOT EXISTS idx_dating_likes_liker_id ON public.dating_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_dating_likes_liked_id ON public.dating_likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_user_id ON public.profiles(partner_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_dating_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_dating_profiles_updated_at
    BEFORE UPDATE ON public.dating_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;