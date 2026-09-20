ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS last_love_tip text,
  ADD COLUMN IF NOT EXISTS last_love_tip_at timestamptz;
