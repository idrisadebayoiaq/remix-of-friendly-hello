import { supabase } from '@/integrations/supabase/client';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notificationTypes';

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  return (data || []).map((r: any) => r.following_id);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

export async function getFollowCounts(userId: string): Promise<{ following: number; followers: number }> {
  const [{ count: following }, { count: followers }] = await Promise.all([
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
  ]);
  return { following: following || 0, followers: followers || 0 };
}

/** Total hearts received on Discover posts (sum of likes_count). */
export async function getHeartsReceived(userId: string): Promise<number> {
  const { data } = await supabase
    .from('community_posts')
    .select('likes_count')
    .eq('user_id', userId)
    .eq('is_deleted', false);
  return (data || []).reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
}

export async function followUser(
  followerId: string,
  followingId: string,
  followerName?: string,
): Promise<{ error?: string }> {
  if (followerId === followingId) return { error: 'Cannot follow yourself' };
  const { error } = await supabase.from('user_follows').insert({
    follower_id: followerId,
    following_id: followingId,
  } as any);
  if (error) {
    if (error.code === '23505') return {};
    return { error: error.message };
  }
  await createNotification({
    userId: followingId,
    type: NOTIFICATION_TYPES.new_follow,
    title: 'New follower',
    message: `${followerName || 'Someone'} started following you`,
    actorId: followerId,
    data: { url: '/you' },
  });
  return {};
}

export async function unfollowUser(followerId: string, followingId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) return { error: error.message };
  return {};
}
