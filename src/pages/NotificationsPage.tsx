import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, SmilePlus, Reply, Check, CheckCheck } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const typeIcons: Record<string, any> = {
  post_liked: Heart,
  post_reacted: SmilePlus,
  post_commented: MessageCircle,
  post_replied: Reply,
  post_shared: Share2,
  invite_accepted: Heart,
  invite_declined: Heart,
  connection_request: Heart,
  dating_request: Heart,
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Enrich with actor profiles
    const enriched = await Promise.all((data || []).map(async (n) => {
      if (n.actor_id) {
        const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', n.actor_id).single();
        return { ...n, actor: profile };
      }
      return n;
    }));
    setNotifications(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('notif-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    const postId = n.data?.post_id;
    if (postId) navigate(`/post/${postId}`);
    else if (n.data?.connection_id) navigate(`/connection/${n.data.connection_id}`);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 space-y-4">
      <BackHeader
        title="Notifications"
        rightContent={unreadCount > 0 ? (
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllRead}>
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        ) : undefined}
      />

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No notifications yet 🔔</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Heart;
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={`shadow-sm cursor-pointer transition-colors ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-primary/10' : 'bg-muted'}`}>
                      {n.actor?.avatar_url ? (
                        <img src={n.actor.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <Icon size={14} className={!n.is_read ? 'text-primary' : 'text-muted-foreground'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? 'font-bold' : ''}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        className="shrink-0 mt-1"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      >
                        <Check size={14} className="text-primary" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
