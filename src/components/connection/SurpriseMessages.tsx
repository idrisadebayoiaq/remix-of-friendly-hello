import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Gift, Lock, Trash2, Pencil, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SurpriseMessagesProps {
  connectionId: string;
  userId: string;
  otherUserId: string;
  otherUserName: string;
}

const SurpriseMessages = ({ connectionId, userId, otherUserId, otherUserName }: SurpriseMessagesProps) => {
  const [surprises, setSurprises] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState('');
  const [revealDate, setRevealDate] = useState('');
  const [revealTime, setRevealTime] = useState('12:00');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const loadSurprises = useCallback(async () => {
    const { data } = await supabase
      .from('surprise_messages')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    setSurprises(data || []);
  }, [connectionId]);

  useEffect(() => { loadSurprises(); }, [loadSurprises]);

  useEffect(() => {
    const channel = supabase.channel(`surprises-${connectionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surprise_messages', filter: `connection_id=eq.${connectionId}` },
        () => loadSurprises())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [connectionId, loadSurprises]);

  // Auto-reveal check every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setSurprises(prev => prev.map(s => {
        if (!s.is_revealed && new Date(s.reveal_at) <= new Date()) {
          // Mark as revealed in DB
          supabase.from('surprise_messages').update({ is_revealed: true, revealed_at: new Date().toISOString() } as any).eq('id', s.id);
          return { ...s, is_revealed: true, revealed_at: new Date().toISOString() };
        }
        return s;
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const createSurprise = async () => {
    if (!content.trim() || !revealDate) { toast.error('Please fill content and reveal date'); return; }
    const revealAt = new Date(`${revealDate}T${revealTime}`).toISOString();
    if (new Date(revealAt) <= new Date()) { toast.error('Reveal time must be in the future'); return; }
    
    await supabase.from('surprise_messages').insert({
      connection_id: connectionId,
      sender_id: userId,
      receiver_id: otherUserId,
      content: content.trim(),
      reveal_at: revealAt,
    } as any);
    
    setContent(''); setRevealDate(''); setRevealTime('12:00'); setShowCreate(false);
    toast.success('Surprise scheduled! 🎁');
    loadSurprises();
  };

  const deleteSurprise = async (id: string) => {
    await supabase.from('surprise_messages').update({ is_deleted: true } as any).eq('id', id);
    toast.success('Surprise removed');
    loadSurprises();
  };

  const updateSurprise = async (id: string) => {
    if (!editContent.trim()) return;
    await supabase.from('surprise_messages').update({ content: editContent.trim() } as any).eq('id', id);
    setEditingId(null);
    toast.success('Surprise updated!');
    loadSurprises();
  };

  const isRevealed = (s: any) => s.is_revealed || new Date(s.reveal_at) <= new Date();
  const isMine = (s: any) => s.sender_id === userId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold flex items-center gap-1.5"><Gift size={16} className="text-primary" /> Surprises</p>
          <p className="text-xs text-muted-foreground">Schedule secret messages 🎁</p>
        </div>
        <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={() => setShowCreate(true)}>
          <Plus size={14} className="mr-1" /> New
        </Button>
      </div>

      {surprises.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center">
            <Gift size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No surprises yet. Schedule one!</p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {surprises.map((s, i) => {
          const revealed = isRevealed(s);
          const mine = isMine(s);

          if (s.is_deleted) {
            return (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="shadow-sm opacity-50">
                  <CardContent className="p-4 text-center italic text-sm text-muted-foreground">
                    This surprise was removed
                  </CardContent>
                </Card>
              </motion.div>
            );
          }

          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`shadow-sm ${revealed ? 'border-primary/30' : ''}`}>
                <CardContent className="p-4 space-y-2">
                  {revealed ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Gift size={14} className="text-primary" />
                        <p className="text-xs font-semibold text-primary">
                          {mine ? `Your surprise to ${otherUserName}` : `Surprise from ${otherUserName}`} 🎉
                        </p>
                      </div>
                      {editingId === s.id ? (
                        <div className="flex gap-1">
                          <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="rounded-xl text-sm" />
                          <Button size="sm" onClick={() => updateSurprise(s.id)} className="rounded-xl">✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-xl">✕</Button>
                        </div>
                      ) : (
                        <p className="text-sm">{s.content}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Revealed {new Date(s.revealed_at || s.reveal_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {mine && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { setEditingId(s.id); setEditContent(s.content); }}>
                            <Pencil size={10} className="mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => deleteSurprise(s.id)}>
                            <Trash2 size={10} className="mr-1" /> Delete
                          </Button>
                        </div>
                      )}
                    </>
                  ) : mine ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-primary" />
                        <p className="text-xs font-semibold">Scheduled Surprise ⏳</p>
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{s.content}"</p>
                      <p className="text-[10px] text-muted-foreground">
                        Reveals on {new Date(s.reveal_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { setEditingId(s.id); setEditContent(s.content); }}>
                          <Pencil size={10} className="mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => deleteSurprise(s.id)}>
                          <Trash2 size={10} className="mr-1" /> Delete
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Lock size={14} className="text-primary" />
                        <p className="text-xs font-semibold">A surprise is coming! 🔒</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Reveals on {new Date(s.reveal_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift size={18} className="text-primary" /> New Surprise 🎁</DialogTitle>
            <DialogDescription>Schedule a secret message for {otherUserName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Your surprise message..." value={content} onChange={e => setContent(e.target.value)} className="rounded-xl min-h-[80px]" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reveal Date</label>
                <Input type="date" value={revealDate} onChange={e => setRevealDate(e.target.value)} className="rounded-xl" min={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reveal Time</label>
                <Input type="time" value={revealTime} onChange={e => setRevealTime(e.target.value)} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={createSurprise} disabled={!content.trim() || !revealDate}>
              Schedule Surprise 🎁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SurpriseMessages;
