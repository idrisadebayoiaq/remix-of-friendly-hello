import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, MapPin, UserPlus, Ban, Flag, UserCheck } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { toast } from 'sonner';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getHeartsReceived,
} from '@/lib/follows';
import ProfilePostsGrid from '@/components/profile/ProfilePostsGrid';

const statusLabels: Record<string, string> = {
  single: '💚 Single',
  talking_stage: '💛 Talking Stage',
  dating: '💜 Dating',
  engaged: '💍 Engaged',
  married: '💕 Married',
};

const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; connectionId?: string } | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [heartsCount, setHeartsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!prof) {
      setLoading(false);
      return;
    }
    setProfile(prof);

    const [{ data: userPosts }, counts, hearts] = await Promise.all([
      supabase
        .from('community_posts')
        .select('id, content, image_url, video_url, media_type, thumbnail_url, likes_count, created_at')
        .eq('user_id', prof.user_id)
        .eq('is_deleted', false)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(60),
      getFollowCounts(prof.user_id),
      getHeartsReceived(prof.user_id),
    ]);
    setPosts(userPosts || []);
    setFollowingCount(counts.following);
    setFollowersCount(counts.followers);
    setHeartsCount(hearts);

    if (user && prof.user_id !== user.id) {
      const [{ data: conn }, alreadyFollowing] = await Promise.all([
        supabase
          .from('connections')
          .select('id, status')
          .or(
            `and(user1_id.eq.${user.id},user2_id.eq.${prof.user_id}),and(user1_id.eq.${prof.user_id},user2_id.eq.${user.id})`,
          )
          .not('status', 'in', '("ended","blocked")')
          .maybeSingle(),
        isFollowing(user.id, prof.user_id),
      ]);
      setConnectionStatus(conn ? { connected: true, connectionId: conn.id } : { connected: false });
      setFollowing(alreadyFollowing);
    }
    setLoading(false);
  }, [username, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user && profile && user.id === profile.user_id) {
      navigate('/you', { replace: true });
    }
  }, [user, profile, navigate]);

  const sendRequest = async () => {
    if (!profile || !user) return;
    if (connectionStatus?.connected) {
      if (connectionStatus.connectionId) navigate(`/connection/${connectionStatus.connectionId}`);
      return;
    }
    const { data: existing } = await supabase
      .from('connection_requests')
      .select('id')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},receiver_id.eq.${user.id})`,
      )
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) {
      toast.info('Request already pending');
      return;
    }
    const { error } = await supabase
      .from('connection_requests')
      .insert({ sender_id: user.id, receiver_id: profile.user_id });
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        type: 'connection_request',
        title: 'New Connection Request 💕',
        message: 'Someone wants to connect!',
        data: { sender_id: user.id },
      });
      toast.success('Request sent');
    } else {
      toast.error(error.code === '23505' ? 'Request already sent' : 'Failed to send request');
    }
  };

  const toggleFollow = async () => {
    if (!profile || !user) return;
    setFollowBusy(true);
    if (following) {
      const { error } = await unfollowUser(user.id, profile.user_id);
      if (error) toast.error(error);
      else {
        setFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      }
    } else {
      const { error } = await followUser(user.id, profile.user_id, myProfile?.full_name || undefined);
      if (error) toast.error(error);
      else {
        setFollowing(true);
        setFollowersCount((c) => c + 1);
        toast.success('Following');
      }
    }
    setFollowBusy(false);
  };

  const blockUser = async () => {
    if (!profile || !user) return;
    await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: profile.user_id });
    toast.success('User blocked');
    navigate(-1);
  };

  const reportUser = async () => {
    if (!profile || !user) return;
    await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: profile.user_id,
      reason: 'inappropriate_profile',
      details: `Profile: ${profile.username}`,
    });
    toast.success('Report submitted');
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-4 text-center text-muted-foreground">User not found</div>;

  const isOwnProfile = user?.id === profile.user_id;

  return (
    <div className="pb-4">
      <div className="px-4 pt-2">
        <BackHeader title={`@${profile.username}`} />
      </div>

      <div className="px-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-[88px] h-[88px] rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden lovli-gradient text-primary-foreground text-3xl font-bold shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile.full_name?.[0] || '?'
            )}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{followersCount}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{heartsCount}</p>
              <p className="text-[10px] text-muted-foreground">Hearts</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-bold text-base leading-tight">{profile.full_name}</p>
          {profile.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>}
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {statusLabels[profile.relationship_status] || '💚 Single'}
            </Badge>
            {(profile.city || profile.country) && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                <MapPin size={10} className="mr-0.5" />
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </Badge>
            )}
          </div>
          {profile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {profile.interests.map((i: string) => (
                <Badge key={i} variant="secondary" className="text-[10px] rounded-full">
                  {i}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {!isOwnProfile && user && (
          <div className="flex gap-2">
            <Button
              variant={following ? 'outline' : 'secondary'}
              className="flex-1 rounded-xl font-semibold"
              disabled={followBusy}
              onClick={toggleFollow}
            >
              {following ? (
                <>
                  <UserCheck size={14} className="mr-1" /> Following
                </>
              ) : (
                'Follow'
              )}
            </Button>
            {connectionStatus?.connected ? (
              <Button
                className="flex-1 rounded-xl lovli-gradient text-primary-foreground font-semibold"
                onClick={() => navigate(`/connection/${connectionStatus.connectionId}`)}
              >
                <MessageCircle size={14} className="mr-1" /> Message
              </Button>
            ) : (
              <Button
                className="flex-1 rounded-xl lovli-gradient text-primary-foreground font-semibold"
                onClick={sendRequest}
              >
                <UserPlus size={14} className="mr-1" /> Connect
              </Button>
            )}
            <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={reportUser}>
              <Flag size={14} />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={blockUser}>
              <Ban size={14} className="text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 border-t">
        <p className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Posts</p>
        <ProfilePostsGrid posts={posts} emptyLabel="No Discover posts yet" />
      </div>
    </div>
  );
};

export default PublicProfilePage;
