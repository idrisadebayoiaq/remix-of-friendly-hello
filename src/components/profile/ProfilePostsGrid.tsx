import { useNavigate } from 'react-router-dom';
import { Play, Image as ImageIcon, Type } from 'lucide-react';

export type ProfileGridPost = {
  id: string;
  content?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
  thumbnail_url?: string | null;
  likes_count?: number | null;
};

type Props = {
  posts: ProfileGridPost[];
  emptyLabel?: string;
};

const ProfilePostsGrid = ({ posts, emptyLabel = 'No Discover posts yet' }: Props) => {
  const navigate = useNavigate();

  if (!posts.length) {
    return <p className="text-center text-sm text-muted-foreground py-10">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((post) => {
        const isVideo = post.media_type === 'video' && !!post.video_url;
        const thumb = post.thumbnail_url || post.image_url;
        return (
          <button
            key={post.id}
            type="button"
            className="relative aspect-[3/4] bg-muted overflow-hidden"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            {thumb ? (
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : isVideo ? (
              <video
                src={post.video_url!}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 bg-secondary/40">
                <Type size={16} className="text-muted-foreground" />
                <p className="text-[9px] text-muted-foreground line-clamp-4 text-center">{post.content || ''}</p>
              </div>
            )}
            {isVideo && (
              <div className="absolute top-1.5 right-1.5 text-white drop-shadow">
                <Play size={14} fill="currentColor" />
              </div>
            )}
            {!isVideo && thumb && (
              <div className="absolute top-1.5 right-1.5 text-white/80 drop-shadow">
                <ImageIcon size={12} />
              </div>
            )}
            <div className="absolute bottom-1 left-1 text-[9px] text-white font-semibold drop-shadow-sm">
              ♥ {post.likes_count || 0}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ProfilePostsGrid;
