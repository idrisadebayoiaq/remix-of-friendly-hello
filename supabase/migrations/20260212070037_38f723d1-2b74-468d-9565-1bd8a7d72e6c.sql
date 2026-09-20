
-- Replace overly permissive INSERT policy with authenticated-only insert
DROP POLICY "Users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
