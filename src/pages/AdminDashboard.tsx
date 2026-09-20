import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input as InputField } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, MessageCircle, Flag, Trash2, Users, ShieldCheck, AlertTriangle, Eye, CheckCircle, Ban, UserX, RefreshCw, Scale, Megaphone, BarChart3, TrendingUp, TrendingDown, Pencil, X, Check, CheckCheck } from 'lucide-react';
import { playNotificationSound } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Support chats
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  // Reports
  const [reports, setReports] = useState<any[]>([]);

  // Reported posts
  const [reportedPosts, setReportedPosts] = useState<any[]>([]);

  // Moderation queue
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<any[]>([]);

  // Appeals
  const [appeals, setAppeals] = useState<any[]>([]);
  const [appealResponseDialog, setAppealResponseDialog] = useState<any>(null);
  const [appealResponse, setAppealResponse] = useState('');

  // All users (for ban tab)
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [banDialogUser, setBanDialogUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');

  // Stats
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalReports: 0, pendingReports: 0, totalConnections: 0 });

  // Analytics
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementMsg, setNewAnnouncementMsg] = useState('');

  // Admin check
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      setIsAdmin(!!data);
      if (!data) navigate('/home');
    };
    checkAdmin();
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Get all unique users who sent support messages
    const { data: allChats } = await supabase.from('support_chats').select('*').order('created_at', { ascending: false });
    if (allChats) {
      const userMap = new Map<string, { userId: string; lastMessage: string; lastTime: string; unread: number }>();
      for (const msg of allChats) {
        if (!userMap.has(msg.user_id)) {
          userMap.set(msg.user_id, {
            userId: msg.user_id,
            lastMessage: msg.message,
            lastTime: msg.created_at,
            unread: !msg.is_admin ? 1 : 0,
          });
        } else if (!msg.is_admin) {
          const existing = userMap.get(msg.user_id)!;
          existing.unread += 1;
        }
      }
      const userIds = Array.from(userMap.keys());
      const enriched = await Promise.all(userIds.map(async uid => {
        const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url, email').eq('user_id', uid).single();
        return { ...userMap.get(uid)!, profile };
      }));
      setSupportUsers(enriched);
    }

    // Reports
    const { data: reps } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (reps) {
      const enrichedReports = await Promise.all(reps.map(async r => {
        const { data: reporter } = await supabase.from('profiles').select('full_name, username').eq('user_id', r.reporter_id).single();
        const { data: reported } = await supabase.from('profiles').select('full_name, username').eq('user_id', r.reported_user_id).single();
        return { ...r, reporter, reported };
      }));
      setReports(enrichedReports);
    }

    // Reported posts (posts that have been reported via details containing "Post:")
    const postReports = (reps || []).filter(r => r.details?.includes('Post:'));
    const postIds = postReports.map(r => r.details?.replace('Post: ', '').trim()).filter(Boolean);
    if (postIds.length > 0) {
      const { data: posts } = await supabase.from('community_posts').select('*').in('id', postIds);
      if (posts) {
        const enrichedPosts = await Promise.all(posts.map(async p => {
          const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('user_id', p.user_id).single();
          const relatedReports = postReports.filter(r => r.details?.includes(p.id));
          return { ...p, profile, reportCount: relatedReports.length };
        }));
        setReportedPosts(enrichedPosts);
      }
    }

    // All users
    const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setAllUsers(users || []);

    // Flagged posts (moderation queue)
    const { data: fPosts } = await supabase.from('community_posts').select('*').eq('is_flagged', true).eq('is_deleted', false).order('created_at', { ascending: false });
    if (fPosts) {
      const enrichedFlagged = await Promise.all(fPosts.map(async p => {
        const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', p.user_id).single();
        const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('details', `Post: ${p.id}`);
        return { ...p, profile, reportCount: count || 0 };
      }));
      setFlaggedPosts(enrichedFlagged);
    }

    // Flagged comments (moderation queue)
    const { data: fComments } = await supabase.from('post_comments').select('*').eq('is_flagged', true).eq('is_deleted', false).order('created_at', { ascending: false });
    if (fComments) {
      const enrichedFlaggedComments = await Promise.all(fComments.map(async c => {
        const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', c.user_id).single();
        return { ...c, profile };
      }));
      setFlaggedComments(enrichedFlaggedComments);
    }

    // Stats
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: totalPosts } = await supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
    const { count: totalReports } = await supabase.from('reports').select('*', { count: 'exact', head: true });
    const { count: pendingReports } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: totalConnections } = await supabase.from('connections').select('*', { count: 'exact', head: true });
    setStats({
      totalUsers: totalUsers || 0, totalPosts: totalPosts || 0,
      totalReports: totalReports || 0, pendingReports: pendingReports || 0,
      totalConnections: totalConnections || 0,
    });

    // Load appeals
    const { data: allAppeals } = await supabase.from('content_appeals').select('*').order('created_at', { ascending: false });
    if (allAppeals) {
      const enrichedAppeals = await Promise.all(allAppeals.map(async (a: any) => {
        const { data: profile } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('user_id', a.user_id).single();
        let contentPreview = '';
        if (a.content_type === 'post') {
          const { data: post } = await supabase.from('community_posts').select('content').eq('id', a.content_id).single();
          contentPreview = post?.content || '[deleted]';
        } else {
          const { data: comment } = await supabase.from('post_comments').select('content').eq('id', a.content_id).single();
          contentPreview = comment?.content || '[deleted]';
        }
        return { ...a, profile, contentPreview };
      }));
      setAppeals(enrichedAppeals);
    }

    // Weekly analytics (last 7 days)
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });

      const { count: newUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd);
      const { count: newPosts } = await supabase.from('community_posts').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd);
      const { count: newReports } = await supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd);
      const { count: newAppeals } = await supabase.from('content_appeals').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd);

      days.push({ day: label, users: newUsers || 0, posts: newPosts || 0, reports: newReports || 0, appeals: newAppeals || 0 });
    }
    setWeeklyData(days);

    // Announcements
    const { data: anns } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(anns || []);
  }, [user]);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  // Typing indicator state
  const [userTyping, setUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);

  // Load chat for selected user + realtime
  useEffect(() => {
    if (!selectedUser) return;
    const loadChat = async () => {
      const { data } = await supabase.from('support_chats').select('*').eq('user_id', selectedUser).order('created_at', { ascending: true });
      setChatMessages(data || []);
      // Mark user messages as read
      const unread = (data || []).filter(m => !m.is_admin && !m.is_read);
      if (unread.length > 0) {
        await supabase.from('support_chats').update({ is_read: true } as any).in('id', unread.map(m => m.id));
      }
    };
    loadChat();

    const channel = supabase.channel(`admin-support-rt-${selectedUser}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chats', filter: `user_id=eq.${selectedUser}` },
        (payload) => {
          const newMsg = payload.new as any;
          setChatMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (!newMsg.is_admin) {
            playNotificationSound('message');
            // Mark as read immediately
            supabase.from('support_chats').update({ is_read: true } as any).eq('id', newMsg.id);
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_chats', filter: `user_id=eq.${selectedUser}` },
        (payload) => {
          setChatMessages(prev => prev.map(m => m.id === (payload.new as any).id ? payload.new as any : m));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_chats', filter: `user_id=eq.${selectedUser}` },
        (payload) => {
          setChatMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        })
      .subscribe();

    const presenceChannel = supabase.channel(`support-presence-${selectedUser}`, {
      config: { presence: { key: `admin-${user!.id}` } },
    });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const isTyping = Object.values(state).flat().some(
          (p: any) => p.role === 'user' && p.typing
        );
        setUserTyping(isTyping);
      })
      .subscribe();
    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [selectedUser, user]);

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState('');

  const broadcastAdminTyping = (typing: boolean) => {
    presenceChannelRef.current?.track({ role: 'admin', typing });
  };

  const handleReplyInput = (value: string) => {
    setReplyText(value);
    broadcastAdminTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastAdminTyping(false), 2000);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUser) return;
    broadcastAdminTyping(false);
    const { data } = await supabase.from('support_chats').insert({
      user_id: selectedUser,
      message: replyText.trim(),
      is_admin: true,
    }).select().single();
    if (data) {
      setChatMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
    setReplyText('');
    toast.success('Reply sent');
  };

  const editSupportMsg = async (id: string) => {
    if (!editMsgText.trim()) return;
    await supabase.from('support_chats').update({ message: editMsgText.trim() } as any).eq('id', id);
    setChatMessages(prev => prev.map(m => m.id === id ? { ...m, message: editMsgText.trim() } : m));
    setEditingMsgId(null);
    setEditMsgText('');
    toast.success('Message updated');
  };

  const deleteSupportMsg = async (id: string) => {
    await supabase.from('support_chats').delete().eq('id', id);
    setChatMessages(prev => prev.filter(m => m.id !== id));
    toast.success('Message deleted');
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    await supabase.from('reports').update({ status } as any).eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    toast.success(`Report marked as ${status}`);
  };

  const deletePost = async (postId: string) => {
    await supabase.from('community_posts').update({ is_deleted: true } as any).eq('id', postId);
    setReportedPosts(prev => prev.filter(p => p.id !== postId));
    setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('Post removed');
  };

  const restorePost = async (postId: string) => {
    await supabase.from('community_posts').update({ is_flagged: false } as any).eq('id', postId);
    setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('Post restored and visible to users');
  };

  const deleteFlaggedComment = async (commentId: string) => {
    await supabase.from('post_comments').update({ is_deleted: true, content: 'This comment was removed by a moderator' } as any).eq('id', commentId);
    setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
    toast.success('Comment removed');
  };

  const restoreComment = async (commentId: string) => {
    await supabase.from('post_comments').update({ is_flagged: false } as any).eq('id', commentId);
    setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
    toast.success('Comment restored');
  };

  const handleAppealDecision = async (appealId: string, decision: 'approved' | 'rejected') => {
    const appeal = appeals.find(a => a.id === appealId);
    if (!appeal) return;
    
    await supabase.from('content_appeals').update({ 
      status: decision, 
      admin_response: appealResponse.trim() || (decision === 'approved' ? 'Content restored.' : 'Appeal denied.') 
    } as any).eq('id', appealId);

    if (decision === 'approved') {
      if (appeal.content_type === 'post') {
        await supabase.from('community_posts').update({ is_flagged: false } as any).eq('id', appeal.content_id);
        setFlaggedPosts(prev => prev.filter(p => p.id !== appeal.content_id));
      } else {
        await supabase.from('post_comments').update({ is_flagged: false } as any).eq('id', appeal.content_id);
        setFlaggedComments(prev => prev.filter(c => c.id !== appeal.content_id));
      }
    }

    setAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status: decision } : a));
    setAppealResponseDialog(null);
    setAppealResponse('');
    toast.success(`Appeal ${decision}`);
    loadData();
  };

  const banUser = async (userId: string, reason: string) => {
    await supabase.from('profiles').update({ is_banned: true, banned_at: new Date().toISOString(), ban_reason: reason.trim() || 'Violated community guidelines' } as any).eq('user_id', userId);
    setAllUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_banned: true, ban_reason: reason } : u));
    setBanDialogUser(null);
    setBanReason('');
    toast.success('User banned');
  };

  const unbanUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_banned: false, banned_at: null, ban_reason: null } as any).eq('user_id', userId);
    setAllUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_banned: false, ban_reason: null } : u));
    toast.success('User unbanned');
  };

  const sendAnnouncement = async () => {
    if (!newAnnouncementTitle.trim() || !newAnnouncementMsg.trim()) { toast.error('Title and message required'); return; }
    await supabase.from('announcements').insert({ admin_id: user!.id, title: newAnnouncementTitle.trim(), message: newAnnouncementMsg.trim() } as any);
    setNewAnnouncementTitle('');
    setNewAnnouncementMsg('');
    toast.success('Announcement broadcast to all users! 📢');
    loadData();
  };

  const toggleAnnouncement = async (id: string, isActive: boolean) => {
    await supabase.from('announcements').update({ is_active: !isActive } as any).eq('id', id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a));
    toast.success(isActive ? 'Announcement hidden' : 'Announcement restored');
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast.success('Announcement deleted');
  };

  if (isAdmin === null) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}><ArrowLeft size={20} /></Button>
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><ShieldCheck className="text-primary" size={24} /> Admin</h1>
          <p className="text-xs text-muted-foreground">Manage support, reports & moderation</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Users', value: stats.totalUsers, icon: Users },
          { label: 'Posts', value: stats.totalPosts, icon: Eye },
          { label: 'Reports', value: stats.pendingReports, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Icon size={14} className="mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="w-full overflow-x-auto flex gap-0">
          <TabsTrigger value="analytics" className="text-[9px] flex-1">📊 Stats</TabsTrigger>
          <TabsTrigger value="moderation" className="text-[9px] flex-1">🛡️ Queue</TabsTrigger>
          <TabsTrigger value="appeals" className="text-[9px] flex-1">⚖️ Appeals</TabsTrigger>
          <TabsTrigger value="announce" className="text-[9px] flex-1">📢 Broadcast</TabsTrigger>
          <TabsTrigger value="support" className="text-[9px] flex-1">💬 Chat</TabsTrigger>
          <TabsTrigger value="reports" className="text-[9px] flex-1">🚩 Reports</TabsTrigger>
          <TabsTrigger value="posts" className="text-[9px] flex-1">📝 Posts</TabsTrigger>
          <TabsTrigger value="users" className="text-[9px] flex-1">👥 Users</TabsTrigger>
        </TabsList>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4 mt-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><BarChart3 size={14} /> Weekly Trends (Last 7 Days)</h3>
          
          {weeklyData.length > 0 ? (
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2">New Users & Posts</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Users" />
                      <Bar dataKey="posts" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Posts" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Reports & Appeals</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="reports" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Reports" />
                      <Bar dataKey="appeals" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Appeals" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const thisWeek = weeklyData.reduce((s, d) => s + d.users, 0);
                  const postsWeek = weeklyData.reduce((s, d) => s + d.posts, 0);
                  const reportsWeek = weeklyData.reduce((s, d) => s + d.reports, 0);
                  const appealsWeek = weeklyData.reduce((s, d) => s + d.appeals, 0);
                  return [
                    { label: 'New Users', value: thisWeek, icon: Users },
                    { label: 'New Posts', value: postsWeek, icon: Eye },
                    { label: 'Reports', value: reportsWeek, icon: Flag },
                    { label: 'Appeals', value: appealsWeek, icon: Scale },
                  ].map(({ label, value, icon: Icon }) => (
                    <Card key={label} className="shadow-sm">
                      <CardContent className="p-2.5 flex items-center gap-2">
                        <Icon size={12} className="text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-bold">{value}</p>
                          <p className="text-[9px] text-muted-foreground">{label} this week</p>
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-6">Loading analytics...</p>
          )}
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announce" className="space-y-3 mt-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><Megaphone size={14} /> Broadcast Announcements</h3>
          
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-3 space-y-2">
              <InputField placeholder="Announcement title" value={newAnnouncementTitle} onChange={e => setNewAnnouncementTitle(e.target.value)} className="rounded-xl" />
              <Textarea placeholder="Message to all users..." value={newAnnouncementMsg} onChange={e => setNewAnnouncementMsg(e.target.value)} className="rounded-xl min-h-[60px]" />
              <Button className="w-full rounded-xl lovli-gradient text-primary-foreground text-xs h-8" onClick={sendAnnouncement} disabled={!newAnnouncementTitle.trim() || !newAnnouncementMsg.trim()}>
                <Megaphone size={12} className="mr-1" /> Send to All Users
              </Button>
            </CardContent>
          </Card>

          {announcements.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No announcements yet</p>}
          {announcements.map(a => (
            <Card key={a.id} className={`shadow-sm ${!a.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{a.title}</p>
                  <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-[9px] rounded-full">
                    {a.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{a.message}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1" onClick={() => toggleAnnouncement(a.id, a.is_active)}>
                    {a.is_active ? <><Eye size={10} className="mr-1" /> Hide</> : <><RefreshCw size={10} className="mr-1" /> Show</>}
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-xl text-xs h-7 flex-1" onClick={() => deleteAnnouncement(a.id)}>
                    <Trash2 size={10} className="mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Moderation Queue */}
        <TabsContent value="moderation" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Flagged Content</h3>
            <Badge variant="secondary" className="text-[9px] rounded-full">{flaggedPosts.length + flaggedComments.length} items</Badge>
          </div>

          {flaggedPosts.length === 0 && flaggedComments.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">✨ No flagged content to review</p>
          )}

          {flaggedPosts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Flagged Posts</p>
              {flaggedPosts.map(p => (
                <Card key={p.id} className="shadow-sm border-destructive/20">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-[10px] font-bold overflow-hidden shrink-0">
                          {p.profile?.avatar_url ? <img src={p.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profile?.full_name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{p.profile?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">@{p.profile?.username}</p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-[9px] rounded-full">{p.reportCount} report{p.reportCount !== 1 ? 's' : ''}</Badge>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded-xl">{p.content}</p>
                    {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-[120px] object-cover rounded-xl" />}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1" onClick={() => restorePost(p.id)}>
                        <RefreshCw size={10} className="mr-1" /> Restore
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-xl text-xs h-7 flex-1" onClick={() => deletePost(p.id)}>
                        <Trash2 size={10} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {flaggedComments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Flagged Comments</p>
              {flaggedComments.map(c => (
                <Card key={c.id} className="shadow-sm border-destructive/20">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-[9px] font-bold overflow-hidden shrink-0">
                        {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : c.profile?.full_name?.[0] || '?'}
                      </div>
                      <p className="text-xs font-bold">{c.profile?.full_name}</p>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded-xl">{c.content}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1" onClick={() => restoreComment(c.id)}>
                        <RefreshCw size={10} className="mr-1" /> Restore
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-xl text-xs h-7 flex-1" onClick={() => deleteFlaggedComment(c.id)}>
                        <Trash2 size={10} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Appeals */}
        <TabsContent value="appeals" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Content Appeals</h3>
            <Badge variant="secondary" className="text-[9px] rounded-full">
              {appeals.filter(a => a.status === 'pending').length} pending
            </Badge>
          </div>
          {appeals.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No appeals yet</p>}
          {appeals.map(a => (
            <Card key={a.id} className={`shadow-sm ${a.status === 'pending' ? 'border-primary/30' : ''}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-[9px] font-bold overflow-hidden shrink-0">
                      {a.profile?.avatar_url ? <img src={a.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : a.profile?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{a.profile?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{a.profile?.username} · {a.content_type}</p>
                    </div>
                  </div>
                  <Badge className={`text-[9px] rounded-full capitalize ${
                    a.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    a.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>{a.status}</Badge>
                </div>
                <div className="bg-muted p-2 rounded-xl text-sm">{a.contentPreview}</div>
                <p className="text-[10px] text-muted-foreground"><span className="font-bold">Appeal reason:</span> {a.reason}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                {a.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1"
                      onClick={() => { setAppealResponseDialog(a); setAppealResponse(''); }}>
                      <Scale size={10} className="mr-1" /> Review
                    </Button>
                  </div>
                )}
                {a.admin_response && (
                  <p className="text-[10px] bg-primary/5 p-1.5 rounded-lg"><span className="font-bold">Your response:</span> {a.admin_response}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>


        <TabsContent value="support" className="space-y-3 mt-3">
          {selectedUser ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedUser(null)}>
                <ArrowLeft size={14} className="mr-1" /> Back to all chats
              </Button>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto p-3 space-y-2 bg-muted/30">
                  {chatMessages.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No messages</p>}
                  {chatMessages.map((msg) => (
                    <motion.div key={msg.id || msg.created_at} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'} group`}>
                      <div className="flex flex-col gap-0.5 max-w-[80%]">
                        {editingMsgId === msg.id ? (
                          <div className="flex items-center gap-1">
                            <Input value={editMsgText} onChange={e => setEditMsgText(e.target.value)} className="rounded-xl text-sm flex-1"
                              onKeyDown={e => e.key === 'Enter' && editSupportMsg(msg.id)} autoFocus />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editSupportMsg(msg.id)}><Check size={14} /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingMsgId(null)}><X size={14} /></Button>
                          </div>
                        ) : (
                          <>
                            <div className={`px-3 py-2 rounded-2xl text-sm ${
                              msg.is_admin ? 'lovli-gradient text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'
                            }`}>
                              {msg.is_admin && <p className="text-[9px] font-bold mb-0.5 opacity-70">Admin</p>}
                              {msg.message}
                              <div className={`flex items-center gap-1 mt-1 ${msg.is_admin ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                <span className="text-[9px]">{new Date(msg.created_at).toLocaleString()}</span>
                                {msg.is_admin && (
                                  <CheckCheck size={12} className={msg.is_read ? 'text-blue-400' : 'opacity-50'} />
                                )}
                              </div>
                            </div>
                            {msg.is_admin && (
                              <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.is_admin ? 'self-end' : 'self-start'}`}>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingMsgId(msg.id); setEditMsgText(msg.message); }}>
                                  <Pencil size={11} />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteSupportMsg(msg.id)}>
                                  <Trash2 size={11} />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {userTyping && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-border bg-card flex gap-2">
                  <Input value={replyText} onChange={e => handleReplyInput(e.target.value)} placeholder="Reply as admin..."
                    className="rounded-xl flex-1" onKeyDown={e => e.key === 'Enter' && sendReply()} />
                  <Button size="icon" onClick={sendReply} className="rounded-xl lovli-gradient text-primary-foreground shrink-0"><Send size={16} /></Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {supportUsers.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No support messages yet</p>}
              {supportUsers.map(su => (
                <Card key={su.userId} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedUser(su.userId)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden shrink-0">
                      {su.profile?.avatar_url ? <img src={su.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : su.profile?.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{su.profile?.full_name || 'Unknown'}</p>
                        {su.unread > 0 && <Badge className="bg-destructive text-destructive-foreground text-[9px] rounded-full px-1.5 h-4">{su.unread}</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">@{su.profile?.username} · {su.profile?.email}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{su.lastMessage}</p>
                    </div>
                    <MessageCircle size={16} className="text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-2 mt-3">
          {reports.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No reports</p>}
          {reports.map(r => (
            <Card key={r.id} className="shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag size={14} className="text-destructive" />
                    <p className="text-sm font-bold capitalize">{r.reason.replace(/_/g, ' ')}</p>
                  </div>
                  <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'} className="text-[9px] rounded-full capitalize">{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p><span className="font-bold">Reporter:</span> {r.reporter?.full_name} (@{r.reporter?.username})</p>
                  <p><span className="font-bold">Reported:</span> {r.reported?.full_name} (@{r.reported?.username})</p>
                  {r.details && <p><span className="font-bold">Details:</span> {r.details}</p>}
                  <p className="text-[10px]">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1" onClick={() => updateReportStatus(r.id, 'reviewed')}>
                      <Eye size={10} className="mr-1" /> Reviewed
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1" onClick={() => updateReportStatus(r.id, 'resolved')}>
                      <CheckCircle size={10} className="mr-1" /> Resolved
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 flex-1 text-destructive" onClick={() => updateReportStatus(r.id, 'action_taken')}>
                      <AlertTriangle size={10} className="mr-1" /> Action
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Reported Posts */}
        <TabsContent value="posts" className="space-y-2 mt-3">
          {reportedPosts.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No reported posts</p>}
          {reportedPosts.map(p => (
            <Card key={p.id} className="shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-[10px] font-bold">{p.profile?.full_name?.[0] || '?'}</div>
                    <div>
                      <p className="text-xs font-bold">{p.profile?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{p.profile?.username}</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-[9px] rounded-full">{p.reportCount} report{p.reportCount > 1 ? 's' : ''}</Badge>
                </div>
                <p className="text-sm bg-muted p-2 rounded-xl">{p.content}</p>
                {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-[150px] object-cover rounded-xl" />}
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="rounded-xl text-xs h-7 flex-1" onClick={() => deletePost(p.id)}>
                    <Trash2 size={10} className="mr-1" /> Remove Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Users / Ban */}
        <TabsContent value="users" className="space-y-3 mt-3">
          <InputField placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="rounded-xl" />
          {allUsers
            .filter(u => {
              if (!userSearch.trim()) return true;
              const q = userSearch.toLowerCase();
              return u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
            })
            .slice(0, 50)
            .map(u => (
              <Card key={u.id} className={`shadow-sm ${u.is_banned ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden shrink-0">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{u.full_name || 'No name'}</p>
                      {u.is_banned && <Badge variant="destructive" className="text-[8px] rounded-full px-1.5 h-4">BANNED</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">@{u.username} · {u.email}</p>
                    {u.ban_reason && <p className="text-[10px] text-destructive truncate">Reason: {u.ban_reason}</p>}
                  </div>
                  {u.is_banned ? (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 shrink-0" onClick={() => unbanUser(u.user_id)}>
                      <CheckCircle size={10} className="mr-1" /> Unban
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 text-destructive shrink-0" onClick={() => { setBanDialogUser(u); setBanReason(''); }}>
                      <Ban size={10} className="mr-1" /> Ban
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* Ban Dialog */}
      <Dialog open={!!banDialogUser} onOpenChange={() => setBanDialogUser(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserX size={20} className="text-destructive" /> Ban User</DialogTitle>
            <DialogDescription>Ban {banDialogUser?.full_name} (@{banDialogUser?.username})?</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for ban (optional)" value={banReason} onChange={e => setBanReason(e.target.value)} className="rounded-xl" />
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setBanDialogUser(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-2xl" onClick={() => banDialogUser && banUser(banDialogUser.user_id, banReason)}>Ban User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appeal Review Dialog */}
      <Dialog open={!!appealResponseDialog} onOpenChange={() => setAppealResponseDialog(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Scale size={20} className="text-primary" /> Review Appeal</DialogTitle>
            <DialogDescription>
              {appealResponseDialog?.profile?.full_name} is appealing a flagged {appealResponseDialog?.content_type}.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-2 rounded-xl text-sm">{appealResponseDialog?.contentPreview}</div>
          <p className="text-xs text-muted-foreground"><span className="font-bold">Reason:</span> {appealResponseDialog?.reason}</p>
          <Textarea placeholder="Response to user (optional)" value={appealResponse} onChange={e => setAppealResponse(e.target.value)} className="rounded-xl" />
          <DialogFooter className="flex gap-2">
            <Button variant="destructive" className="flex-1 rounded-2xl text-xs" onClick={() => appealResponseDialog && handleAppealDecision(appealResponseDialog.id, 'rejected')}>
              Reject
            </Button>
            <Button className="flex-1 rounded-2xl text-xs lovli-gradient text-primary-foreground" onClick={() => appealResponseDialog && handleAppealDecision(appealResponseDialog.id, 'approved')}>
              Approve & Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
