import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Send, Gift, Calendar, Quote, Users, Check, X, UserPlus, Bell, Share2, Ban, Loader2, Megaphone, Compass, HeartHandshake, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import InstallPromptModal from '@/components/onboarding/InstallPromptModal';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { resolveNotificationPath } from '@/lib/notificationNav';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notificationTypes';
import { INTENT_OPTIONS } from '@/components/onboarding/OnboardingModal';
import { shareUrl } from '@/lib/appUrl';

const typeLabels: Record<string, string> = {
  be_my_valentine: '💝 Be My Valentine', date_proposal: '🌹 Date Proposal',
  anniversary_surprise: '🎉 Anniversary Surprise', custom_message: '💌 Custom Message',
};
const statusColors: Record<string, string> = {
  pending: 'bg-accent text-accent-foreground', accepted: 'bg-accent text-accent-foreground',
  declined: 'bg-destructive/10 text-destructive', expired: 'bg-muted text-muted-foreground', cancelled: 'bg-muted text-muted-foreground',
};

const HomePage = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const deferredPrompt = useInstallPrompt();
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [datingMatchRequests, setDatingMatchRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [aiTipLoading, setAiTipLoading] = useState(false);
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

    const { data: matchReqs } = await (supabase.from as any)('dating_match_requests')
      .select('*')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);
    const enrichedMatches = await Promise.all((matchReqs || []).map(async (req: any) => {
      const { data: sp } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', req.from_user_id).single();
      return { ...req, sender: sp };
    }));
    setDatingMatchRequests(enrichedMatches);

    // Load active announcements
    const { data: anns } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
    const { data: dismissed } = await supabase.from('announcement_dismissals').select('announcement_id').eq('user_id', user.id);
    const dismissedIds = new Set((dismissed || []).map((d: any) => d.announcement_id));
    setDismissedAnnouncements(dismissedIds);
    setAnnouncements((anns || []).filter(a => !dismissedIds.has(a.id)));
  }, [profile, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load AI tip — regenerate at most once every 24 hours
  useEffect(() => {
    if (!user) return;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const fallbackTip = 'Small gestures make the biggest impact. ❤️';

    const loadTip = async () => {
      setAiTipLoading(true);
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('last_love_tip, last_love_tip_at')
          .eq('user_id', user.id)
          .maybeSingle();

        const cachedTip = (settings as any)?.last_love_tip as string | null | undefined;
        const cachedAt = (settings as any)?.last_love_tip_at as string | null | undefined;

        if (cachedTip && cachedAt) {
          const ageMs = Date.now() - new Date(cachedAt).getTime();
          if (ageMs < TWENTY_FOUR_HOURS_MS) {
            setAiTip(cachedTip);
            setAiTipLoading(false);
            return;
          }
        }

        const { data, error } = await supabase.functions.invoke('quiz-ai', {
          body: { quizType: 'love-tip', inputs: {} },
        });

        if (error) throw error;

        const tip = (data?.result || fallbackTip).trim() || fallbackTip;
        setAiTip(tip);

        await supabase
          .from('user_settings')
          .update({
            last_love_tip: tip,
            last_love_tip_at: new Date().toISOString(),
          } as any)
          .eq('user_id', user.id);
      } catch {
        setAiTip(fallbackTip);
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const handleRequest = async (requestId: string, action: 'accepted' | 'declined', senderId: string) => {
    setProcessingRequest(requestId);
    await supabase.from('connection_requests').update({ status: action }).eq('id', requestId);
    const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single();
    let connectionId: string | undefined;
    if (action === 'accepted') {
      const { data: existingConn } = await supabase.from('connections').select('id')
        .or(`and(user1_id.eq.${senderId},user2_id.eq.${user!.id}),and(user1_id.eq.${user!.id},user2_id.eq.${senderId})`)
        .not('status', 'in', '("ended","blocked")')
        .maybeSingle();

      if (!existingConn) {
        const { data: newConn } = await supabase.from('connections').insert({
          user1_id: senderId, user2_id: user!.id,
          origin_type: 'friends',
          relationship_track: 'friendship',
        } as any).select('id').single();
        if (newConn) {
          connectionId = newConn.id;
          await supabase.from('connection_timeline_events').insert({ connection_id: newConn.id, event_type: 'connected', title: 'Connected as friends 🤝' });
        }
      } else {
        connectionId = existingConn.id;
      }
      toast.success('Friendship accepted');
    } else {
      toast.success('Request declined');
    }

    await createNotification({
      userId: senderId,
      type: action === 'accepted' ? NOTIFICATION_TYPES.request_accepted : NOTIFICATION_TYPES.request_declined,
      title: action === 'accepted' ? 'Friendship accepted' : 'Connection declined',
      message: `${myProfile?.full_name || 'Someone'} ${action === 'accepted' ? 'accepted' : 'declined'} your friendship request`,
      actorId: user!.id,
      data: connectionId
        ? { connection_id: connectionId, url: `/connection/${connectionId}` }
        : { url: '/home' },
    });

    setProcessingRequest(null);
    loadData();
  };

  const openNotification = async (n: any) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    setShowNotifications(false);
    navigate(resolveNotificationPath(n));
  };

  const cancelInvite = async (inviteId: string) => {
    await supabase.from('invites').update({ status: 'cancelled' as any }).eq('id', inviteId);
    toast.success('Invite cancelled');
    loadData();
  };

  const resendInvite = async (invite: any) => {
    const link = shareUrl(`/invite?token=${invite.token}`);
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
          <div className="w-10 h-10 rounded-full overflow-hidden lovli-gradient flex items-center justify-center cursor-pointer" onClick={() => navigate('/you')}>
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
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs cursor-pointer ${n.is_read ? 'bg-muted/50' : 'bg-accent border border-primary/10'}`}
                        onClick={() => openNotification(n)}
                      >
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

      {/* Dating match requests */}
      {datingMatchRequests.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show" className="space-y-2">
          <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Heart size={14} /> Dating Matches
          </h2>
          {datingMatchRequests.map(req => (
            <Card key={req.id} className="shadow-sm border-primary/20 cursor-pointer" onClick={() => navigate('/meet?tab=dating')}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden shrink-0">
                  {req.sender?.avatar_url ? <img src={req.sender.avatar_url} alt="" className="w-full h-full object-cover" /> : req.sender?.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{req.sender?.full_name || 'Someone'}</p>
                  <p className="text-[10px] text-muted-foreground">Wants to match — open Dating to approve</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Pending</Badge>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Intent shortcut from onboarding */}
      {(profile as any)?.primary_intent && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="shadow-sm cursor-pointer" onClick={() => {
            const intent = (profile as any).primary_intent;
            if (intent === 'invite') navigate('/meet?tab=invite');
            else if (intent === 'dating') navigate('/meet?tab=dating');
            else if (intent === 'friends') navigate('/meet?tab=people');
            else navigate('/grow');
          }}>
            <CardContent className="p-3 flex items-center gap-2">
              <Sparkles size={16} className="text-primary shrink-0" />
              <p className="text-xs flex-1">
                Your focus:{' '}
                <span className="font-bold">
                  {INTENT_OPTIONS.find((o) => o.value === (profile as any).primary_intent)?.label || (profile as any).primary_intent}
                </span>
              </p>
              <span className="text-[10px] text-primary font-semibold">Go →</span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Daily Tip */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="lovli-gradient border-0 shadow-md cursor-pointer" onClick={() => navigate('/grow')}>
          <CardContent className="p-4 flex items-start gap-3">
            <Quote size={20} className="text-primary-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-primary-foreground/70 font-bold mb-1">✨ AI Love Tip · tap Grow for more</p>
              {aiTipLoading ? <Loader2 size={16} className="text-primary-foreground animate-spin" /> : <p className="text-primary-foreground text-sm font-medium">{aiTip}</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Shortcuts */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide">Go somewhere</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: HeartHandshake, label: 'Meet · Invite', action: () => navigate('/meet?tab=invite'), color: 'lovli-gradient' },
            { icon: Heart, label: 'Meet · Dating', action: () => navigate('/meet?tab=dating'), color: 'bg-secondary' },
            { icon: Users, label: 'Meet · People', action: () => navigate('/meet?tab=people'), color: 'bg-secondary' },
            { icon: Compass, label: 'Discover', action: () => navigate('/discover'), color: 'lovli-gradient' },
            { icon: Sparkles, label: 'Grow', action: () => navigate('/grow'), color: 'lovli-gradient' },
            { icon: Gift, label: 'Quizzes', action: () => navigate('/quizzes'), color: 'bg-secondary' },
          ].map(({ icon: Icon, label, action, color }) => (
            <Button key={label} variant="ghost" onClick={action}
              className={`w-full h-auto py-4 flex flex-col items-center gap-2 rounded-2xl ${color} text-primary-foreground shadow-md hover:opacity-90 hover:text-primary-foreground`}>
              <Icon size={22} /><span className="text-xs font-bold">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Pending sent invites (actionable) */}
      {sentInvites.filter(i => i.status === 'pending').length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-display text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Send size={14} /> Waiting on replies</h2>
          {sentInvites.filter(i => i.status === 'pending').slice(0, 5).map(inv => (
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
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => resendInvite(inv)}><Share2 size={12} className="mr-1" /> Share</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-destructive" onClick={() => cancelInvite(inv.id)}><Ban size={12} className="mr-1" /> Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connections count */}
      {connectionsCount > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users size={20} className="text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Your bonds</p>
              <p className="text-xs text-muted-foreground">{connectionsCount} active · open Chats</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate('/chats')}>View</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomePage;
