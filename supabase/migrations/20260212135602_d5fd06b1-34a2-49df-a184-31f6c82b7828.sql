
-- Add missing columns to surprise_messages
ALTER TABLE public.surprise_messages ADD COLUMN IF NOT EXISTS receiver_id uuid;
ALTER TABLE public.surprise_messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.surprise_messages ADD COLUMN IF NOT EXISTS revealed_at timestamp with time zone;

-- Rename unlock_at to reveal_at for clarity (keep old column, add new)
ALTER TABLE public.surprise_messages RENAME COLUMN unlock_at TO reveal_at;
ALTER TABLE public.surprise_messages RENAME COLUMN is_unlocked TO is_revealed;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Connected users can create surprises" ON public.surprise_messages;
DROP POLICY IF EXISTS "Connected users can view unlocked surprises" ON public.surprise_messages;

-- New RLS: Both connection participants can read surprises for their connection
CREATE POLICY "Connection participants can view surprises"
ON public.surprise_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM connections
    WHERE connections.id = surprise_messages.connection_id
    AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
  )
);

-- Only sender can create
CREATE POLICY "Users can create surprises"
ON public.surprise_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM connections
    WHERE connections.id = surprise_messages.connection_id
    AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
  )
);

-- Only sender can update (edit/soft-delete)
CREATE POLICY "Sender can update surprises"
ON public.surprise_messages FOR UPDATE
USING (sender_id = auth.uid());

-- Only sender can hard delete
CREATE POLICY "Sender can delete surprises"
ON public.surprise_messages FOR DELETE
USING (sender_id = auth.uid());
