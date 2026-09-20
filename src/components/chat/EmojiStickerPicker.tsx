import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const EMOJI_GROUPS = [
  { label: '😊', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🤫','🤔'] },
  { label: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶','💑','💏','👩‍❤️‍👨','🥹'] },
  { label: '👋', emojis: ['👋','🤚','🖐','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏'] },
  { label: '🎉', emojis: ['🎉','🎊','🎈','🎁','🎂','🍰','🥂','🍾','🎆','🎇','✨','🎵','🎶','🎤','🎧','🎸','🎹','🥁','🎺','🎻','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🏐','🎯','🎮'] },
];

interface EmojiStickerPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (stickerUrl: string) => void;
  onClose: () => void;
}

const EmojiStickerPicker = ({ onEmojiSelect, onStickerSelect, onClose }: EmojiStickerPickerProps) => {
  const [stickerPacks, setStickerPacks] = useState<any[]>([]);
  const [stickers, setStickers] = useState<Record<string, any[]>>({});
  const [activePack, setActivePack] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const { data: packs } = await (supabase.from as any)('sticker_packs').select('*').eq('is_active', true);
      setStickerPacks(packs || []);
      if (packs?.length) {
        setActivePack(packs[0].id);
        const { data: allStickers } = await (supabase.from as any)('stickers').select('*');
        const grouped: Record<string, any[]> = {};
        (allStickers || []).forEach((s: any) => {
          if (!grouped[s.pack_id]) grouped[s.pack_id] = [];
          grouped[s.pack_id].push(s);
        });
        setStickers(grouped);
      }
    };
    load();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="border-t border-border bg-card max-h-[280px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <p className="text-xs font-bold text-muted-foreground">Emoji & Stickers</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X size={14} /></Button>
      </div>

      <Tabs defaultValue="emoji" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-2 mt-1 h-8">
          <TabsTrigger value="emoji" className="text-xs h-6">😊 Emoji</TabsTrigger>
          <TabsTrigger value="stickers" className="text-xs h-6">🎨 Stickers</TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="flex-1 overflow-y-auto p-2 m-0">
          {EMOJI_GROUPS.map(group => (
            <div key={group.label} className="mb-2">
              <div className="flex flex-wrap gap-0.5">
                {group.emojis.map(emoji => (
                  <button key={emoji} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-colors"
                    onClick={() => onEmojiSelect(emoji)}>{emoji}</button>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="stickers" className="flex-1 overflow-hidden flex flex-col m-0">
          {stickerPacks.length > 0 && (
            <>
              <div className="flex gap-1 px-2 py-1 border-b border-border overflow-x-auto">
                {stickerPacks.map(pack => (
                  <Button key={pack.id} size="sm" variant={activePack === pack.id ? 'default' : 'ghost'}
                    className={`h-7 text-xs rounded-full shrink-0 ${activePack === pack.id ? 'lovli-gradient text-primary-foreground' : ''}`}
                    onClick={() => setActivePack(pack.id)}>
                    {pack.cover_url} {pack.name}
                  </Button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-4 gap-2">
                  {(stickers[activePack] || []).map(s => (
                    <button key={s.id} className="aspect-square rounded-xl hover:bg-muted p-1 transition-colors flex items-center justify-center"
                      onClick={() => onStickerSelect(s.sticker_url)}>
                      <img src={s.sticker_url} alt="" className="w-12 h-12 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default EmojiStickerPicker;
