-- Seed 30+ romantic daily questions
INSERT INTO public.daily_questions (question, category) VALUES
('What was your first impression of me?', 'romance'),
('What is your favorite memory of us together?', 'romance'),
('What is one thing I do that always makes you smile?', 'appreciation'),
('If we could travel anywhere tomorrow, where would we go?', 'fun'),
('What is the most romantic thing anyone has ever done for you?', 'romance'),
('What does your ideal date night look like?', 'planning'),
('What is a quality you admire most in me?', 'appreciation'),
('What song always reminds you of us?', 'fun'),
('If we had a whole day with no responsibilities, how would we spend it?', 'fun'),
('What is one dream you hope we can achieve together?', 'future'),
('What do you value most in our relationship?', 'deep'),
('How have I changed your life for the better?', 'appreciation'),
('What is your favorite physical feature of mine?', 'romance'),
('What is a small gesture that makes you feel loved?', 'love_language'),
('If you could describe our love in one word, what would it be?', 'romance'),
('What is one hobby you want us to try together?', 'fun'),
('What was the moment you knew you had feelings for me?', 'romance'),
('What is something you want to learn more about me?', 'deep'),
('How do you like to be comforted when you are having a bad day?', 'care'),
('What is the best piece of relationship advice you have ever received?', 'wisdom'),
('What are three things you are grateful for today?', 'gratitude'),
('What is your favorite way to spend a rainy day together?', 'fun'),
('If we were characters in a movie, which movie would it be?', 'fun'),
('What is a goal you have for us this year?', 'future'),
('What is your favorite thing about our daily routine?', 'appreciation'),
('What makes you feel most connected to me?', 'deep'),
('What is one thing you are looking forward to in our future?', 'future'),
('If you could go back in time to our first date, would you change anything?', 'romance'),
('What is a compliment you have been meaning to give me?', 'appreciation'),
('How do you define "love"?', 'deep'),
('What is your favorite thing to do for me?', 'care'),
('What is one surprise you would love to wake up to?', 'romance');

-- Assign admin role to febidris753@gmail.com
-- First, find the user_id for this email from profiles (since we can't query auth.users directly easily)
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    SELECT user_id INTO target_user_id FROM public.profiles WHERE email = 'febidris753@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Insert into user_roles if not exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
