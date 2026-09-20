import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, UserPlus, Volume2, VolumeX, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export type TikTokPost = {
  id: string;
  user_id: string;
  content?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
  like_count?: number;
  comments_count?: number;
  shares_count?: number;
  my_like?: any;
  profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

type Props = {
  posts: TikTokPost[];
  currentUserId?: string;
  initialPostId?: string | null;
  connectionStatus: Record<string, { connected: boolean; connectionId?: string }>;
  followingIds: Set<string>;
  onLike: (postId: string, hasLiked: boolean, ownerId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string, ownerId: string) => void;
  onConnect: (userId: string) => void;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  onIndexChange?: (index: number, postId: string) => void;
};

const TikTokFeed = ({
  posts,
  currentUserId,
  initialPostId,
  connectionStatus,
  followingIds,
  onLike,
  onComment,
  onShare,
  onConnect,
  onFollow,
  onUnfollow,
  onIndexChange,
}: Props) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!initialPostId || !posts.length) return;
    const idx = posts.findIndex((p) => p.id === initialPostId);
    if (idx >= 0) {
      setActiveIndex(idx);
      requestAnimationFrame(() => {
        const el = containerRef.current?.children[idx] as HTMLElement | undefined;
        el?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
  }, [initialPostId, posts]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(idx)) {
            setActiveIndex(idx);
            const post = posts[idx];
            if (post) onIndexChange?.(idx, post.id);
          }
        });
      },
      { root, threshold: [0.6] },
    );

    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [posts, onIndexChange]);

  useEffect(() => {
    posts.forEach((post, idx) => {
      const vid = videoRefs.current[post.id];
      if (!vid) return;
      if (idx === activeIndex) {
        vid.muted = muted;
        vid.play().catch(() => undefined);
      } else {
        vid.pause();
      }
    });
  }, [activeIndex, muted, posts]);

  if (!posts.length) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-9rem)] text-sm text-muted-foreground px-6 text-center">
        No posts yet. Tap + to create one.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-8.5rem)] overflow-y-auto snap-y snap-mandatory scrollbar-hide bg-black"
    >
      {posts.map((post, idx) => {
        const isVideo = post.media_type === 'video' && !!post.video_url;
        const isImage = !!post.image_url && !isVideo;
        const conn = connectionStatus[post.user_id];
        const isOwn = post.user_id === currentUserId;
        const following = followingIds.has(post.user_id);

        return (
          <section
            key={post.id}
            data-index={idx}
            className="relative h-full w-full snap-start snap-always flex items-end justify-center overflow-hidden"
          >
            {isVideo ? (
              <video
                ref={(el) => {
                  videoRefs.current[post.id] = el;
                }}
                src={post.video_url!}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted={muted}
                poster={post.image_url || undefined}
                onClick={() => {
                  const vid = videoRefs.current[post.id];
                  if (!vid) return;
                  if (vid.paused) vid.play().catch(() => undefined);
                  else vid.pause();
                }}
              />
            ) : isImage ? (
              <img src={post.image_url!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-secondary/30 flex items-center justify-center p-8">
                <p className="text-xl font-display font-bold text-center text-foreground whitespace-pre-wrap">
                  {post.content || '…'}
                </p>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

            {/* Right rail */}
            <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-4">
              <button
                type="button"
                className="relative"
                onClick={() => post.profiles?.username && navigate(`/u/${post.profiles.username}`)}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white lovli-gradient flex items-center justify-center text-primary-foreground font-bold">
                  {post.profiles?.avatar_url ? (
                    <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.profiles?.full_name?.[0] || <UserRound size={18} />
                  )}
                </div>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-0.5 text-white"
                onClick={() => onLike(post.id, !!post.my_like, post.user_id)}
              >
                <div className={`w-11 h-11 rounded-full bg-black/35 flex items-center justify-center ${post.my_like ? 'text-red-400' : ''}`}>
                  <Heart size={22} fill={post.my_like ? 'currentColor' : 'none'} />
                </div>
                <span className="text-[11px] font-semibold">{post.like_count || 0}</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-0.5 text-white"
                onClick={() => onComment(post.id)}
              >
                <div className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center">
                  <MessageCircle size={22} />
                </div>
                <span className="text-[11px] font-semibold">{post.comments_count || 0}</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-0.5 text-white"
                onClick={() => onShare(post.id, post.user_id)}
              >
                <div className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center">
                  <Share2 size={20} />
                </div>
                <span className="text-[11px] font-semibold">{post.shares_count || 0}</span>
              </button>

              {!isOwn && (
                <button
                  type="button"
                  className="flex flex-col items-center gap-0.5 text-white"
                  onClick={() => (conn?.connected ? navigate(`/connection/${conn.connectionId}`) : onConnect(post.user_id))}
                >
                  <div className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center">
                    <UserPlus size={20} />
                  </div>
                  <span className="text-[10px] font-semibold">{conn?.connected ? 'Chat' : 'Connect'}</span>
                </button>
              )}

              {isVideo && (
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-white"
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </div>

            {/* Caption */}
            <div className="absolute left-0 right-16 bottom-6 z-10 px-4 text-white space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="font-bold text-sm"
                  onClick={() => post.profiles?.username && navigate(`/u/${post.profiles.username}`)}
                >
                  @{post.profiles?.username || 'user'}
                </button>
                {!isOwn && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 rounded-full text-[10px] px-2"
                    onClick={() => (following ? onUnfollow(post.user_id) : onFollow(post.user_id))}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
              {post.content && (isVideo || isImage) && (
                <p className="text-sm line-clamp-3 whitespace-pre-wrap opacity-95">{post.content}</p>
              )}
            </div>

            {idx === activeIndex && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-white/70"
              >
                Swipe up
              </motion.div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default TikTokFeed;
