
-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for memories
INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Memory storage policies
CREATE POLICY "Memory images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'memories');

CREATE POLICY "Connected users can upload memories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'memories' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own memory uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'memories' AND auth.uid()::text = (storage.foldername(name))[1]);
