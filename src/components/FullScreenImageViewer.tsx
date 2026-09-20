import { useState } from 'react';
import { X, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FullScreenImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
}

const FullScreenImageViewer = ({ src, alt, onClose, onLike, onComment, onShare, liked, likeCount, commentCount }: FullScreenImageViewerProps) => {
  const [startY, setStartY] = useState<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => setStartY(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) setOffsetY(diff);
  };
  const handleTouchEnd = () => {
    if (offsetY > 150) onClose();
    else setOffsetY(0);
    setStartY(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute top-4 right-4 z-10">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={onClose}>
            <X size={24} />
          </Button>
        </div>

        <motion.div
          className="flex-1 flex items-center justify-center"
          style={{ transform: `translateY(${offsetY}px)`, opacity: 1 - offsetY / 400 }}
        >
          <img src={src} alt={alt || ''} className="max-w-full max-h-full object-contain" />
        </motion.div>

        {(onLike || onComment || onShare) && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
            {onLike && (
              <button onClick={onLike} className="flex flex-col items-center gap-1">
                <Heart size={28} className={liked ? 'text-red-500' : 'text-white'} fill={liked ? 'currentColor' : 'none'} />
                {likeCount !== undefined && <span className="text-white text-xs">{likeCount}</span>}
              </button>
            )}
            {onComment && (
              <button onClick={onComment} className="flex flex-col items-center gap-1">
                <MessageCircle size={28} className="text-white" />
                {commentCount !== undefined && <span className="text-white text-xs">{commentCount}</span>}
              </button>
            )}
            {onShare && (
              <button onClick={onShare} className="flex flex-col items-center gap-1">
                <Share2 size={28} className="text-white" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default FullScreenImageViewer;
