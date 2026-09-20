import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion } from 'framer-motion';

const UserPostsPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!username) return;
    const { data: prof } = await supabase.from('profiles').select('user_id, full_name').eq('username', username).single();
    if (!prof) { setLoading(false); return; }
    setProfileName(prof.full_name);
    const { data } = await supabase.from('community_posts').select('*').eq('user_id', prof.user_id).eq('is_deleted', false).eq('is_flagged', false).order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }, [username]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <BackHeader title={`Posts by ${profileName || `@${username}`}`} />

      {posts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No posts</p>}

      {posts.map(p => (
        <Card key={p.id} className="shadow-sm cursor-pointer" onClick={() => navigate(`/post/${p.id}`)}>
          <CardContent className="p-3">
            <p className="text-sm">{p.content}</p>
            {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-[150px] object-cover rounded-xl mt-2" />}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Heart size={10} /> {p.likes_count || 0}
              <MessageCircle size={10} /> {p.comments_count || 0}
              <span className="ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserPostsPage;
