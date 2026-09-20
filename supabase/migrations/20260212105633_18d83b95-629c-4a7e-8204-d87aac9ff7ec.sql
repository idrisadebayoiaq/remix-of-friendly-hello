
-- Appeals table for flagged content
CREATE TABLE public.content_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_type text NOT NULL, -- 'post' or 'comment'
  content_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appeals" ON public.content_appeals FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create appeals" ON public.content_appeals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update appeals" ON public.content_appeals FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_appeals_updated_at BEFORE UPDATE ON public.content_appeals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to notify admins when a new report is submitted
CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT ur.user_id, 'new_report', 'New Report 🚩', 'A new report has been submitted and needs review.',
    jsonb_build_object('report_id', NEW.id, 'reason', NEW.reason)
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admin_on_report ON public.reports;
CREATE TRIGGER notify_admin_on_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_report();

-- Trigger to notify user when their appeal is resolved
CREATE OR REPLACE FUNCTION public.notify_user_on_appeal_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'appeal_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Appeal Approved ✅' ELSE 'Appeal Rejected ❌' END,
      CASE WHEN NEW.status = 'approved' THEN 'Your content has been restored!' ELSE 'Your appeal was reviewed and not approved.' END,
      jsonb_build_object('appeal_id', NEW.id, 'admin_response', COALESCE(NEW.admin_response, ''))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_user_on_appeal_update ON public.content_appeals;
CREATE TRIGGER notify_user_on_appeal_update
  AFTER UPDATE ON public.content_appeals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_appeal_update();
