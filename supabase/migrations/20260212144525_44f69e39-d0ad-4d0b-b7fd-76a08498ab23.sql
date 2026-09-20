
-- Create accept_invite RPC function
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invite record;
  v_connection_id uuid;
  v_user_id uuid;
  v_receiver_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Lock the invite row
  SELECT * INTO v_invite FROM invites WHERE token = p_token FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('error', 'Invite not found');
  END IF;
  
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'Invite already ' || v_invite.status);
  END IF;
  
  IF v_invite.expires_at < now() THEN
    UPDATE invites SET status = 'expired', updated_at = now() WHERE id = v_invite.id;
    RETURN jsonb_build_object('error', 'Invite expired');
  END IF;
  
  IF v_invite.sender_id = v_user_id THEN
    RETURN jsonb_build_object('error', 'Cannot accept your own invite');
  END IF;

  -- Update invite
  UPDATE invites SET 
    status = 'accepted',
    receiver_id = v_user_id,
    responded_at = now(),
    updated_at = now()
  WHERE id = v_invite.id;

  -- Check for existing active connection
  SELECT id INTO v_connection_id FROM connections
  WHERE (
    (user1_id = v_invite.sender_id AND user2_id = v_user_id) OR
    (user1_id = v_user_id AND user2_id = v_invite.sender_id)
  )
  AND status NOT IN ('ended', 'blocked')
  LIMIT 1;

  -- Create connection if none exists
  IF v_connection_id IS NULL THEN
    INSERT INTO connections (user1_id, user2_id, source_invite_id)
    VALUES (v_invite.sender_id, v_user_id, v_invite.id)
    RETURNING id INTO v_connection_id;
    
    -- Insert timeline event
    INSERT INTO connection_timeline_events (connection_id, event_type, title)
    VALUES (v_connection_id, 'connected', 'Connected 💕');
  END IF;

  -- Create notification for sender
  SELECT full_name INTO v_receiver_name FROM profiles WHERE user_id = v_user_id;
  
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_invite.sender_id,
    'invite_accepted',
    'Invite Accepted! 💕',
    COALESCE(v_receiver_name, 'Someone') || ' accepted your invite!',
    jsonb_build_object('invite_id', v_invite.id, 'connection_id', v_connection_id, 'invite_type', v_invite.invite_type)
  );

  RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id);
END;
$$;

-- Create decline_invite RPC function
CREATE OR REPLACE FUNCTION public.decline_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_receiver_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invite FROM invites WHERE token = p_token FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('error', 'Invite not found');
  END IF;
  
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'Invite already ' || v_invite.status);
  END IF;

  UPDATE invites SET 
    status = 'declined',
    receiver_id = v_user_id,
    responded_at = now(),
    updated_at = now()
  WHERE id = v_invite.id;

  SELECT full_name INTO v_receiver_name FROM profiles WHERE user_id = v_user_id;
  
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_invite.sender_id,
    'invite_declined',
    'Invite Declined 💔',
    COALESCE(v_receiver_name, 'Someone') || ' declined your invite.',
    jsonb_build_object('invite_id', v_invite.id, 'invite_type', v_invite.invite_type)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
