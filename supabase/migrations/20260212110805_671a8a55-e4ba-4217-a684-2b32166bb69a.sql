
-- Allow users and admins to update their own support messages
CREATE POLICY "Users can update own support messages"
ON public.support_chats
FOR UPDATE
USING (
  (user_id = auth.uid() AND is_admin = false)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users and admins to delete their own support messages
CREATE POLICY "Users can delete own support messages"
ON public.support_chats
FOR DELETE
USING (
  (user_id = auth.uid() AND is_admin = false)
  OR has_role(auth.uid(), 'admin'::app_role)
);
