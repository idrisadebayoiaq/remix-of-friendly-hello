
-- Push subscriptions table to store Web Push endpoints
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function to call send-push edge function on new notification
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://pgehtqrhrqvlnikdfarz.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'data', NEW.data
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_push_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.send_push_notification();
