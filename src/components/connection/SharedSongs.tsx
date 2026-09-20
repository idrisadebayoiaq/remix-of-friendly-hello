import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, ExternalLink, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const detectPlatform = (url: string): string => {
  if (url.includes('spotify.com') || url.includes('open.spotify')) return 'spotify';
  if (url.includes('music.apple.com')) return 'apple';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'unknown';
};

const platformIcons: Record<string, string> = {
  spotify: '🟢',
  apple: '🍎',
  youtube: '🔴',
  soundcloud: '🟠',
  unknown: '🎵',
};

const SharedSongs = ({ connectionId }: { connectionId: string }) => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<any[]>([]);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('shared_songs').select('*').eq('connection_id', connectionId).eq('is_deleted', false).order('created_at', { ascending: false });
    if (data) {
      const enriched = await Promise.all(data.map(async (s) => {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', s.sender_id).single();
        return { ...s, sender_name: prof?.full_name };
      }));
      setSongs(enriched);
    }
  }, [connectionId]);

  useEffect(() => { load(); }, [load]);

  const addSong = async () => {
    if (!url.trim()) return;
    try { new URL(url.trim()); } catch { toast.error('Please enter a valid URL'); return; }
    setAdding(true);
    const platform = detectPlatform(url.trim());
    await supabase.from('shared_songs').insert({
      connection_id: connectionId,
      sender_id: user!.id,
      url: url.trim(),
      title: title.trim() || null,
      platform,
    } as any);
    setUrl('');
    setTitle('');
    setAdding(false);
    load();
    toast.success('Song shared! 🎵');
  };

  const removeSong = async (id: string) => {
    await supabase.from('shared_songs').update({ is_deleted: true } as any).eq('id', id);
    load();
    toast.success('Song removed');
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-bold flex items-center gap-2"><Music size={14} /> Share a Song</p>
          <Input placeholder="Paste Spotify, Apple Music, or YouTube link" value={url} onChange={e => setUrl(e.target.value)} className="rounded-xl text-xs" />
          <Input placeholder="Song title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl text-xs" />
          <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={addSong} disabled={adding || !url.trim()}>
            <Plus size={12} className="mr-1" /> Share Song
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-bold text-muted-foreground">🎶 Our Playlist ({songs.length})</p>
        {songs.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No songs shared yet. Share your first! 🎵</p>}
        {songs.map(s => (
          <Card key={s.id} className="shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-xl">{platformIcons[s.platform] || '🎵'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{s.title || 'Untitled Song'}</p>
                <p className="text-[10px] text-muted-foreground truncate">Shared by {s.sender_name} · {s.platform}</p>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink size={12} /></Button>
              </a>
              {s.sender_id === user?.id && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeSong(s.id)}><Trash2 size={12} /></Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SharedSongs;
