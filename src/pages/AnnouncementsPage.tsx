import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Send, Pencil, Trash2, MessageCircle } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const REACTIONS = ['❤️', '👍', '😂', '😮', '🙏'];

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (!data) return;
    const enriched = await Promise.all(data.map(async (a) => {
      const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', a.admin_id).single();
      const { count } = await supabase.from('announcement_replies').select('*', { count: 'exact', head: true }).eq('announcement_id', a.id).eq('is_deleted', false);
      const { data: reactions } = await supabase.from('announcement_reactions').select('*').eq('announcement_id', a.id);
      return { ...a, admin_profile: prof, reply_count: count || 0, reactions: reactions || [] };
    }));
    setAnnouncements(enriched);
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const loadReplies = async (announcementId: string) => {
    const { data } = await supabase.from('announcement_replies').select('*').eq('announcement_id', announcementId).eq('is_deleted', false).order('created_at', { ascending: true });
    const enriched = await Promise.all((data || []).map(async (r) => {
      const { data: prof } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', r.user_id).single();
      return { ...r, profile: prof };
    }));
    setReplies(prev => ({ ...prev, [announcementId]: enriched }));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadReplies(id);
  };

  const submitReply = async (announcementId: string) => {
    const text = replyText[announcementId]?.trim();
    if (!text) return;
    await supabase.from('announcement_replies').insert({ announcement_id: announcementId, user_id: user!.id, content: text } as any);
    setReplyText(prev => ({ ...prev, [announcementId]: '' }));
    loadReplies(announcementId);
    loadAnnouncements();
    toast.success('Reply posted!');
  };

  const deleteReply = async (replyId: string, announcementId: string) => {
    await supabase.from('announcement_replies').update({ is_deleted: true } as any).eq('id', replyId);
    loadReplies(announcementId);
    loadAnnouncements();
    toast.success('Reply deleted');
  };

  const saveEditReply = async (replyId: string, announcementId: string) => {
    if (!editText.trim()) return;
    await supabase.from('announcement_replies').update({ content: editText.trim(), edited_at: new Date().toISOString() } as any).eq('id', replyId);
    setEditingReply(null);
    loadReplies(announcementId);
    toast.success('Reply updated');
  };

  const toggleReaction = async (announcementId: string, emoji: string) => {
    const { data: existing } = await supabase.from('announcement_reactions').select('*').eq('announcement_id', announcementId).eq('user_id', user!.id).maybeSingle();
    if (existing) {
      if (existing.reaction_type === emoji) {
        await supabase.from('announcement_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('announcement_reactions').update({ reaction_type: emoji } as any).eq('id', existing.id);
      }
    } else {
      await supabase.from('announcement_reactions').insert({ announcement_id: announcementId, user_id: user!.id, reaction_type: emoji } as any);
    }
    loadAnnouncements();
  };

  const getReactionSummary = (reactions: any[]) => {
    const counts: Record<string, number> = {};
    reactions.forEach(r => { counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="p-4 space-y-4">
      <BackHeader title="Announcements" />

      {announcements.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No announcements yet</p>}

      <AnimatePresence>
        {announcements.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                    {a.admin_profile?.avatar_url ? <img src={a.admin_profile.avatar_url} alt="" className="w-full h-full object-cover" /> : '👑'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{a.admin_profile?.full_name || 'Admin'}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] rounded-full">📢 Official</Badge>
                </div>

                <div>
                  <p className="text-sm font-bold">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                </div>

                {/* Reactions */}
                {a.reactions.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {getReactionSummary(a.reactions).map(([emoji, count]) => (
                      <button key={emoji} className="text-xs bg-muted px-1.5 py-0.5 rounded-full hover:bg-accent" onClick={() => toggleReaction(a.id, emoji)}>
                        {emoji} {count}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {REACTIONS.map(emoji => (
                    <button key={emoji} className="text-sm hover:scale-125 transition-transform" onClick={() => toggleReaction(a.id, emoji)}>{emoji}</button>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs rounded-xl ml-auto" onClick={() => toggleExpand(a.id)}>
                    <MessageCircle size={12} className="mr-1" /> {a.reply_count} {expandedId === a.id ? '▲' : '▼'}
                  </Button>
                </div>

                {/* Replies */}
                {expandedId === a.id && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2 border-t border-border">
                    {(replies[a.id] || []).map(r => (
                      <div key={r.id} className="flex gap-2 text-xs">
                        <div className="w-6 h-6 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-[8px] font-bold overflow-hidden shrink-0">
                          {r.profile?.avatar_url ? <img src={r.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : r.profile?.full_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{r.profile?.full_name}</span>
                            <span className="text-muted-foreground text-[9px]">@{r.profile?.username}</span>
                            {r.edited_at && <span className="text-muted-foreground text-[9px]">(edited)</span>}
                          </div>
                          {editingReply === r.id ? (
                            <div className="flex gap-1 mt-1">
                              <Input value={editText} onChange={e => setEditText(e.target.value)} className="rounded-xl text-xs h-7 flex-1" />
                              <Button size="sm" className="h-7 text-[10px] rounded-xl" onClick={() => saveEditReply(r.id, a.id)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingReply(null)}>✕</Button>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">{r.content}</p>
                          )}
                          {r.user_id === user?.id && (
                            <div className="flex gap-2 mt-0.5">
                              <button className="text-muted-foreground hover:text-primary text-[10px]" onClick={() => { setEditingReply(r.id); setEditText(r.content); }}>Edit</button>
                              <button className="text-muted-foreground hover:text-destructive text-[10px]" onClick={() => deleteReply(r.id, a.id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a reply..."
                        value={replyText[a.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="rounded-xl text-xs h-8 flex-1"
                        onKeyDown={e => e.key === 'Enter' && submitReply(a.id)}
                      />
                      <Button size="sm" className="h-8 rounded-xl text-xs lovli-gradient text-primary-foreground" onClick={() => submitReply(a.id)}>
                        <Send size={12} />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementsPage;
