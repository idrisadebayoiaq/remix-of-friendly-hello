-- Phase 8: growth badges + onboarding intent
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_intent text
  CHECK (primary_intent IS NULL OR primary_intent IN ('invite', 'dating', 'friends', 'grow'));

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  title text NOT NULL,
  description text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_unique UNIQUE (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own badges" ON public.user_badges;
CREATE POLICY "Users can read own badges"
  ON public.user_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;
CREATE POLICY "Users can insert own badges"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Public read of others' badge counts is optional; allow authenticated read of any badge for profile display
DROP POLICY IF EXISTS "Authenticated can read badges" ON public.user_badges;
CREATE POLICY "Authenticated can read badges"
  ON public.user_badges FOR SELECT TO authenticated
  USING (true);

GRANT ALL ON public.user_badges TO anon, authenticated, service_role;
