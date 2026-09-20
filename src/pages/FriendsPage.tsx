import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserPlus, MapPin, Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notificationTypes';
import { shareUrl } from '@/lib/appUrl';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  single: '💚 Single', talking_stage: '💛 Talking', dating: '💜 Dating', engaged: '💍 Engaged', married: '💕 Married',
};

const FriendsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const embedded = location.pathname.startsWith('/meet');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Load connected + pending friendship request IDs
  const loadConnections = useCallback(async () => {
    if (!user) return;
    const [{ data }, { data: pending }] = await Promise.all([
      supabase.from('connections').select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .not('status', 'in', '("ended","blocked")'),
      supabase.from('connection_requests').select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending'),
    ]);
    const ids = new Set<string>();
    (data || []).forEach(c => {
      if (c.user1_id === user.id) ids.add(c.user2_id);
      else ids.add(c.user1_id);
    });
    setConnectedUserIds(ids);
    const pendingSet = new Set<string>();
    (pending || []).forEach((r: any) => {
      pendingSet.add(r.sender_id === user.id ? r.receiver_id : r.sender_id);
    });
    setPendingIds(pendingSet);
    return ids;
  }, [user]);

  // Load suggestions excluding connected users
  const loadSuggestions = useCallback(async () => {
    if (!user || !profile) return;
    const connIds = await loadConnections();

    let query = supabase.from('profiles').select('*')
      .neq('user_id', user.id)
      .eq('is_deleted', false)
      .eq('profile_visible', true)
      .limit(20);

    if ((profile as any)?.country) {
      query = query.eq('country', (profile as any).country);
    }

    const { data } = await query;
    // Filter out connected users
    const filtered = (data || []).filter(p => !connIds?.has(p.user_id));
    setSuggestions(filtered.slice(0, 10));
  }, [user, profile, loadConnections]);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('profiles').select('*')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .neq('user_id', user!.id)
      .eq('is_deleted', false)
      .eq('profile_visible', true)
      .limit(20);
    setResults(data || []);
    setSearching(false);
  }, [user]);

  const sendRequest = async (receiverId: string) => {
    if (!user) return;
    setSendingId(receiverId);
    try {
      const { data: existing } = await supabase.from('connection_requests').select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .eq('status', 'pending').maybeSingle();
      if (existing) { toast.info('Friendship request already pending'); return; }

      const { data: conn } = await supabase.from('connections').select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${user.id})`)
        .not('status', 'in', '("ended","blocked")').maybeSingle();
      if (conn) { toast.info('Already connected!'); return; }

      const { error } = await supabase.from('connection_requests').insert({ sender_id: user.id, receiver_id: receiverId });
      if (error) {
        toast.error(error.code === '23505' ? 'Request already sent' : 'Failed to send');
        return;
      }
      await createNotification({
        userId: receiverId,
        type: NOTIFICATION_TYPES.connection_request,
        title: 'New friendship request',
        message: `${profile?.full_name || 'Someone'} wants to connect as friends`,
        actorId: user.id,
        data: { sender_id: user.id, url: '/home' },
      });
      setPendingIds((prev) => new Set(prev).add(receiverId));
      toast.success('Friendship request sent');
    } finally {
      setSendingId(null);
    }
  };

  const shareInvite = async () => {
    const url = shareUrl('/invite');
    if (navigator.share) {
      await navigator.share({ title: 'Join me on Lovli 💕', url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const renderUser = (p: any) => {
    const isConnected = connectedUserIds.has(p.user_id);
    return (
      <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/u/${p.username}`)}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden shrink-0">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.full_name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold truncate">{p.full_name}</p>
                <Badge variant="secondary" className="text-[8px] rounded-full px-1.5 py-0 h-4 shrink-0">
                  {statusLabels[p.relationship_status] || '💚 Single'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                @{p.username}
                {(p.city || p.country) && ` • ${[p.city, p.country].filter(Boolean).join(', ')}`}
              </p>
            </div>
            {isConnected ? (
              <Badge variant="outline" className="rounded-xl text-[10px] shrink-0">
                <Check size={10} className="mr-0.5" /> Friends
              </Badge>
            ) : pendingIds.has(p.user_id) ? (
              <Badge variant="secondary" className="rounded-xl text-[10px] shrink-0">Pending</Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-7 text-xs shrink-0"
                disabled={sendingId === p.user_id}
                onClick={(e) => { e.stopPropagation(); sendRequest(p.user_id); }}
              >
                <UserPlus size={12} className="mr-1" /> Connect
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {!embedded && (
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Users className="text-primary" size={24} /> Friends</h1>
        )}
        <p className="text-sm text-muted-foreground">
          {embedded
            ? 'Friendship search — Connect creates a friends bond (not dating).'
            : 'Find people & send friendship connects'}
        </p>
      </motion.div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or username..." value={searchQuery} onChange={e => handleSearch(e.target.value)}
          className="pl-9 rounded-xl" />
      </div>

      {searchQuery.length >= 2 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {searching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </p>
          <AnimatePresence>
            {results.map(renderUser)}
          </AnimatePresence>
          {results.length === 0 && !searching && (
            <Card className="shadow-sm"><CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No users found</p>
            </CardContent></Card>
          )}
        </div>
      ) : (
        <>
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl lovli-gradient flex items-center justify-center text-primary-foreground">
                <Share2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Invite Friends</p>
                <p className="text-[10px] text-muted-foreground">Share your invite link</p>
              </div>
              <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={shareInvite}>Share</Button>
            </CardContent>
          </Card>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <MapPin size={12} /> People near you
              </h2>
              <AnimatePresence>
                {suggestions.map(renderUser)}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FriendsPage;
