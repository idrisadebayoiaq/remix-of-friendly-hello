import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Compass, Heart, UserPlus, Search, Send, MessageCircle, Image, Flag, X, Plus, MoreHorizontal, Pencil, Trash2, Share2, Reply, SmilePlus, Check, Video, Volume2, VolumeX, Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import FullScreenImageViewer from '@/components/FullScreenImageViewer';

const CATEGORIES = ['All', 'Love Thoughts', 'Hobbies', 'Open Talk', 'Faith', 'Lifestyle', 'Other'];
const REACTIONS = ['❤️', '😍', '😂', '😮', '😢', '😡'];
const BLOCKED_WORDS = ['sex', 'nude', 'naked', 'porn', 'xxx', 'f*ck', 'dick', 'pussy', 'cock', 'horny', 'slut', 'whore'];
const INTEREST_OPTIONS = ['Music', 'Travel', 'Cooking', 'Fitness', 'Reading', 'Art', 'Gaming', 'Movies', 'Fashion', 'Photography', 'Dancing', 'Sports', 'Nature', 'Technology', 'Spirituality'];

const statusLabels: Record<string, string> = {
  single: '💚 Single', talking_stage: '💛 Talking', dating: '💜 Dating', engaged: '💍 Engaged', married: '💕 Married',
};

const containsBlockedContent = (text: string) => BLOCKED_WORDS.some(w => text.toLowerCase().includes(w));

const DiscoverPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState('Other');
  const [searchFilter, setSearchFilter] = useState('');
  const [videoSearchFilter, setVideoSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [discoverTab, setDiscoverTab] = useState('posts');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [postMenu, setPostMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { connected: boolean; connectionId?: string }>>({});
  const [fullScreenImage, setFullScreenImage] = useState<{ src: string; postId: string; liked: boolean; likeCount: number; commentCount: number; ownerId: string } | null>(null);

  // Video feed state
  const [videoPosts, setVideoPosts] = useState<any[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [videoMuted, setVideoMuted] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const checkConnectionStatus = useCallback(async (userIds: string[]) => {
    if (!user) return;
    const uniqueIds = [...new Set(userIds.filter(id => id !== user.id && !connectionStatus[id]))];
    if (uniqueIds.length === 0) return;
    const results: Record<string, { connected: boolean; connectionId?: string }> = {};
    for (const otherId of uniqueIds) {
      const { data: conn } = await supabase.from('connections').select('id, status')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${user.id})`)
        .not('status', 'in', '("ended","blocked")')
        .maybeSingle();
      results[otherId] = conn ? { connected: true, connectionId: conn.id } : { connected: false };
    }
    setConnectionStatus(prev => ({ ...prev, ...results }));
  }, [user, connectionStatus]);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase.from('community_posts').select('*').eq('is_deleted', false).eq('is_flagged', false).order('created_at', { ascending: false }).limit(100);
    const enriched = await Promise.all((data || []).map(async (post) => {
      const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url, relationship_status').eq('user_id', post.user_id).single();
      const { data: reactions } = await supabase.from('post_reactions').select('*').eq('post_id', post.id);
      const { count: likeCount } = await supabase.from('community_post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
      const { data: myLike } = await supabase.from('community_post_likes').select('id').eq('post_id', post.id).eq('user_id', user!.id).maybeSingle();
      const { count: commentCount } = await supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id).eq('is_deleted', false);
      return { ...post, profiles: profile, reactions: reactions || [], like_count: likeCount || 0, my_like: myLike, comments_count: commentCount || 0 };
    }));
    setPosts(enriched);
    setVideoPosts(enriched.filter(p => (p as any).media_type === 'video' && (p as any).video_url));
    const authorIds = enriched.map(p => p.user_id);
    checkConnectionStatus(authorIds);
  }, [user, checkConnectionStatus]);

  useEffect(() => { if (user) loadPosts(); }, [user, loadPosts]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('discover-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, () => loadPosts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, () => loadPosts())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_posts' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_likes' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_shares' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
        if (commentingOn) loadComments(commentingOn);
        loadPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadPosts, commentingOn]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG, WEBP allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) { toast.error('Only MP4, WebM, MOV allowed'); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error('Max 25MB'); return; }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > 40) { toast.error('Max 40 seconds'); return; }
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setSelectedImage(null);
      setImagePreview(null);
    };
    video.src = URL.createObjectURL(file);
  };

  const handlePost = async () => {
    if (!newPost.trim() && !selectedImage && !selectedVideo) return;
    if (newPost.length > 500) { toast.error('Max 500 characters'); return; }
    if (newPost.trim() && containsBlockedContent(newPost)) { toast.error('⚠️ Post contains inappropriate content.'); return; }
    setPosting(true);

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let mediaType = selectedVideo ? 'video' : selectedImage ? 'image' : 'text';
    let videoDuration: number | null = null;

    if (selectedImage) {
      const ext = selectedImage.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('post-images').upload(path, selectedImage, {
        contentType: selectedImage.type,
      });
      if (upErr) { toast.error('Image upload failed'); setPosting(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path);
      imageUrl = publicUrl;
      mediaType = 'image';
    } else if (selectedVideo) {
      const ext = selectedVideo.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('post-videos').upload(path, selectedVideo, {
        contentType: selectedVideo.type,
      });
      if (upErr) { toast.error('Video upload failed'); setPosting(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('post-videos').getPublicUrl(path);
      videoUrl = publicUrl;
      mediaType = 'video';
      const vid = document.createElement('video');
      const objectUrl = URL.createObjectURL(selectedVideo);
      vid.src = objectUrl;
      await new Promise<void>(r => { vid.onloadedmetadata = () => { videoDuration = Math.round(vid.duration); URL.revokeObjectURL(objectUrl); r(); }; });
    }

    const { error } = await supabase.from('community_posts').insert({
      user_id: user!.id, content: newPost.trim() || '', tags: selectedTags, category,
      image_url: imageUrl, video_url: videoUrl, media_type: mediaType, video_duration: videoDuration,
    } as any);

    if (!error) {
      setNewPost(''); setSelectedTags([]); setSelectedImage(null); setImagePreview(null); setSelectedVideo(null); setVideoPreview(null); setCategory('Other'); setShowCreatePost(false);
      loadPosts();
      toast.success('Posted! 🎉');
    } else toast.error('Failed to post');
    setPosting(false);
  };

  const handleLike = async (postId: string, hasLiked: boolean, postOwnerId: string) => {
    // Optimistic update for both posts and videoPosts
    const updateLike = (prev: any[]) => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, like_count: hasLiked ? p.like_count - 1 : p.like_count + 1, my_like: hasLiked ? null : { id: 'temp' } };
    });
    setPosts(updateLike);
    setVideoPosts(updateLike);

    if (hasLiked) {
      await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', user!.id);
    } else {
      await supabase.from('community_post_likes').insert({ post_id: postId, user_id: user!.id });
      if (postOwnerId !== user!.id) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId, actor_id: user!.id, type: 'post_liked',
          title: 'Someone liked your post ❤️',
          message: 'Your post got a new like!',
          data: { post_id: postId },
        } as any);
      }
    }
  };

  const handleReaction = async (postId: string, emoji: string, postOwnerId?: string) => {
    const { data: existing } = await supabase.from('post_reactions').select('*').eq('post_id', postId).eq('user_id', user!.id).maybeSingle();
    if (existing) {
      if (existing.reaction_type === emoji) {
        await supabase.from('post_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('post_reactions').update({ reaction_type: emoji, updated_at: new Date().toISOString() } as any).eq('id', existing.id);
      }
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: user!.id, reaction_type: emoji } as any);
      if (postOwnerId && postOwnerId !== user!.id) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId, actor_id: user!.id, type: 'post_reacted',
          title: `Someone reacted ${emoji} to your post`,
          message: 'Your post got a new reaction!',
          data: { post_id: postId },
        } as any);
      }
    }
    setShowReactions(null);
  };

  const deletePost = async (postId: string) => {
    await supabase.from('community_posts').update({ is_deleted: true } as any).eq('id', postId);
    toast.success('Post deleted');
    setPostMenu(null);
  };

  const saveEditPost = async (postId: string) => {
    if (containsBlockedContent(editPostText)) { toast.error('⚠️ Contains inappropriate content.'); return; }
    await supabase.from('community_posts').update({ content: editPostText.trim() } as any).eq('id', postId);
    setEditingPost(null);
    toast.success('Post updated');
  };

  const sendConnectionRequest = async (receiverId: string) => {
    const status = connectionStatus[receiverId];
    if (status?.connected) {
      toast.info('Already connected!');
      if (status.connectionId) navigate(`/connection/${status.connectionId}`);
      return;
    }
    
    const { data: existingReq } = await supabase.from('connection_requests').select('id')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user!.id})`)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (existingReq) {
      toast.info('Request already pending');
      return;
    }

    const { error } = await supabase.from('connection_requests').insert({ sender_id: user!.id, receiver_id: receiverId });
    if (error) toast.error(error.code === '23505' ? 'Request already sent' : 'Failed');
    else {
      await supabase.from('notifications').insert({ user_id: receiverId, type: 'connection_request', title: 'New Connection Request 💕', message: 'Someone wants to connect!', data: { sender_id: user!.id } });
      toast.success('Connection request sent! 💕');
    }
  };

  const loadComments = async (postId: string) => {
    const { data: rawComments } = await supabase.from('post_comments').select('*').eq('post_id', postId).eq('is_flagged', false).order('created_at', { ascending: true });
    const enriched = await Promise.all((rawComments || []).map(async (c: any) => {
      const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', c.user_id).single();
      const { data: reactions } = await supabase.from('comment_reactions').select('*').eq('comment_id', c.id);
      return { ...c, profiles: profile, reactions: reactions || [] };
    }));
    setComments(prev => ({ ...prev, [postId]: enriched }));
  };

  const submitComment = async (postId: string, postOwnerId: string) => {
    if (!commentText.trim()) return;
    if (containsBlockedContent(commentText)) { toast.error('⚠️ Inappropriate content.'); return; }
    
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
    setVideoPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
    
    await supabase.from('post_comments').insert({
      post_id: postId, user_id: user!.id, content: commentText.trim(), parent_comment_id: replyingTo,
    } as any);
    
    if (postOwnerId !== user!.id) {
      await supabase.from('notifications').insert({
        user_id: postOwnerId, actor_id: user!.id, type: replyingTo ? 'post_replied' : 'post_commented',
        title: replyingTo ? 'Someone replied to a comment 💬' : 'New comment on your post 💬',
        message: commentText.trim().substring(0, 80),
        data: { post_id: postId },
      } as any);
    }
    
    setCommentText(''); setReplyingTo(null);
    loadComments(postId);
  };

  const deleteComment = async (commentId: string, postId: string) => {
    await supabase.from('post_comments').update({ is_deleted: true, content: 'This comment was deleted' } as any).eq('id', commentId);
    loadComments(postId);
    toast.success('Comment deleted');
  };

  const saveEditComment = async (commentId: string, postId: string) => {
    if (containsBlockedContent(editCommentText)) { toast.error('⚠️ Inappropriate content.'); return; }
    await supabase.from('post_comments').update({ content: editCommentText.trim(), edited_at: new Date().toISOString() } as any).eq('id', commentId);
    setEditingComment(null);
    loadComments(postId);
    toast.success('Comment updated');
  };

  const reactToComment = async (commentId: string, emoji: string, postId: string) => {
    const { data: existing } = await supabase.from('comment_reactions').select('*').eq('comment_id', commentId).eq('user_id', user!.id).maybeSingle();
    if (existing) {
      if (existing.reaction_type === emoji) await supabase.from('comment_reactions').delete().eq('id', existing.id);
      else await supabase.from('comment_reactions').update({ reaction_type: emoji } as any).eq('id', existing.id);
    } else {
      await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: user!.id, reaction_type: emoji } as any);
    }
    loadComments(postId);
  };

  const sharePost = async (postId: string, postOwnerId: string) => {
    const url = `${window.location.origin}/post/${postId}`;

    const applyShareDelta = (items: any[], delta: number) => items.map(post => post.id === postId ? { ...post, shares_count: Math.max((post.shares_count || 0) + delta, 0) } : post);
    setPosts(prev => applyShareDelta(prev, 1));
    setVideoPosts(prev => applyShareDelta(prev, 1));

    const { error } = await supabase.from('post_shares').insert({ post_id: postId, user_id: user!.id } as any);
    if (error) {
      setPosts(prev => applyShareDelta(prev, -1));
      setVideoPosts(prev => applyShareDelta(prev, -1));
      toast.error(error.message || 'Unable to share this post');
      return;
    }
    
    if (postOwnerId !== user!.id) {
      await supabase.from('notifications').insert({
        user_id: postOwnerId, actor_id: user!.id, type: 'post_shared',
        title: 'Someone shared your post 🔗',
        message: 'Your post is being shared!',
        data: { post_id: postId },
      } as any);
    }
    
    if (navigator.share) {
      await navigator.share({ title: 'Lovli Post', url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const reportPost = async (postId: string, authorId: string) => {
    await supabase.from('reports').insert({ reporter_id: user!.id, reported_user_id: authorId, reason: 'inappropriate_post', details: `Post: ${postId}` });
    toast.success('Report submitted 🛡️');
    loadPosts();
  };

  const reportComment = async (commentId: string, authorId: string, postId: string) => {
    await supabase.from('reports').insert({ reporter_id: user!.id, reported_user_id: authorId, reason: 'inappropriate_comment', details: `Comment: ${commentId}` });
    toast.success('Comment reported 🛡️');
    loadComments(postId);
  };

  // SEPARATE: Posts feed only shows text/image, Videos feed only shows video
  const filteredPosts = posts.filter(p => {
    // Only text/image posts in Posts tab
    if ((p as any).media_type === 'video') return false;
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return p.content?.toLowerCase().includes(q) || p.profiles?.full_name?.toLowerCase().includes(q) || p.profiles?.username?.toLowerCase().includes(q) || p.tags?.some((t: string) => t.toLowerCase().includes(q));
  });

  const filteredVideos = videoPosts.filter(p => {
    if (!videoSearchFilter.trim()) return true;
    const q = videoSearchFilter.toLowerCase();
    return p.content?.toLowerCase().includes(q) || p.profiles?.full_name?.toLowerCase().includes(q) || p.profiles?.username?.toLowerCase().includes(q) || p.tags?.some((t: string) => t.toLowerCase().includes(q));
  });

  const getReactionSummary = (reactions: any[]) => {
    const counts: Record<string, number> = {};
    reactions.forEach(r => { counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  };

  const renderComments = (postId: string, postOwnerId: string, parentId: string | null = null, depth = 0) => {
    const all = comments[postId] || [];
    const filtered = all.filter(c => (c.parent_comment_id || null) === parentId);
    return filtered.map(c => (
      <div key={c.id} className={`space-y-1 ${depth > 0 ? 'ml-6 border-l-2 border-border pl-3' : ''}`}>
        <div className={`flex gap-2 text-xs ${c.is_deleted ? 'opacity-50' : ''}`}>
          <div className="w-5 h-5 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-[8px] font-bold overflow-hidden shrink-0 cursor-pointer"
            onClick={() => c.profiles?.username && navigate(`/u/${c.profiles.username}`)}>
            {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : c.profiles?.full_name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold cursor-pointer hover:underline" onClick={() => c.profiles?.username && navigate(`/u/${c.profiles.username}`)}>{c.profiles?.full_name}</span>
              {c.edited_at && <span className="text-muted-foreground text-[9px]">(edited)</span>}
            </div>
            {editingComment === c.id ? (
              <div className="flex gap-1 mt-1">
                <Input value={editCommentText} onChange={e => setEditCommentText(e.target.value)} className="rounded-xl text-xs h-7 flex-1" />
                <Button size="sm" className="h-7 text-[10px] rounded-xl" onClick={() => saveEditComment(c.id, postId)}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingComment(null)}>✕</Button>
              </div>
            ) : (
              <p className="text-muted-foreground">{c.content}</p>
            )}
            {!c.is_deleted && (
              <div className="flex items-center gap-2 mt-0.5">
                <button className="text-muted-foreground hover:text-primary text-[10px]" onClick={() => { setReplyingTo(c.id); }}>Reply</button>
                {REACTIONS.slice(0, 3).map(emoji => (
                  <button key={emoji} className="text-[10px] hover:scale-125 transition-transform" onClick={() => reactToComment(c.id, emoji, postId)}>{emoji}</button>
                ))}
                {c.user_id === user?.id && !c.is_deleted && (
                  <>
                    <button className="text-muted-foreground hover:text-primary text-[10px]" onClick={() => { setEditingComment(c.id); setEditCommentText(c.content); }}>Edit</button>
                    <button className="text-muted-foreground hover:text-destructive text-[10px]" onClick={() => deleteComment(c.id, postId)}>Delete</button>
                  </>
                )}
                {c.user_id !== user?.id && !c.is_deleted && (
                  <button className="text-muted-foreground hover:text-destructive text-[10px]" onClick={() => reportComment(c.id, c.user_id, postId)}>Report</button>
                )}
              </div>
            )}
            {c.reactions?.length > 0 && (
              <div className="flex gap-0.5 mt-0.5">{getReactionSummary(c.reactions).map(([emoji, count]) => (
                <span key={emoji} className="text-[10px] bg-muted px-1 rounded-full">{emoji}{count > 1 ? count : ''}</span>
              ))}</div>
            )}
          </div>
        </div>
        {renderComments(postId, postOwnerId, c.id, depth + 1)}
      </div>
    ));
  };

  const getConnectButton = (postUserId: string) => {
    const status = connectionStatus[postUserId];
    if (status?.connected) {
      return (
        <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs" onClick={() => navigate(`/connection/${status.connectionId}`)}>
          <Check size={12} className="mr-1" /> Connected
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs" onClick={() => sendConnectionRequest(postUserId)}>
        <UserPlus size={12} className="mr-1" /> Connect
      </Button>
    );
  };

  // Video Feed Item with full controls
  const VideoFeedItem = ({ post, isActive }: { post: any; isActive: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      if (!videoRef.current) return;
      if (isActive && !paused) {
        videoRef.current.play().catch(() => {
          // Autoplay blocked - require user interaction
          setPaused(true);
        });
      } else {
        videoRef.current.pause();
      }
    }, [isActive, paused]);

    // Reset state when becoming active
    useEffect(() => {
      if (isActive) {
        setPaused(false);
        setError(false);
      }
    }, [isActive]);

    const togglePlay = () => {
      if (!videoRef.current) return;
      if (error) {
        setError(false);
        setLoading(true);
        videoRef.current.load();
        videoRef.current.play().catch(() => setPaused(true));
        return;
      }
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setPaused(false);
      } else {
        videoRef.current.pause();
        setPaused(true);
      }
    };

    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center snap-start" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={(post as any).video_url}
          className="w-full h-full object-contain"
          loop
          muted={videoMuted}
          playsInline
          preload={isActive ? 'auto' : 'metadata'}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />

        {/* Loading spinner */}
        {loading && !error && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 size={40} className="text-white animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-4 text-center">
            <AlertCircle size={40} className="text-white mb-2" />
            <p className="text-white text-sm">Tap to retry</p>
            <a href={(post as any).video_url} target="_blank" rel="noreferrer" className="text-xs text-white underline underline-offset-4">
              Open video
            </a>
          </div>
        )}

        {/* Paused overlay */}
        {paused && !error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 rounded-full p-4">
              <Play size={40} className="text-white" />
            </div>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-16 left-4 right-16 text-white" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => post.profiles?.username && navigate(`/u/${post.profiles.username}`)}>
            <div className="w-8 h-8 rounded-full lovli-gradient flex items-center justify-center text-xs font-bold overflow-hidden">
              {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : post.profiles?.full_name?.[0] || '?'}
            </div>
            <span className="font-bold text-sm">{post.profiles?.full_name}</span>
          </div>
          <p className="text-sm line-clamp-2">{post.content}</p>
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {post.tags.map((t: string) => <span key={t} className="text-xs bg-white/20 px-1.5 rounded-full">#{t}</span>)}
            </div>
          )}
        </div>

        {/* Side actions */}
        <div className="absolute right-3 bottom-24 flex flex-col gap-4 items-center" onClick={e => e.stopPropagation()}>
          <button onClick={togglePlay} className="flex flex-col items-center">
            {paused ? <Play size={28} className="text-white" /> : <Pause size={28} className="text-white" />}
          </button>
          <button onClick={() => handleLike(post.id, !!post.my_like, post.user_id)} className="flex flex-col items-center">
            <Heart size={28} className={post.my_like ? 'text-red-500' : 'text-white'} fill={post.my_like ? 'currentColor' : 'none'} />
            <span className="text-white text-xs">{post.like_count}</span>
          </button>
          <button onClick={() => { setCommentingOn(post.id); loadComments(post.id); }} className="flex flex-col items-center">
            <MessageCircle size={28} className="text-white" />
            <span className="text-white text-xs">{post.comments_count || 0}</span>
          </button>
          <button onClick={() => sharePost(post.id, post.user_id)} className="flex flex-col items-center">
            <Share2 size={28} className="text-white" />
            <span className="text-white text-xs">{(post as any).shares_count || ''}</span>
          </button>
          <button onClick={() => setVideoMuted(prev => !prev)} className="flex flex-col items-center">
            {videoMuted ? <VolumeX size={24} className="text-white" /> : <Volume2 size={24} className="text-white" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {/* Full screen image viewer */}
      {fullScreenImage && (
        <FullScreenImageViewer
          src={fullScreenImage.src}
          onClose={() => setFullScreenImage(null)}
          onLike={() => handleLike(fullScreenImage.postId, fullScreenImage.liked, fullScreenImage.ownerId)}
          onComment={() => { setCommentingOn(fullScreenImage.postId); loadComments(fullScreenImage.postId); setFullScreenImage(null); }}
          onShare={() => sharePost(fullScreenImage.postId, fullScreenImage.ownerId)}
          liked={fullScreenImage.liked}
          likeCount={fullScreenImage.likeCount}
          commentCount={fullScreenImage.commentCount}
        />
      )}

      <div className="p-4 pb-0">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Compass className="text-primary" size={24} /> Discover</h1>
        </motion.div>

        <Tabs value={discoverTab} onValueChange={setDiscoverTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="posts" className="text-xs">📝 Posts</TabsTrigger>
            <TabsTrigger value="videos" className="text-xs">🎬 Videos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {discoverTab === 'posts' ? (
        <div className="p-4 pt-2 space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search posts, tags, users..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(c => (
                <Button key={c} size="sm" variant={categoryFilter === c ? 'default' : 'outline'}
                  className={`rounded-full text-[10px] h-7 shrink-0 ${categoryFilter === c ? 'lovli-gradient text-primary-foreground' : ''}`}
                  onClick={() => setCategoryFilter(c)}>{c}</Button>
              ))}
            </div>
          </div>

          <Card className="shadow-sm border-0 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCreatePost(true)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground"><Plus size={18} /></div>
              <p className="text-sm text-muted-foreground">Share something about yourself...</p>
            </CardContent>
          </Card>

          {/* Create Post Dialog */}
          <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
            <DialogContent className="max-w-[420px] rounded-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Textarea placeholder="What's on your mind? (max 500 chars)" value={newPost} onChange={e => setNewPost(e.target.value)} className="rounded-xl min-h-[80px]" maxLength={500} />
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{newPost.length}/500</span></div>

                <div className="flex flex-wrap gap-1">
                  {INTEREST_OPTIONS.map(tag => (
                    <Button key={tag} size="sm" variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className={`rounded-full text-[10px] h-6 ${selectedTags.includes(tag) ? 'lovli-gradient text-primary-foreground' : ''}`}
                      onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}>{tag}</Button>
                  ))}
                </div>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.filter(c => c !== 'All').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoSelect} />

                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-[200px] object-cover rounded-xl" />
                    <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={() => { setSelectedImage(null); setImagePreview(null); }}><X size={14} /></Button>
                  </div>
                ) : videoPreview ? (
                  <div className="relative">
                    <video src={videoPreview} className="w-full max-h-[200px] object-cover rounded-xl" controls />
                    <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={() => { setSelectedVideo(null); setVideoPreview(null); }}><X size={14} /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => fileInputRef.current?.click()}><Image size={14} className="mr-2" /> Photo</Button>
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => videoInputRef.current?.click()}><Video size={14} className="mr-2" /> Video (40s)</Button>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handlePost} disabled={posting || (!newPost.trim() && !selectedImage && !selectedVideo)} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
                  <Send size={14} className="mr-2" /> {posting ? 'Posting...' : 'Post'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Feed - only text/image posts */}
          <AnimatePresence>
            {filteredPosts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No posts yet. Be the first! ✨</p>}
            {filteredPosts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); if (post.profiles?.username) navigate(`/u/${post.profiles.username}`); }}>
                        {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : post.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold truncate cursor-pointer hover:underline"
                            onClick={(e) => { e.stopPropagation(); if (post.profiles?.username) navigate(`/u/${post.profiles.username}`); }}>
                            {post.profiles?.full_name || 'Anonymous'}
                          </p>
                          {post.profiles?.relationship_status && (
                            <Badge variant="secondary" className="text-[8px] rounded-full px-1.5 py-0 h-4">{statusLabels[post.profiles.relationship_status] || post.profiles.relationship_status}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">@{post.profiles?.username} · {new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {post.user_id === user?.id && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPostMenu(postMenu === post.id ? null : post.id)}><MoreHorizontal size={14} /></Button>
                        )}
                        {post.user_id !== user?.id && getConnectButton(post.user_id)}
                      </div>
                    </div>

                    {postMenu === post.id && post.user_id === user?.id && (
                      <div className="flex gap-1.5 bg-muted p-2 rounded-xl">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingPost(post.id); setEditPostText(post.content); setPostMenu(null); }}><Pencil size={12} className="mr-1" /> Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deletePost(post.id)}><Trash2 size={12} className="mr-1" /> Delete</Button>
                      </div>
                    )}

                    {post.category && post.category !== 'Other' && <Badge variant="outline" className="text-[9px] rounded-full">{post.category}</Badge>}

                    {editingPost === post.id ? (
                      <div className="space-y-2">
                        <Textarea value={editPostText} onChange={e => setEditPostText(e.target.value)} className="rounded-xl text-sm" maxLength={500} />
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-xl text-xs lovli-gradient text-primary-foreground" onClick={() => saveEditPost(post.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setEditingPost(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    )}

                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-full max-h-[300px] object-cover rounded-xl cursor-pointer"
                        onClick={() => setFullScreenImage({ src: post.image_url, postId: post.id, liked: !!post.my_like, likeCount: post.like_count, commentCount: post.comments_count, ownerId: post.user_id })}
                      />
                    )}

                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">{post.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px] rounded-full">{tag}</Badge>)}</div>
                    )}

                    {post.reactions?.length > 0 && (
                      <div className="flex gap-1">{getReactionSummary(post.reactions).map(([emoji, count]) => (
                        <span key={emoji} className="text-xs bg-muted px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-accent" onClick={() => handleReaction(post.id, emoji, post.user_id)}>{emoji} {count}</span>
                      ))}</div>
                    )}

                    <div className="flex items-center gap-1 pt-1">
                      <Button variant="ghost" size="sm" className={`h-7 text-xs rounded-xl ${post.my_like ? 'text-primary' : ''}`} onClick={() => handleLike(post.id, !!post.my_like, post.user_id)}>
                        <Heart size={12} className="mr-1" fill={post.my_like ? 'currentColor' : 'none'} /> {post.like_count}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs rounded-xl" onClick={() => setShowReactions(showReactions === post.id ? null : post.id)}>
                        <SmilePlus size={12} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs rounded-xl" onClick={() => { setCommentingOn(commentingOn === post.id ? null : post.id); if (commentingOn !== post.id) loadComments(post.id); }}>
                        <MessageCircle size={12} className="mr-1" /> {post.comments_count || 0}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs rounded-xl" onClick={() => sharePost(post.id, post.user_id)}>
                        <Share2 size={12} className="mr-1" /> {(post as any).shares_count || ''}
                      </Button>
                      {post.user_id !== user?.id && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs rounded-xl text-muted-foreground ml-auto" onClick={() => reportPost(post.id, post.user_id)}>
                          <Flag size={12} />
                        </Button>
                      )}
                    </div>

                    {showReactions === post.id && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-1 bg-muted p-2 rounded-xl">
                        {REACTIONS.map(emoji => (
                          <button key={emoji} className="text-lg hover:scale-125 transition-transform" onClick={() => handleReaction(post.id, emoji, post.user_id)}>{emoji}</button>
                        ))}
                      </motion.div>
                    )}

                    {commentingOn === post.id && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2 border-t border-border">
                        {renderComments(post.id, post.user_id)}
                        {replyingTo && (
                          <div className="flex items-center gap-1 text-[10px] text-primary">
                            <Reply size={10} /> Replying to comment
                            <button className="text-muted-foreground ml-1" onClick={() => setReplyingTo(null)}>✕</button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'} value={commentText} onChange={e => setCommentText(e.target.value)}
                            className="rounded-xl text-xs h-8 flex-1" onKeyDown={e => e.key === 'Enter' && submitComment(post.id, post.user_id)} />
                          <Button size="sm" className="h-8 rounded-xl text-xs lovli-gradient text-primary-foreground" onClick={() => submitComment(post.id, post.user_id)}><Send size={12} /></Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div className="fixed bottom-20 right-4 z-40" whileTap={{ scale: 0.9 }}>
            <Button size="icon" className="h-12 w-12 rounded-full lovli-gradient text-primary-foreground shadow-lg" onClick={() => setShowCreatePost(true)}>
              <Plus size={24} />
            </Button>
          </motion.div>
        </div>
      ) : (
        /* TikTok-style Video Feed */
        <div className="relative" style={{ height: 'calc(100vh - 12rem)' }}>
          {/* Video search */}
          <div className="absolute top-2 left-4 right-4 z-10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <Input
                placeholder="Search videos..."
                value={videoSearchFilter}
                onChange={e => setVideoSearchFilter(e.target.value)}
                className="pl-8 rounded-xl bg-black/30 border-white/20 text-white placeholder:text-white/50 h-8 text-xs backdrop-blur-sm"
              />
            </div>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Video size={48} className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No videos yet. Be the first to post one! 🎬</p>
              <Button className="mt-4 rounded-2xl lovli-gradient text-primary-foreground" onClick={() => setShowCreatePost(true)}>
                <Plus size={16} className="mr-2" /> Create Video Post
              </Button>
            </div>
          ) : (
            <div
              ref={videoContainerRef}
              className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              onScroll={(e) => {
                const el = e.currentTarget;
                const idx = Math.round(el.scrollTop / el.clientHeight);
                if (idx !== currentVideoIdx && idx >= 0 && idx < filteredVideos.length) setCurrentVideoIdx(idx);
              }}
            >
              {filteredVideos.map((post, i) => (
                <div key={post.id} className="h-full snap-start" style={{ height: 'calc(100vh - 12rem)' }}>
                  <VideoFeedItem post={post} isActive={i === currentVideoIdx} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comment drawer for videos */}
      {commentingOn && discoverTab === 'videos' && (
        <Dialog open={!!commentingOn} onOpenChange={() => setCommentingOn(null)}>
          <DialogContent className="max-w-[420px] rounded-2xl max-h-[70vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {renderComments(commentingOn, videoPosts.find(p => p.id === commentingOn)?.user_id || '')}
              {replyingTo && (
                <div className="flex items-center gap-1 text-[10px] text-primary">
                  <Reply size={10} /> Replying to comment
                  <button className="text-muted-foreground ml-1" onClick={() => setReplyingTo(null)}>✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'} value={commentText} onChange={e => setCommentText(e.target.value)}
                  className="rounded-xl text-xs h-8 flex-1" onKeyDown={e => e.key === 'Enter' && submitComment(commentingOn, videoPosts.find(p => p.id === commentingOn)?.user_id || '')} />
                <Button size="sm" className="h-8 rounded-xl text-xs lovli-gradient text-primary-foreground" onClick={() => submitComment(commentingOn, videoPosts.find(p => p.id === commentingOn)?.user_id || '')}><Send size={12} /></Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DiscoverPage;
