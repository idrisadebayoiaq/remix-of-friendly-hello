
-- Announcements table for admin broadcasts
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements" ON public.announcements FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Track which users dismissed announcements
CREATE TABLE public.announcement_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissals" ON public.announcement_dismissals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can dismiss announcements" ON public.announcement_dismissals FOR INSERT WITH CHECK (user_id = auth.uid());
