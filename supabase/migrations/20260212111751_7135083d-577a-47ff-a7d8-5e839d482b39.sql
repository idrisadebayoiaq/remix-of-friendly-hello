
-- Add is_read column to support_chats for read receipts
ALTER TABLE public.support_chats ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
