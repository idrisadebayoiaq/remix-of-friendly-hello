
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_messages boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_connection_requests boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_dating_requests boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_daily_questions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_community boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_invites boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_appeals boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_reports boolean DEFAULT true;
