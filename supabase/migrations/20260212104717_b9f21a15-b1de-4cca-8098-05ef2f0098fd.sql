
-- Add date_of_birth and dob_public to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob_public boolean DEFAULT true;

-- Add is_banned to profiles for soft-banning
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;
