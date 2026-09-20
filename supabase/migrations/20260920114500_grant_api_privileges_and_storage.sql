-- Fix missing API privileges that caused "permission denied for table profiles"
-- and harden storage bucket policies for avatars/media upserts.

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Memories
DROP POLICY IF EXISTS "Connected users can upload memories" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload memories" ON storage.objects;
CREATE POLICY "Authenticated users can upload memories"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own memory uploads" ON storage.objects;
CREATE POLICY "Users can update own memory uploads"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Post images / videos / voice
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own post images" ON storage.objects;
CREATE POLICY "Users can update own post images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can upload post videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload post videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own post videos" ON storage.objects;
CREATE POLICY "Users can update own post videos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'post-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own voice messages" ON storage.objects;
CREATE POLICY "Users can update own voice messages"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);
