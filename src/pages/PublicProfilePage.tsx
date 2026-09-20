import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, MapPin, UserPlus, Ban, Flag, Check } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  single: '💚 Single', talking_stage: '💛 Talking Stage', dating: '💜 Dating', engaged: '💍 Engaged', married: '💕 Married',
};

const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; connectionId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!username) return;
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!prof) { setLoading(false); return; }
    setProfile(prof);

    // Posts
    const { data: userPosts, count } = await supabase.from('community_posts').select('*', { count: 'exact' }).eq('user_id', prof.user_id).eq('is_deleted', false).eq('is_flagged', false).order('created_at', { ascending: false }).limit(5);
    setPosts(userPosts || []);
    setTotalPosts(count || 0);

    // Connection status
    if (user && prof.user_id !== user.id) {
      const { data: conn } = await supabase.from('connections').select('id, status')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${prof.user_id}),and(user1_id.eq.${prof.user_id},user2_id.eq.${user.id})`)
        .not('status', 'in', '("ended","blocked")').maybeSingle();
      setConnectionStatus(conn ? { connected: true, connectionId: conn.id } : { connected: false });
    }
    setLoading(false);
  }, [username, user]);

  useEffect(() => { load(); }, [load]);

  const sendRequest = async () => {
    if (!profile || !user) return;
    const { data: existing } = await supabase.from('connection_requests').select('id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},receiver_id.eq.${user.id})`)
      .eq('status', 'pending').maybeSingle();
    if (existing) { toast.info('Request already pending'); return; }
    const { error } = await supabase.from('connection_requests').insert({ sender_id: user.id, receiver_id: profile.user_id });
    if (!error) {
      await supabase.from('notifications').insert({ user_id: profile.user_id, type: 'connection_request', title: 'New Connection Request 💕', message: 'Someone wants to connect!', data: { sender_id: user.id } });
      toast.success('Request sent! 💕');
    }
  };

  const blockUser = async () => {
    if (!profile || !user) return;
    await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: profile.user_id });
    toast.success('User blocked');
    navigate(-1);
  };

  const reportUser = async () => {
    if (!profile || !user) return;
    await supabase.from('reports').insert({ reporter_id: user.id, reported_user_id: profile.user_id, reason: 'inappropriate_profile', details: `Profile: ${profile.username}` });
    toast.success('Report submitted 🛡️');
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-4 text-center text-muted-foreground">User not found</div>;

  const isOwnProfile = user?.id === profile.user_id;

  return (
    <div className="p-4 space-y-4">
      <BackHeader title={`@${profile.username}`} />

      <Card className="shadow-md border-0 overflow-hidden">
        <div className="h-20 lovli-gradient" />
        <CardContent className="p-4 -mt-10">
          <div className="flex items-end gap-3 mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden lovli-gradient text-primary-foreground text-xl font-bold">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile.full_name?.[0] || '?'}
            </div>
            <div className="flex-1 pt-8">
              <p className="font-bold">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {profile.bio && <p className="text-sm text-muted-foreground mb-2">{profile.bio}</p>}

          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="secondary" className="rounded-full">{statusLabels[profile.relationship_status] || '💚 Single'}</Badge>
            {(profile.city || profile.country) && (
              <Badge variant="outline" className="rounded-full"><MapPin size={10} className="mr-0.5" /> {[profile.city, profile.country].filter(Boolean).join(', ')}</Badge>
            )}
          </div>

          {profile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {profile.interests.map((i: string) => <Badge key={i} variant="secondary" className="text-[10px] rounded-full">{i}</Badge>)}
            </div>
          )}

          {!isOwnProfile && (
            <div className="flex gap-2">
              {connectionStatus?.connected ? (
                <Button className="flex-1 rounded-2xl lovli-gradient text-primary-foreground" onClick={() => navigate(`/connection/${connectionStatus.connectionId}`)}>
                  <MessageCircle size={14} className="mr-1" /> Open Chat
                </Button>
              ) : (
                <Button className="flex-1 rounded-2xl lovli-gradient text-primary-foreground" onClick={sendRequest}>
                  <UserPlus size={14} className="mr-1" /> Connect
                </Button>
              )}
              <Button variant="outline" size="icon" className="rounded-xl" onClick={reportUser}><Flag size={14} /></Button>
              <Button variant="outline" size="icon" className="rounded-xl" onClick={blockUser}><Ban size={14} className="text-destructive" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Posts ({totalPosts})</h2>
        {posts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">No posts yet</p>
        ) : (
          <>
            {posts.map(p => (
              <Card key={p.id} className="shadow-sm cursor-pointer" onClick={() => navigate(`/post/${p.id}`)}>
                <CardContent className="p-3">
                  <p className="text-sm line-clamp-3">{p.content}</p>
                  {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-[120px] object-cover rounded-xl mt-2" />}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Heart size={10} /> {p.likes_count || 0}
                    <MessageCircle size={10} /> {p.comments_count || 0}
                    <span className="ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {totalPosts > 5 && (
              <Button variant="outline" className="w-full rounded-2xl" onClick={() => navigate(`/u/${profile.username}/posts`)}>
                See all posts ({totalPosts})
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
