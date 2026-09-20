import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Pencil, Trash2, X, Check, CheckCheck } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/sounds';

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

const SupportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [adminTyping, setAdminTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const initialLoadRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  // Mark admin messages as read when viewing
  const markAsRead = useCallback(async (msgs: any[]) => {
    const unreadAdmin = msgs.filter(m => m.is_admin && !m.is_read);
    if (unreadAdmin.length > 0) {
      const ids = unreadAdmin.map(m => m.id);
      await supabase.from('support_chats').update({ is_read: true } as any).in('id', ids);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase.from('support_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      scrollToBottom();
      if (data) markAsRead(data);
      initialLoadRef.current = false;
    };
    load();

    const channel = supabase.channel(`user-support-rt-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chats', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          if (newMsg.is_admin) {
            playNotificationSound('message');
            // Mark as read immediately since user is viewing
            supabase.from('support_chats').update({ is_read: true } as any).eq('id', newMsg.id);
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_chats', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? payload.new : m));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_chats', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        })
      .subscribe();

    const presenceChannel = supabase.channel(`support-presence-${user.id}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const isTyping = Object.values(state).flat().some(
          (p: any) => p.role === 'admin' && p.typing
        );
        setAdminTyping(isTyping);
      })
      .subscribe();
    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, scrollToBottom, markAsRead]);

  const broadcastTyping = (typing: boolean) => {
    presenceChannelRef.current?.track({ role: 'user', typing });
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const send = async () => {
    if (!newMessage.trim()) return;
    broadcastTyping(false);
    const { data, error } = await supabase.from('support_chats').insert({
      user_id: user!.id,
      message: newMessage.trim(),
      is_admin: false,
    }).select().single();
    if (!error && data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setNewMessage('');
      scrollToBottom();
    }
  };

  const editMessage = async (id: string) => {
    if (!editText.trim()) return;
    await supabase.from('support_chats').update({ message: editText.trim() } as any).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, message: editText.trim() } : m));
    setEditingId(null);
    setEditText('');
    toast.success('Message updated');
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('support_chats').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
    toast.success('Message deleted');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="p-3 border-b border-border bg-card">
        <BackHeader title="Support" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Send us a message and we'll get back to you!</p>
          </div>
        )}
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'} group`}>
            <div className={`flex flex-col gap-0.5 max-w-[80%] ${msg.is_admin ? 'items-start' : 'items-end'}`}>
              {editingId === msg.id ? (
                <div className="flex items-center gap-1 w-full">
                  <Input value={editText} onChange={e => setEditText(e.target.value)} className="rounded-xl text-sm flex-1"
                    onKeyDown={e => e.key === 'Enter' && editMessage(msg.id)} autoFocus />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editMessage(msg.id)}><Check size={14} /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X size={14} /></Button>
                </div>
              ) : (
                <>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    msg.is_admin ? 'bg-muted rounded-bl-sm' : 'lovli-gradient text-primary-foreground rounded-br-sm'
                  }`}>
                    {msg.is_admin && <p className="text-[9px] font-bold mb-0.5 opacity-70">Admin</p>}
                    {msg.message}
                    <div className={`flex items-center gap-1 mt-1 ${msg.is_admin ? 'text-muted-foreground' : 'text-primary-foreground/60'}`}>
                      <span className="text-[9px]">{new Date(msg.created_at).toLocaleString()}</span>
                      {!msg.is_admin && (
                        <CheckCheck size={12} className={msg.is_read ? 'text-blue-400' : 'opacity-50'} />
                      )}
                    </div>
                  </div>
                  {!msg.is_admin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(msg.id); setEditText(msg.message); }}>
                        <Pencil size={11} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMessage(msg.id)}>
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ))}
        {adminTyping && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-border bg-card flex gap-2">
        <Input value={newMessage} onChange={e => handleInputChange(e.target.value)} placeholder="Describe your issue..."
          className="rounded-xl flex-1" onKeyDown={e => e.key === 'Enter' && send()} />
        <Button size="icon" onClick={send} className="rounded-xl lovli-gradient text-primary-foreground shrink-0">
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
};

export default SupportPage;
