import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { bondTypeBadge, normalizeConnectionOrigin } from '@/lib/connectionOrigins';

const ChatsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<any[]>([]);

  const loadConnections = useCallback(async () => {
    if (!user) return;
    const { data: conns } = await supabase.from('connections').select('*');
    if (!conns) {
      setConnections([]);
      return;
    }
    const active = conns.filter((c: any) => !['blocked', 'ended'].includes(c.status));
    const enriched = await Promise.all(
      active.map(async (conn) => {
        const otherId = conn.user1_id === user?.id ? conn.user2_id : conn.user1_id;
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', otherId).single();
        const { data: lastMsg } = await supabase
          .from('connection_messages')
          .select('content, created_at, message_type')
          .eq('connection_id', conn.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);
        return { ...conn, otherUser: profile, lastMessage: lastMsg?.[0] };
      }),
    );
    enriched.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    setConnections(enriched);
  }, [user]);

  useEffect(() => {
    if (user) loadConnections();
  }, [user, loadConnections]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chats-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_messages' }, () => loadConnections())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => loadConnections())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConnections]);

  const getStageLabel = (conn: any) => {
    if (conn.status === 'married') return 'Married';
    if (conn.status === 'dating') return 'Dating';
    const origin = normalizeConnectionOrigin(conn.origin_type);
    if (origin === 'dating') return 'Match chat';
    if (origin === 'invite') return 'Together';
    if (conn.relationship_track === 'friendship') return 'Friends';
    return 'Connected';
  };

  const bondBadgeClass = (tone: 'invite' | 'dating' | 'friends') => {
    if (tone === 'invite') return 'bg-rose-100 text-rose-700 border-0';
    if (tone === 'dating') return 'bg-fuchsia-100 text-fuchsia-700 border-0';
    return 'bg-sky-100 text-sky-700 border-0';
  };

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <MessageCircle className="text-primary" size={24} />
          Chats
        </h1>
        <p className="text-sm text-muted-foreground">Invite · Dating · Friends bonds</p>
      </motion.div>

      {connections.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center">
            <Heart size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No connections yet. Invite someone or Match from Meet.</p>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          {connections.map((conn, i) => {
            const other = conn.otherUser;
            const bond = bondTypeBadge(conn.origin_type);
            return (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/connection/${conn.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground font-bold overflow-hidden shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (other?.username) navigate(`/u/${other.username}`);
                      }}
                    >
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        other?.full_name?.[0] || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold truncate">{other?.full_name || 'User'}</p>
                        <Badge className={`text-[8px] rounded-full px-1.5 py-0 h-4 shrink-0 ${bondBadgeClass(bond.tone)}`}>
                          {bond.label}
                        </Badge>
                        <Badge variant="outline" className="text-[8px] rounded-full px-1.5 py-0 h-4 shrink-0">
                          {getStageLabel(conn)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conn.lastMessage
                          ? conn.lastMessage.message_type === 'voice'
                            ? '🎤 Voice message'
                            : conn.lastMessage.content
                          : 'No messages yet'}
                      </p>
                    </div>
                    {conn.lastMessage && (
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(conn.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ChatsPage;
