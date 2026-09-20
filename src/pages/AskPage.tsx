import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Heart, Share2, Copy, Check } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const inviteTypes = [
  { value: 'be_my_valentine', label: '💝 Be My Valentine' },
  { value: 'date_proposal', label: '🌹 Date Proposal' },
  { value: 'anniversary_surprise', label: '🎉 Anniversary Surprise' },
  { value: 'custom_message', label: '💌 Custom Message' },
];

const AskPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const embedded = location.pathname.startsWith('/meet');
  const [receiverName, setReceiverName] = useState('');
  const [inviteType, setInviteType] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Please sign in again');
      return;
    }
    if (!inviteType) {
      toast.error('Please select an invite type');
      return;
    }
    setSending(true);

    const { data: cooldown } = await supabase.rpc('can_send_invite_to_name' as any, {
      p_receiver_name: receiverName.trim(),
    });
    if (cooldown && (cooldown as any).ok === false) {
      toast.error((cooldown as any).error || 'Please wait before inviting this person again');
      setSending(false);
      return;
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('invites').insert({
      sender_id: user.id,
      receiver_email: 'link-invite@lovli.app',
      receiver_name: receiverName.trim(),
      invite_type: inviteType as any,
      message: message.trim(),
      token,
      expires_at: expiresAt,
    });

    if (error) {
      toast.error(error.message || 'Failed to create invite');
      setSending(false);
      return;
    }

    const link = `${window.location.origin}/invite?token=${token}`;
    setGeneratedLink(link);
    toast.success('Invite link created! 💕');
    setSending(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Lovli Invite 💕',
        text: `${receiverName ? receiverName + ', y' : 'Y'}ou've been sent a special invite on Lovli!`,
        url: generatedLink,
      });
    } else {
      copyLink();
    }
  };

  const resetForm = () => {
    setReceiverName('');
    setInviteType('');
    setMessage('');
    setGeneratedLink('');
  };

  return (
    <div className="p-4 space-y-4">
      {!embedded && <BackHeader title="Send an Invite 💕" />}
      {embedded && (
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display">Send an Invite</h2>
          <p className="text-xs text-muted-foreground">For someone you already know — share a link, they choose Yes or No.</p>
        </div>
      )}

      {generatedLink ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-md border-0 overflow-hidden">
            <div className="h-16 lovli-gradient flex items-center justify-center">
              <Heart size={28} className="text-primary-foreground" fill="currentColor" />
            </div>
            <CardContent className="p-5 space-y-4 text-center">
              <p className="font-bold text-lg">Invite Created! 🎉</p>
              <p className="text-sm text-muted-foreground">Share this link with {receiverName || 'your special someone'}</p>
              <div className="bg-muted p-3 rounded-xl text-xs break-all text-muted-foreground">{generatedLink}</div>
              <div className="flex gap-2">
                <Button onClick={copyLink} variant="outline" className="flex-1 rounded-2xl h-11">
                  {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button onClick={shareLink} className="flex-1 rounded-2xl h-11 lovli-gradient text-primary-foreground font-bold">
                  <Share2 size={16} className="mr-1" /> Share
                </Button>
              </div>
              <Button variant="ghost" className="w-full text-sm" onClick={resetForm}>Create Another Invite</Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                  <Label>Receiver's Name</Label>
                  <Input placeholder="Their name" value={receiverName} onChange={e => setReceiverName(e.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Invite Type</Label>
                  <Select value={inviteType} onValueChange={setInviteType}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inviteTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message (optional)</Label>
                  <Textarea placeholder="Write something from the heart..." value={message} onChange={e => setMessage(e.target.value)} className="rounded-xl min-h-[80px]" />
                </div>
                <Button type="submit" disabled={sending} className="w-full h-12 rounded-2xl lovli-gradient text-primary-foreground font-bold shadow-md">
                  <Share2 size={18} className="mr-2" />
                  {sending ? 'Creating...' : 'Create Invite Link'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AskPage;
