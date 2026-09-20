
-- Add onboarding and install prompt fields to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS has_seen_onboarding boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS install_prompt_dismissed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS install_prompt_installed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS install_prompt_cooldown_days integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS preferred_install_prompt boolean DEFAULT true;
