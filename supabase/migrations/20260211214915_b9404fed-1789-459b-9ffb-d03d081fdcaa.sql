
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create relationship status enum
CREATE TYPE public.relationship_status AS ENUM ('single', 'talking_stage', 'dating', 'engaged', 'married');

-- Create invite type enum
CREATE TYPE public.invite_type AS ENUM ('be_my_valentine', 'date_proposal', 'anniversary_surprise', 'custom_message');

-- Create invite status enum
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create connection request status enum
CREATE TYPE public.connection_request_status AS ENUM ('pending', 'accepted', 'declined');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  relationship_status relationship_status DEFAULT 'single',
  love_language TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  profile_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Invites table
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_email TEXT NOT NULL,
  receiver_name TEXT NOT NULL DEFAULT '',
  receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_type invite_type NOT NULL,
  message TEXT DEFAULT '',
  target_date DATE,
  token TEXT UNIQUE NOT NULL,
  status invite_status DEFAULT 'pending' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Connections table
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_invite_id UUID REFERENCES public.invites(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user1_id, user2_id)
);

-- Connection messages (shared wall + chat)
CREATE TABLE public.connection_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Community posts
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Community post likes
CREATE TABLE public.community_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id)
);

-- Connection requests (from discover)
CREATE TABLE public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status connection_request_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- Memories
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Daily questions
CREATE TABLE public.daily_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Daily question answers
CREATE TABLE public.daily_question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.daily_questions(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(question_id, connection_id, user_id)
);

-- Surprise messages
CREATE TABLE public.surprise_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  unlock_at TIMESTAMPTZ NOT NULL,
  is_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Quiz results
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_type TEXT NOT NULL,
  inputs JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Blocked users
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

-- User settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  invite_notifications BOOLEAN DEFAULT true,
  daily_question_notifications BOOLEAN DEFAULT true,
  profile_visibility BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Support chats
CREATE TABLE public.support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reminders
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  remind_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surprise_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if two users are connected
CREATE OR REPLACE FUNCTION public.are_connected(_user1 UUID, _user2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE (user1_id = _user1 AND user2_id = _user2)
       OR (user1_id = _user2 AND user2_id = _user1)
  )
$$;

-- Helper: check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(_user1 UUID, _user2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = _user1 AND blocked_id = _user2)
       OR (blocker_id = _user2 AND blocked_id = _user1)
  )
$$;

-- RLS Policies

-- Profiles: public read (if visible), own write
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (profile_visible = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User roles: own read, admin manage
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Invites: sender and receiver can see their invites
CREATE POLICY "Users can view their invites" ON public.invites
  FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR receiver_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create invites" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update invites they're involved in" ON public.invites
  FOR UPDATE TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Connections: both users can see
CREATE POLICY "Users can view their connections" ON public.connections
  FOR SELECT TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Authenticated users can create connections" ON public.connections
  FOR INSERT TO authenticated WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- Connection messages: only connected users
CREATE POLICY "Connected users can view messages" ON public.connection_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

CREATE POLICY "Connected users can send messages" ON public.connection_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

CREATE POLICY "Users can soft delete own messages" ON public.connection_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid());

-- Community posts: all can read, own can write
CREATE POLICY "Anyone can view community posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create posts" ON public.community_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Community post likes
CREATE POLICY "Anyone can view likes" ON public.community_post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like posts" ON public.community_post_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts" ON public.community_post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Connection requests
CREATE POLICY "Users can view their connection requests" ON public.connection_requests
  FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send connection requests" ON public.connection_requests
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update received requests" ON public.connection_requests
  FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- Memories: connected users only
CREATE POLICY "Connected users can view memories" ON public.memories
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

CREATE POLICY "Connected users can add memories" ON public.memories
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

-- Daily questions: all authenticated can read
CREATE POLICY "Anyone can view daily questions" ON public.daily_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage questions" ON public.daily_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Daily question answers: connected users
CREATE POLICY "Connected users can view answers" ON public.daily_question_answers
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

CREATE POLICY "Users can submit answers" ON public.daily_question_answers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Surprise messages: connected users
CREATE POLICY "Connected users can view unlocked surprises" ON public.surprise_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
    AND (is_unlocked = true OR sender_id = auth.uid())
  );

CREATE POLICY "Connected users can create surprises" ON public.surprise_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.connections WHERE id = connection_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  );

-- Quiz results: own only
CREATE POLICY "Users can view own quiz results" ON public.quiz_results
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create quiz results" ON public.quiz_results
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Reports: own or admin
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Blocked users: own blocks
CREATE POLICY "Users can view own blocks" ON public.blocked_users
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others" ON public.blocked_users
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- User settings: own only
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own settings" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Support chats: own or admin
CREATE POLICY "Users can view own support chats" ON public.support_chats
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create support messages" ON public.support_chats
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Reminders: own only
CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create reminders" ON public.reminders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders" ON public.reminders
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON public.invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_connection_requests_updated_at BEFORE UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some daily questions
INSERT INTO public.daily_questions (question, category) VALUES
  ('What is one thing you love most about your partner?', 'appreciation'),
  ('What is your favorite memory together?', 'memories'),
  ('If you could go anywhere together, where would it be?', 'dreams'),
  ('What song reminds you of your relationship?', 'fun'),
  ('What is something new you want to try together?', 'growth'),
  ('How do you feel most loved?', 'love_language'),
  ('What is your partner''s best quality?', 'appreciation'),
  ('Describe your perfect date night.', 'planning'),
  ('What makes you laugh together the most?', 'fun'),
  ('What are you most grateful for in your relationship?', 'gratitude');

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_messages;
