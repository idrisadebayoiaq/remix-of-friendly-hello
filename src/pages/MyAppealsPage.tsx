import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const MyAppealsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [appealDialog, setAppealDialog] = useState<{ contentType: string; contentId: string } | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Load my flagged posts
    const { data: posts } = await supabase
      .from('community_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_flagged', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    setFlaggedPosts(posts || []);

    // Load my flagged comments
    const { data: comments } = await supabase
      .from('post_comments')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_flagged', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    setFlaggedComments(comments || []);

    // Load my appeals
    const { data: myAppeals } = await supabase
      .from('content_appeals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAppeals(myAppeals || []);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const hasAppeal = (contentId: string) => appeals.some(a => a.content_id === contentId);
  const getAppeal = (contentId: string) => appeals.find(a => a.content_id === contentId);

  const submitAppeal = async () => {
    if (!appealDialog || !appealReason.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('content_appeals').insert({
      user_id: user!.id,
      content_type: appealDialog.contentType,
      content_id: appealDialog.contentId,
      reason: appealReason.trim(),
    } as any);
    if (error) {
      toast.error(error.code === '23505' ? 'Appeal already submitted' : 'Failed to submit');
    } else {
      toast.success('Appeal submitted! An admin will review it shortly.');
      setAppealDialog(null);
      setAppealReason('');
      loadData();
    }
    setSubmitting(false);
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle size={12} className="text-green-500" />;
    if (status === 'rejected') return <XCircle size={12} className="text-destructive" />;
    return <Clock size={12} className="text-muted-foreground" />;
  };

  const statusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'rejected') return 'bg-destructive/10 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-4 space-y-4">
      <BackHeader title="My Appeals" />

      {flaggedPosts.length === 0 && flaggedComments.length === 0 && appeals.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">You have no flagged content. Keep being awesome! 💕</p>
        </div>
      )}

      {/* Flagged Posts */}
      {flaggedPosts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Flagged Posts</p>
          {flaggedPosts.map(p => {
            const appeal = getAppeal(p.id);
            return (
              <Card key={p.id} className="shadow-sm border-destructive/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-destructive" />
                      <p className="text-xs font-bold text-destructive">Post Flagged</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm bg-muted p-2 rounded-xl">{p.content}</p>
                  {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-[100px] object-cover rounded-xl" />}
                  {appeal ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(appeal.status)}
                        <Badge className={`text-[9px] rounded-full capitalize ${statusColor(appeal.status)}`}>{appeal.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Your reason: {appeal.reason}</p>
                      {appeal.admin_response && (
                        <p className="text-[10px] text-foreground bg-muted p-1.5 rounded-lg">
                          <span className="font-bold">Admin:</span> {appeal.admin_response}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 w-full"
                      onClick={() => setAppealDialog({ contentType: 'post', contentId: p.id })}>
                      <Send size={10} className="mr-1" /> Appeal This Decision
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Flagged Comments */}
      {flaggedComments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Flagged Comments</p>
          {flaggedComments.map(c => {
            const appeal = getAppeal(c.id);
            return (
              <Card key={c.id} className="shadow-sm border-destructive/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-destructive" />
                      <p className="text-xs font-bold text-destructive">Comment Flagged</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm bg-muted p-2 rounded-xl">{c.content}</p>
                  {appeal ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(appeal.status)}
                        <Badge className={`text-[9px] rounded-full capitalize ${statusColor(appeal.status)}`}>{appeal.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Your reason: {appeal.reason}</p>
                      {appeal.admin_response && (
                        <p className="text-[10px] text-foreground bg-muted p-1.5 rounded-lg">
                          <span className="font-bold">Admin:</span> {appeal.admin_response}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 w-full"
                      onClick={() => setAppealDialog({ contentType: 'comment', contentId: c.id })}>
                      <Send size={10} className="mr-1" /> Appeal This Decision
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Past Appeals with no active flagged content */}
      {flaggedPosts.length === 0 && flaggedComments.length === 0 && appeals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Appeal History</p>
          {appeals.map(a => (
            <Card key={a.id} className="shadow-sm">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(a.status)}
                    <Badge className={`text-[9px] rounded-full capitalize ${statusColor(a.status)}`}>{a.status}</Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">{a.content_type}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">Your reason: {a.reason}</p>
                {a.admin_response && (
                  <p className="text-[10px] text-foreground bg-muted p-1.5 rounded-lg">
                    <span className="font-bold">Admin:</span> {a.admin_response}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Appeal Dialog */}
      <Dialog open={!!appealDialog} onOpenChange={() => setAppealDialog(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send size={18} className="text-primary" /> Submit Appeal
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Explain why you believe this content should not have been flagged. An admin will review your appeal.</p>
          <Textarea
            placeholder="I believe this content was flagged incorrectly because..."
            value={appealReason}
            onChange={e => setAppealReason(e.target.value)}
            className="rounded-xl min-h-[100px]"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{appealReason.length}/500</p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setAppealDialog(null)}>Cancel</Button>
            <Button className="flex-1 rounded-2xl lovli-gradient text-primary-foreground" disabled={!appealReason.trim() || submitting}
              onClick={submitAppeal}>
              {submitting ? 'Submitting...' : 'Submit Appeal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAppealsPage;
