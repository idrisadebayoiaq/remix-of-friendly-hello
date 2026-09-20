
-- 1) daily_prompts table
CREATE TABLE public.daily_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text text NOT NULL,
  prompt_type text NOT NULL DEFAULT 'self' CHECK (prompt_type IN ('self', 'couple')),
  for_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prompts" ON public.daily_prompts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can insert prompts" ON public.daily_prompts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE UNIQUE INDEX idx_daily_prompts_date_type ON public.daily_prompts (for_date, prompt_type);

-- 2) daily_prompt_responses table
CREATE TABLE public.daily_prompt_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid REFERENCES public.connections(id),
  prompt_id uuid NOT NULL REFERENCES public.daily_prompts(id),
  response_text text NOT NULL,
  sent_to_partner boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_prompt_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own responses" ON public.daily_prompt_responses FOR SELECT
  USING (
    user_id = auth.uid()
    OR (sent_to_partner = true AND connection_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM connections WHERE connections.id = daily_prompt_responses.connection_id
      AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
    ))
  );
CREATE POLICY "Users can insert own responses" ON public.daily_prompt_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3) connection_timeline_events table
CREATE TABLE public.connection_timeline_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.connections(id),
  event_type text NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.connection_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view timeline" ON public.connection_timeline_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM connections WHERE connections.id = connection_timeline_events.connection_id
    AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
  ));
CREATE POLICY "Participants can insert timeline events" ON public.connection_timeline_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM connections WHERE connections.id = connection_timeline_events.connection_id
    AND (connections.user1_id = auth.uid() OR connections.user2_id = auth.uid())
  ));

-- 4) safety_tips table
CREATE TABLE public.safety_tips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tip_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.safety_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read tips" ON public.safety_tips FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed 30 safety tips
INSERT INTO public.safety_tips (tip_text) VALUES
('🛡️ Always meet in a public place for the first few dates.'),
('📱 Tell a trusted friend or family member where you are going.'),
('🚫 Never send money to someone you haven''t met in person.'),
('👂 Trust your instincts — if something feels off, leave.'),
('📍 Share your live location with a friend when going on dates.'),
('🔒 Keep personal info like your home address private initially.'),
('🚗 Use your own transportation for first dates.'),
('📞 Have a friend call you 30 minutes in as a safety check.'),
('🍷 Watch your drinks and never leave them unattended.'),
('💳 Don''t share financial details early in a relationship.'),
('📸 Video call before meeting in person to verify identity.'),
('⏰ Set time limits for first dates — coffee dates are great.'),
('🚨 Save emergency numbers easily accessible on your phone.'),
('🏠 Don''t invite someone to your home until you trust them.'),
('👀 Check if their social media profiles seem genuine.'),
('📝 Screen your matches — inconsistencies are red flags.'),
('🤝 Respect boundaries — yours and theirs.'),
('💬 If they pressure you to move off the platform, be cautious.'),
('🧳 Pack essentials: phone charger, cash, and ID for dates.'),
('🚶 Have an exit plan if you feel uncomfortable.'),
('🔔 Enable notification sharing with a trusted contact.'),
('🎭 Watch for love-bombing — too much too soon is a red flag.'),
('🗣️ Communicate your comfort levels clearly.'),
('📵 Don''t share intimate photos with someone you just met.'),
('🏥 Know the location of nearby hospitals or police stations.'),
('🤔 If they avoid answering basic questions, be wary.'),
('💪 Trust is earned over time, not given instantly.'),
('🔍 Google their name — basic research is smart, not paranoid.'),
('❤️ A healthy relationship respects your independence.'),
('🌟 You deserve to feel safe — never compromise on that.');

-- 5) Add date_safety_mode to user_settings
ALTER TABLE public.user_settings ADD COLUMN date_safety_mode boolean DEFAULT true;
