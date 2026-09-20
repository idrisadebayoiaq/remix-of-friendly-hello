import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Flame, Crown, Clock, Send, Compass, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  connected: { label: 'Connected', icon: Heart, color: 'bg-primary/10 text-primary' },
  dating: { label: 'Dating', icon: Flame, color: 'bg-accent text-accent-foreground' },
  married: { label: 'Married', icon: Crown, color: 'lovli-gradient text-primary-foreground' },
};

const RelationshipTimeline = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connection, setConnection] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: conn } = await supabase
      .from('connections')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .not('status', 'in', '("ended","blocked")')
      .limit(1)
      .maybeSingle();

    setConnection(conn);

    if (conn) {
      const partnerId = conn.user1_id === user.id ? conn.user2_id : conn.user1_id;
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('user_id', partnerId)
        .single();
      setPartner(p);

      const { data: events } = await supabase
        .from('connection_timeline_events')
        .select('*')
        .eq('connection_id', conn.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setTimeline(events || []);
    }

    setLoading(false);
  };

  if (loading) return null;

  const daysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  // No connection view
  if (!connection) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm border-primary/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-primary" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                🔥 Relationship Timeline
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Start your love journey! Send an invite or explore profiles.
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={() => navigate('/ask')}>
                <Send size={14} className="mr-1" /> Create Invite
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate('/discover')}>
                <Compass size={14} className="mr-1" /> Explore
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const status = connection.status || 'connected';
  const config = statusConfig[status] || statusConfig.connected;
  const StatusIcon = config.icon;

  const connectedDays = daysSince(connection.created_at);
  const datingDays = connection.dating_started_at ? daysSince(connection.dating_started_at) : 0;
  const marriedDays = connection.married_at ? daysSince(connection.married_at) : 0;

  // Milestone logic
  const matchmakingUnlockDay = 7;
  const marriageUnlockDay = 180;
  const matchmakingUnlocked = connectedDays >= matchmakingUnlockDay;
  const marriageUnlocked = status === 'dating' && datingDays >= marriageUnlockDay;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="shadow-md border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-primary" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                🔥 Relationship Timeline
              </p>
            </div>
            <Badge className={`rounded-full text-[10px] ${config.color}`}>
              <StatusIcon size={10} className="mr-1" /> {config.label}
            </Badge>
          </div>

          {/* Partner info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden shrink-0">
              {partner?.avatar_url ? (
                <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                partner?.full_name?.[0] || '?'
              )}
            </div>
            <div>
              <p className="text-sm font-bold">{partner?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">@{partner?.username}</p>
            </div>
          </div>

          {/* Streaks */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-accent/50 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-primary">{connectedDays}</p>
              <p className="text-[10px] text-muted-foreground">Days Connected</p>
            </div>
            {status === 'dating' && (
              <div className="bg-accent/50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-primary">{datingDays}</p>
                <p className="text-[10px] text-muted-foreground">Days Dating</p>
              </div>
            )}
            {status === 'married' && (
              <div className="bg-accent/50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-primary">{marriedDays}</p>
                <p className="text-[10px] text-muted-foreground">Days Married</p>
              </div>
            )}
            {status === 'connected' && !matchmakingUnlocked && (
              <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-muted-foreground">{matchmakingUnlockDay - connectedDays}</p>
                <p className="text-[10px] text-muted-foreground">Days to Matchmaking</p>
              </div>
            )}
            {status === 'dating' && !marriageUnlocked && (
              <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-muted-foreground">{marriageUnlockDay - datingDays}</p>
                <p className="text-[10px] text-muted-foreground">Days to Marriage</p>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-2">
            {status === 'connected' && matchmakingUnlocked && (
              <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground flex-1" onClick={() => navigate('/chats')}>
                <Sparkles size={14} className="mr-1" /> Open Matchmaking
              </Button>
            )}
            {status === 'dating' && marriageUnlocked && (
              <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground flex-1" onClick={() => navigate('/chats')}>
                <Crown size={14} className="mr-1" /> Marriage Room
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate('/chats')}>
              <Clock size={14} className="mr-1" /> View Timeline
            </Button>
          </div>

          {/* Recent timeline events */}
          {timeline.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border">
              {timeline.slice(0, 3).map(evt => (
                <div key={evt.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="font-medium">{evt.title}</span>
                  <span className="text-muted-foreground ml-auto text-[10px]">
                    {new Date(evt.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RelationshipTimeline;
