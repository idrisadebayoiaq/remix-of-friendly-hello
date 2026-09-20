import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Heart, MapPin, UserPlus, Plus, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const LOOKING_FOR_OPTIONS = [
  { value: 'serious', label: '💍 Serious Relationship' },
  { value: 'casual', label: '☕ Casual Dating' },
  { value: 'friendship-first', label: '🤝 Friendship First' },
];

const FindLovePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [myProfile, setMyProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [lookingFor, setLookingFor] = useState('serious');
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const INTEREST_OPTIONS = ['Music', 'Travel', 'Cooking', 'Fitness', 'Reading', 'Art', 'Gaming', 'Movies', 'Fashion', 'Photography', 'Dancing', 'Sports', 'Nature', 'Technology', 'Spirituality'];

  const load = useCallback(async () => {
    if (!user) return;
    const { data: mine, error: mineError } = await (supabase.from as any)('dating_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (mineError) {
      toast.error(mineError.message || 'Unable to load your dating profile');
      return;
    }
    setMyProfile(mine);
    if (mine) { setBio(mine.bio || ''); setLocation(mine.location || ''); setLookingFor(mine.looking_for || 'serious'); setInterests(mine.interests || []); }

    const { data: all, error: allError } = await (supabase.from as any)('dating_profiles').select('*').eq('is_active', true).neq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (allError) {
      toast.error(allError.message || 'Unable to load dating profiles');
      return;
    }
    const enriched = await Promise.all((all || []).map(async (dp: any) => {
      const { data: p } = await supabase.from('profiles').select('full_name, username, avatar_url, relationship_status, city, country').eq('user_id', dp.user_id).single();
      return { ...dp, profile: p };
    }));
    setListings(enriched.filter(item => item.profile?.relationship_status === 'single'));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const canCreateListing = profile?.relationship_status === 'single';

  const saveDatingProfile = async () => {
    if (!user) return;
    if (!canCreateListing && !myProfile) {
      toast.error('Find Love is only available when you are single');
      return;
    }

    setSaving(true);
    const data = { user_id: user.id, bio: bio.trim(), location: location.trim(), looking_for: lookingFor, interests, is_active: true, photos: profile?.avatar_url ? [profile.avatar_url] : [] };
    const query = myProfile
      ? (supabase.from as any)('dating_profiles').update(data).eq('id', myProfile.id).select().single()
      : (supabase.from as any)('dating_profiles').insert(data).select().single();
    const { data: savedProfile, error } = await query;

    if (error) {
      toast.error(error.message || 'Unable to save dating profile');
      setSaving(false);
      return;
    }

    setMyProfile(savedProfile);
    toast.success('Dating profile saved! 💕');
    setSaving(false);
    setShowCreate(false);
    load();
  };

  const sendRequest = async (receiverId: string) => {
    const { data: receiverProfile } = await supabase.from('profiles').select('relationship_status').eq('user_id', receiverId).single();
    if (!receiverProfile || receiverProfile.relationship_status !== 'single') {
      toast.info('This person is not currently available on Find Love');
      return;
    }

    const { data: existing } = await supabase.from('connection_requests').select('id')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user!.id})`)
      .eq('status', 'pending').maybeSingle();
    if (existing) { toast.info('Request already pending'); return; }

    const { data: conn } = await supabase.from('connections').select('id')
      .or(`and(user1_id.eq.${user!.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${user!.id})`)
      .not('status', 'in', '("ended","blocked")').maybeSingle();
    if (conn) { toast.info('Already connected!'); return; }

    const { error: requestError } = await supabase.from('connection_requests').insert({ sender_id: user!.id, receiver_id: receiverId });
    if (requestError) {
      toast.error(requestError.message || 'Unable to send request');
      return;
    }

    await Promise.all([
      supabase.from('notifications').insert({ user_id: receiverId, type: 'connection_request', title: 'Someone likes you! 💕', message: 'You got a connection request from Find Love!', data: { sender_id: user!.id } }),
      (supabase.from as any)('dating_likes').insert({ liker_id: user!.id, liked_id: receiverId }),
    ]);

    toast.success('Connection request sent! 💕');
  };

  const toggleInterest = (tag: string) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Heart className="text-primary" size={24} /> Find Love</h1>
          <p className="text-sm text-muted-foreground">Discover meaningful connections</p>
        </div>
        {canCreateListing && (
          <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={() => setShowCreate(true)}>
            <Plus size={14} className="mr-1" /> {myProfile ? 'Edit' : 'Create'} Profile
          </Button>
        )}
      </motion.div>

      {!canCreateListing && !myProfile && (
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-4 text-center">
            <Sparkles size={24} className="mx-auto text-primary mb-2" />
            <p className="text-sm font-bold">Find Love is for singles</p>
            <p className="text-xs text-muted-foreground">Update your relationship status to 'Single' to create a dating listing.</p>
          </CardContent>
        </Card>
      )}

      {myProfile && (
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile?.full_name?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Your Dating Profile</p>
                <p className="text-[10px] text-muted-foreground">{LOOKING_FOR_OPTIONS.find(o => o.value === myProfile.looking_for)?.label}</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">Active ✨</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      <AnimatePresence>
        {listings.map((dp, i) => (
          <motion.div key={dp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground font-bold overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => dp.profile?.username && navigate(`/u/${dp.profile.username}`)}>
                    {dp.profile?.avatar_url ? <img src={dp.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : dp.profile?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate cursor-pointer hover:underline"
                      onClick={() => dp.profile?.username && navigate(`/u/${dp.profile.username}`)}>{dp.profile?.full_name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {dp.location && <><MapPin size={10} /> {dp.location} •</>}
                      {LOOKING_FOR_OPTIONS.find(o => o.value === dp.looking_for)?.label}
                    </div>
                  </div>
                </div>
                {dp.bio && <p className="text-sm text-muted-foreground">{dp.bio}</p>}
                {dp.interests?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dp.interests.map((i: string) => <Badge key={i} variant="secondary" className="text-[10px] rounded-full">{i}</Badge>)}
                  </div>
                )}
                <Button className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={() => sendRequest(dp.user_id)}>
                  <UserPlus size={14} className="mr-1" /> Connect 💕
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      {listings.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No dating profiles yet. Be the first! ✨</p>}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[420px] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Dating Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Tell people about yourself..." value={bio} onChange={e => setBio(e.target.value)} className="rounded-xl" maxLength={300} />
            <Input placeholder="Your location (city, country)" value={location} onChange={e => setLocation(e.target.value)} className="rounded-xl" />
            <Select value={lookingFor} onValueChange={setLookingFor}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{LOOKING_FOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs font-bold text-muted-foreground">Interests</p>
            <div className="flex flex-wrap gap-1">
              {INTEREST_OPTIONS.map(tag => (
                <Button key={tag} size="sm" variant={interests.includes(tag) ? 'default' : 'outline'}
                  className={`rounded-full text-[10px] h-6 ${interests.includes(tag) ? 'lovli-gradient text-primary-foreground' : ''}`}
                  onClick={() => toggleInterest(tag)}>{tag}</Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveDatingProfile} disabled={saving} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindLovePage;
