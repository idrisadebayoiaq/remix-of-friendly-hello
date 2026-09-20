import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, Check, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  be_my_valentine: '💝 Be My Valentine',
  date_proposal: '🌹 Date Proposal',
  anniversary_surprise: '🎉 Anniversary Surprise',
  custom_message: '💌 Custom Message',
};

const typeQuestions: Record<string, { yes: string; no: string; question: string }> = {
  be_my_valentine: { question: 'Will you be my Valentine?', yes: 'Yes, I will! 💕', no: 'No, sorry 💔' },
  date_proposal: { question: 'Will you go on a date with me?', yes: 'Yes, let\'s go! 🌹', no: 'No, thanks 💔' },
  anniversary_surprise: { question: 'Will you celebrate with me?', yes: 'Yes! Let\'s celebrate! 🎉', no: 'No, sorry 💔' },
  custom_message: { question: 'Do you accept this invite?', yes: 'Yes, I accept! 💕', no: 'No, I decline 💔' },
};

const InviteViewPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [invite, setInvite] = useState<any>(null);
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'accept' | 'decline' | null>(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const fetchInvite = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-invite?token=${token}`);
        if (res.status === 410) { setExpired(true); setLoading(false); return; }
        if (!res.ok) { setError('Invite not found or expired.'); setLoading(false); return; }
        const data = await res.json();
        setInvite(data.invite);
        setSenderProfile(data.sender);
      } catch { setError('Failed to load invite.'); }
      setLoading(false);
    };
    fetchInvite();
  }, [token]);

  const respond = async (accept: boolean) => {
    if (!user || !invite || !token) return;
    setResponding(true);
    try {
      if (accept) {
        const { data, error } = await supabase.rpc('accept_invite', { p_token: token });
        if (error) { toast.error(error.message); setResponding(false); return; }
        const result = data as any;
        if (result?.error) { toast.error(result.error); setResponding(false); return; }
        toast.success('Connection created! 💕');
        const connId = result?.connection_id;
        navigate(connId ? `/connection/${connId}` : '/chats');
      } else {
        const { data, error } = await supabase.rpc('decline_invite', { p_token: token });
        if (error) { toast.error(error.message); setResponding(false); return; }
        const result = data as any;
        if (result?.error) { toast.error(result.error); setResponding(false); return; }
        toast.info('Invite declined');
        navigate('/home');
      }
    } catch {
      toast.error('Something went wrong');
    }
    setResponding(false);
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Heart className="animate-pulse text-primary" size={32} /></div>;
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-[400px] w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-4">
            <Clock size={48} className="mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Invite Expired</h2>
            <p className="text-sm text-muted-foreground">This invite has expired. Ask them to send a new one! 💌</p>
            <Button onClick={() => navigate('/auth')} className="rounded-2xl lovli-gradient text-primary-foreground font-bold">Go to Lovli</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-[400px] w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle size={48} className="mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Invite Not Found</h2>
            <p className="text-sm text-muted-foreground">{error || 'This invite link is invalid.'}</p>
            <Button onClick={() => navigate('/auth')} className="rounded-2xl lovli-gradient text-primary-foreground font-bold">Go to Lovli</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSender = invite.sender_id === user?.id;
  const canRespond = invite.status === 'pending' && !isSender && !!user;
  const needsSignup = !user;
  const typeQ = typeQuestions[invite.invite_type] || typeQuestions.custom_message;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[400px]">
        <Card className="shadow-xl border-0 overflow-hidden">
          <div className="h-24 lovli-gradient flex items-center justify-center">
            <Heart size={40} className="text-primary-foreground animate-pulse" fill="currentColor" />
          </div>
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto -mt-12 rounded-full border-4 border-card lovli-gradient flex items-center justify-center text-primary-foreground text-xl font-bold overflow-hidden">
              {senderProfile?.avatar_url ? (
                <img src={senderProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : senderProfile?.full_name?.[0] || '?'}
            </div>

            <div>
              <p className="text-lg font-bold">{senderProfile?.full_name}</p>
              <p className="text-xs text-muted-foreground">@{senderProfile?.username}</p>
            </div>

            <div className="text-lg font-display font-bold lovli-text-gradient">
              {typeLabels[invite.invite_type] || invite.invite_type}
            </div>

            {invite.message && (
              <p className="text-sm text-muted-foreground italic">"{invite.message}"</p>
            )}

            {needsSignup ? (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">Create an account to respond to this invite 💕</p>
                <Button className="w-full rounded-2xl h-12 lovli-gradient text-primary-foreground font-bold"
                  onClick={() => navigate(`/auth?tab=signup&redirect=/invite?token=${token}`)}>
                  Sign Up to Respond
                </Button>
                <Button variant="outline" className="w-full rounded-2xl h-11"
                  onClick={() => navigate(`/auth?tab=login&redirect=/invite?token=${token}`)}>
                  Already have an account? Log In
                </Button>
              </div>
            ) : canRespond ? (
              <AnimatePresence mode="wait">
                {showConfirm === null ? (
                  <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 pt-2">
                    <p className="text-base font-bold">{typeQ.question}</p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-2xl h-12 text-sm font-bold" onClick={() => setShowConfirm('decline')}>
                        <X size={16} className="mr-1" /> {typeQ.no}
                      </Button>
                      <Button className="flex-1 rounded-2xl h-12 lovli-gradient text-primary-foreground font-bold text-sm" onClick={() => setShowConfirm('accept')}>
                        <Check size={16} className="mr-1" /> {typeQ.yes}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 pt-2">
                    <p className="text-sm font-bold">
                      {showConfirm === 'accept'
                        ? `You said "${typeQ.yes}" — confirm?`
                        : `You said "${typeQ.no}" — are you sure?`
                      }
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => setShowConfirm(null)} disabled={responding}>
                        Go Back
                      </Button>
                      <Button
                        className={`flex-1 rounded-2xl h-11 font-bold ${showConfirm === 'accept' ? 'lovli-gradient text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}
                        onClick={() => respond(showConfirm === 'accept')}
                        disabled={responding}
                      >
                        {responding ? 'Processing...' : 'Confirm'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="space-y-2">
                <Badge className="rounded-full capitalize">{invite.status}</Badge>
                {isSender && invite.status === 'pending' && (
                  <p className="text-xs text-muted-foreground">Waiting for them to respond...</p>
                )}
                {isSender && invite.status === 'cancelled' && (
                  <p className="text-xs text-muted-foreground">You cancelled this invite.</p>
                )}
                {invite.status === 'accepted' && (
                  <Button className="w-full rounded-2xl h-11 lovli-gradient text-primary-foreground font-bold" onClick={() => navigate('/chats')}>
                    {isSender ? 'Open Connection Space 💕' : 'Go to Connection 💕'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default InviteViewPage;
