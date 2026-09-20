-- Phase 7: collaborative AI co-date planner
CREATE TABLE IF NOT EXISTS public.date_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Our date plan',
  city text,
  budget text,
  preference text,
  plan_text text NOT NULL DEFAULT '',
  ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewing', 'agreed', 'archived')),
  creator_stance text CHECK (creator_stance IS NULL OR creator_stance IN ('approve', 'edit', 'not_for_me')),
  partner_stance text CHECK (partner_stance IS NULL OR partner_stance IN ('approve', 'edit', 'not_for_me')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_date_plans_connection ON public.date_plans(connection_id);
CREATE INDEX IF NOT EXISTS idx_date_plans_status ON public.date_plans(status);

ALTER TABLE public.date_plans ENABLE ROW LEVEL SECURITY;

-- Connection members can read plans on their bonds
DROP POLICY IF EXISTS "Connection members can read date plans" ON public.date_plans;
CREATE POLICY "Connection members can read date plans"
  ON public.date_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = date_plans.connection_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND c.status NOT IN ('ended', 'blocked')
    )
  );

DROP POLICY IF EXISTS "Connection members can create date plans" ON public.date_plans;
CREATE POLICY "Connection members can create date plans"
  ON public.date_plans FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND c.status NOT IN ('ended', 'blocked')
    )
  );

DROP POLICY IF EXISTS "Connection members can update date plans" ON public.date_plans;
CREATE POLICY "Connection members can update date plans"
  ON public.date_plans FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = date_plans.connection_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND c.status NOT IN ('ended', 'blocked')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = date_plans.connection_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND c.status NOT IN ('ended', 'blocked')
    )
  );

GRANT ALL ON public.date_plans TO anon, authenticated, service_role;
