import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Send, Gift, Calendar, Quote, Users, Sparkles, Check, X, UserPlus, Bell, Share2, Ban, Shield, Plus, TrendingUp, Loader2, Megaphone, MessageCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import TodaysPromptWidget from '@/components/home/TodaysPromptWidget';
import RelationshipTimeline from '@/components/home/RelationshipTimeline';
import SafetyModeWidget from '@/components/home/SafetyModeWidget';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import InstallPromptModal from '@/components/onboarding/InstallPromptModal';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const typeLabels: Record<string, string> = {
  be_my_valentine: '💝 Be My Valentine', date_proposal: '🌹 Date Proposal',
  anniversary_surprise: '🎉 Anniversary Surprise', custom_message: '💌 Custom Message',
};
const statusColors: Record<string, string> = {
  pending: 'bg-accent text-accent-foreground', accepted: 'bg-accent text-accent-foreground',
  declined: 'bg-destructive/10 text-destructive', expired: 'bg-muted text-muted-foreground', cancelled: 'bg-muted text-muted-foreground',
};

const safetyTips = [
  '🛡️ Always meet in public places first.',
  '📱 Tell a trusted person before meeting someone new.',
  '🚫 Never send money to someone you haven\'t met in person.',
  '👂 Trust your instincts — if something feels off, leave.',
  '📍 Share your location with a friend when going on dates.',
];

const HomePage = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const deferredPrompt = useInstallPrompt();
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [aiTip, setAiTip] = useState('');
  const [aiTipLoading, setAiTipLoading] = useState(false);
  const [safetyTip] = useState(safetyTips[Math.floor(Math.random() * safetyTips.length)]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Check onboarding + install prompt status
  useEffect(() => {
    if (!user) return;
    const checkOnboarding = async () => {
      const { data } = await supabase.from('user_settings').select('has_seen_onboarding, install_prompt_dismissed_at, install_prompt_installed, install_prompt_cooldown_days, preferred_install_prompt').eq('user_id', user.id).single();
      if (!data) return;

      if (!(data as any).has_seen_onboarding) {
        setShowOnboarding(true);
        return;
      }

      if ((data as any).install_prompt_installed || !(data as any).preferred_install_prompt) return;
      if (window.matchMedia('(display-mode: standalone)').matches) return;

      const dismissedAt = (data as any).install_prompt_dismissed_at;
      const cooldownDays = (data as any).install_prompt_cooldown_days || 7;
      if (dismissedAt) {
        const cooldownMs = cooldownDays * 86400000;
        if (Date.now() - new Date(dismissedAt).getTime() < cooldownMs) return;
      }
      setShowInstallPrompt(true);
    };
    checkOnboarding();
  }, [user]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (user) {
      await supabase.from('user_settings').update({ has_seen_onboarding: true, onboarding_completed_at: new Date().toISOString() } as any).eq('user_id', user.id);
    }
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => setShowInstallPrompt(true), 500);
    }
  };

  const handleInstallClose = async (installed?: boolean, dontShowAgain?: boolean) => {
    setShowInstallPrompt(false);
    if (!user) return;
    const updates: any = {};
    if (installed) {
      updates.install_prompt_installed = true;
    } else {
      updates.install_prompt_dismissed_at = new Date().toISOString();
    }
    if (dontShowAgain) {
      updates.preferred_install_prompt = false;
    }
    if (Object.keys(updates).length) {
      await supabase.from('user_settings').update(updates).eq('user_id', user.id);
    }
  };

  const loadData = useCallback(async () => {
    if (!profile || !user) return;

    const { count: conns } = await supabase.from('connections').select('*', { count: 'exact', head: true });
    setConnectionsCount(conns || 0);

    const { data: requests } = await supabase.from('connection_requests').select('*').eq('receiver_id', user.id).eq('status', 'pending');
    const enrichedReqs = await Promise.all((requests || []).map(async (req) => {
      const { data: sp } = await supabase.from('profiles').select('*').eq('user_id', req.sender_id).single();
      return { ...req, sender: sp };
    }));
    setPendingRequests(enrichedReqs);

    const { data: invites } = await supabase.from('invites').select('*').eq('sender_id', user.id).order('created_at', { ascending: false }).limit(10);
    setSentInvites(invites || []);

    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setNotifications(notifs || []);

    // Trending posts - score based with shares_count, prefer last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let { data: trending } = await supabase.from('community_posts').select('*').eq('is_deleted', false).eq('is_flagged', false).gte('created_at', sevenDaysAgo).order('likes_count', { ascending: false }).limit(20);
    if (!trending || trending.length < 5) {
      const { data: allTime } = await supabase.from('community_posts').select('*').eq('is_deleted', false).eq('is_flagged', false).order('likes_count', { ascending: false }).limit(20);
      trending = allTime || [];
    }
    const scored = trending.map(p => ({
      ...p,
      score: ((p.likes_count || 0) * 2) + ((p as any).shares_count || 0) * 3 + (p.comments_count || 0),
    })).sort((a, b) => b.score - a.score).slice(0, 5);
    if (scored.length) {
      const enrichedTrending = await Promise.all(scored.map(async p => {
        const { data: prof } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', p.user_id).single();
        return { ...p, profiles: prof };
      }));
      setTrendingPosts(enrichedTrending);
    }

    // Load active announcements
    const { data: anns } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
    const { data: dismissed } = await supabase.from('announcement_dismissals').select('announcement_id').eq('user_id', user.id);
    const dismissedIds = new Set((dismissed || []).map((d: any) => d.announcement_id));
    setDismissedAnnouncements(dismissedIds);
    setAnnouncements((anns || []).filter(a => !dismissedIds.has(a.id)));
  }, [profile, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load AI tip
  useEffect(() => {
    if (!user) return;
    const loadTip = async () => {
      setAiTipLoading(true);
      try {
        const { data } = await supabase.functions.invoke('quiz-ai', {
          body: { quizType: 'love-tip', inputs: {} },
        });
        setAiTip(data?.result || 'Love is patient, love is kind. ❤️');
      } catch {
        setAiTip('Small gestures make the biggest impact. ❤️');
      }
      setAiTipLoading(false);
    };
    loadTip();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('home-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => { setNotifications(prev => [payload.new as any, ...prev]); toast(payload.new.title as string, { description: payload.new.message as string }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invites', filter: `sender_id=eq.${user.id}` }, 
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSentInvites(prev => prev.map(inv => inv.id === (payload.new as any).id ? payload.new : inv));
          } else {
            loadData();
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const handleRequest = async (requestId: string, action: 'accepted' | 'declined', senderId: string) => {
    setProcessingRequest(requestId);
    await supabase.from('connection_requests').update({ status: action }).eq('id', requestId);
    const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single();
    await supabase.from('notifications').insert({
      user_id: senderId, type: action === 'accepted' ? 'request_accepted' : 'request_declined',
      title: action === 'accepted' ? 'Connection Accepted! 💕' : 'Connection Declined',
      message: `${myProfile?.full_name || 'Someone'} ${action} your connection request`, data: {},
    });
    if (action === 'accepted') {
      const { data: existingConn } = await supabase.from('connections').select('id')
        .or(`and(user1_id.eq.${senderId},user2_id.eq.${user!.id}),and(user1_id.eq.${user!.id},user2_id.eq.${senderId})`)
        .not('status', 'in', '("ended","blocked")')
        .maybeSingle();

      if (!existingConn) {
        // Discover connections start as friendship
        const { data: newConn } = await supabase.from('connections').insert({ 
          user1_id: senderId, user2_id: user!.id,
          origin_type: 'discover',
          relationship_track: 'friendship',
        } as any).select('id').single();
        if (newConn) {
          await supabase.from('connection_timeline_events').insert({ connection_id: newConn.id, event_type: 'connected', title: 'Connected 💕' });
        }
      }
      toast.success('Connection accepted! 💕');
    } else toast.success('Request declined');
    setProcessingRequest(null);
    loadData();
  };

  const cancelInvite = async (inviteId: string) => {
    await supabase.from('invites').update({ status: 'cancelled' as any }).eq('id', inviteId);
    toast.success('Invite cancelled');
    loadData();
  };

  const resendInvite = async (invite: any) => {
    const link = `${window.location.origin}/invite?token=${invite.token}`;
    if (navigator.share) {
      await navigator.share({ title: 'Lovli Invite 💕', text: `You've been sent a special invite on Lovli!`, url: link });
    } else {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied!');
    }
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const dismissAnnouncement = async (announcementId: string) => {
    await supabase.from('announcement_dismissals').insert({ user_id: user!.id, announcement_id: announcementId } as any);
    setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="p-4 space-y-5">
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      {showInstallPrompt && <InstallPromptModal deferredPrompt={deferredPrompt} onClose={handleInstallClose} />}

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Hey, {profile?.full_name?.split(' ')[0] || 'there'} 💕</h1>
          <p className="text-sm text-muted-foreground">Welcome back to Lovli</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Button>
          <div className="w-10 h-10 rounded-full overflow-hidden lovli-gradient flex items-center justify-center cursor-pointer" onClick={() => navigate('/profile')}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <Heart size={18} className="text-primary-foreground" fill="currentColor" />}
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="shadow-md border-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Notifications</p>
                  {unreadCount > 0 && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>Mark all read</Button>}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No notifications yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`p-2.5 rounded-xl text-xs ${n.is_read ? 'bg-muted/50' : 'bg-accent border border-primary/10'}`}>
                        <p className="font-bold">{n.title}</p>
                        <p className="text-muted-foreground">{n.message}</p>
                        <p className="text-muted-foreground/70 text-[10px] mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements Banner */}
      <AnimatePresence>
        {announcements.map(a => (
          <motion.div key={a.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="shadow-sm border-primary/30 bg-primary/5 cursor-pointer" onClick={() => navigate('/announcements')}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Megaphone size={16} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismissAnnouncement(a.id); }} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X size={14} />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show" className="space-y-2">
          <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide flex items-center gap-1"><UserPlus size={14} /> Connection Requests</h2>
          {pendingRequests.map(req => (
            <Card key={req.id} className="shadow-sm border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden shrink-0">
                  {req.sender?.avatar_url ? <img src={req.sender.avatar_url} alt="" className="w-full h-full object-cover" /> : req.sender?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{req.sender?.full_name || 'Someone'}</p>
                  <p className="text-[10px] text-muted-foreground">@{req.sender?.username} wants to connect</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="icon" className="h-8 w-8 rounded-xl lovli-gradient text-primary-foreground" disabled={processingRequest === req.id} onClick={() => handleRequest(req.id, 'accepted', req.sender_id)}><Check size={16} /></Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" disabled={processingRequest === req.id} onClick={() => handleRequest(req.id, 'declined', req.sender_id)}><X size={16} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* AI Daily Tip */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="lovli-gradient border-0 shadow-md">
          <CardContent className="p-4 flex items-start gap-3">
            <Quote size={20} className="text-primary-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-primary-foreground/70 font-bold mb-1">✨ AI Love Tip</p>
              {aiTipLoading ? <Loader2 size={16} className="text-primary-foreground animate-spin" /> : <p className="text-primary-foreground text-sm font-medium">{aiTip}</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
        
        {/* Find Love Card */}
        {profile?.relationship_status === 'single' && (
          <Card className="shadow-md border-primary/30 lovli-gradient cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate('/find-love')}>
            <CardContent className="p-4 flex items-center gap-3">
              <Heart size={24} className="text-primary-foreground" fill="currentColor" />
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-foreground">Find Love 💕</p>
                <p className="text-[10px] text-primary-foreground/70">Discover meaningful connections</p>
              </div>
              <Sparkles size={18} className="text-primary-foreground" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Send, label: 'Send Invite', action: () => navigate('/ask'), color: 'lovli-gradient' },
            { icon: Plus, label: 'Create Post', action: () => navigate('/discover'), color: 'bg-secondary' },
            { icon: Gift, label: 'Gift Quiz', action: () => navigate('/quizzes?type=gift'), color: 'lovli-gradient' },
            { icon: Calendar, label: 'Plan a Date', action: () => navigate('/quizzes?type=date'), color: 'bg-secondary' },
            { icon: Sparkles, label: 'Love Language', action: () => navigate('/quizzes?type=love-language'), color: 'lovli-gradient' },
            { icon: Users, label: 'Connections', action: () => navigate('/chats'), color: 'bg-secondary' },
          ].map(({ icon: Icon, label, action, color }) => (
            <Button key={label} variant="ghost" onClick={action}
              className={`w-full h-auto py-4 flex flex-col items-center gap-2 rounded-2xl ${color} text-primary-foreground shadow-md hover:opacity-90 hover:text-primary-foreground`}>
              <Icon size={22} /><span className="text-xs font-bold">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Today's Prompt */}
      <TodaysPromptWidget />

      {/* Relationship Timeline & Streak */}
      <RelationshipTimeline />

      {/* Safety Mode */}
      <SafetyModeWidget />

      {/* Sent Invites */}
      {sentInvites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Send size={14} /> Your Invites</h2>
          {sentInvites.map(inv => (
            <Card key={inv.id} className="shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{inv.receiver_name || 'Someone special'}</p>
                    <p className="text-[10px] text-muted-foreground">{typeLabels[inv.invite_type] || inv.invite_type}</p>
                  </div>
                  <Badge className={`rounded-full text-[10px] capitalize ${statusColors[inv.status] || ''}`}>{inv.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Sent {new Date(inv.created_at).toLocaleDateString()}</p>
                {inv.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => resendInvite(inv)}><Share2 size={12} className="mr-1" /> Share Link</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-destructive" onClick={() => cancelInvite(inv.id)}><Ban size={12} className="mr-1" /> Cancel</Button>
                    </div>
                  )}
                  {inv.status === 'accepted' && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-primary" onClick={() => navigate('/chats')}>Open Chat 💕</Button>
                  )}
                  {inv.status === 'expired' && (
                    <p className="text-[10px] text-muted-foreground">This invite has expired</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trending */}
      {trendingPosts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide flex items-center gap-1"><TrendingUp size={14} /> Trending in Discover</h2>
          {trendingPosts.map(p => (
            <Card key={p.id} className="shadow-sm cursor-pointer" onClick={() => navigate(`/u/${p.profiles?.username}`)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden shrink-0">
                  {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0" onClick={e => { e.stopPropagation(); navigate('/discover'); }}>
                  <p className="text-xs font-bold truncate">{p.profiles?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.content?.substring(0, 60)}...</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-0.5"><Heart size={10} fill="currentColor" /> {p.likes_count || 0}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {p.comments_count || 0}</span>
                  {(p as any).shares_count > 0 && <span className="flex items-center gap-0.5"><Share2 size={10} /> {(p as any).shares_count}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => navigate('/discover')}>
            See more in Discover →
          </Button>
        </div>
      )}

      {/* Connections count */}
      {connectionsCount > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users size={20} className="text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Your Connections</p>
              <p className="text-xs text-muted-foreground">{connectionsCount} active connections</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate('/chats')}>View</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomePage;
