import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Heart, MapPin, Plus, Sparkles, X, Check, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { DATING_MATCH_MODES, defaultPreferredGenders } from '@/lib/dating';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notificationTypes';
import { CONNECTION_ORIGINS } from '@/lib/connectionOrigins';

const LOOKING_FOR_OPTIONS = [
  { value: 'serious', label: 'Serious Relationship' },
  { value: 'casual', label: 'Casual Dating' },
  { value: 'friendship-first', label: 'Friendship First' },
];

const INTEREST_OPTIONS = [
  'Music', 'Travel', 'Cooking', 'Fitness', 'Reading', 'Art', 'Gaming', 'Movies',
  'Fashion', 'Photography', 'Dancing', 'Sports', 'Nature', 'Technology', 'Spirituality',
];

type DeckCard = {
  id: string;
  user_id: string;
  bio: string;
  location: string;
  looking_for: string;
  interests: string[];
  photos: string[];
  match_mode: string;
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    gender: string | null;
    city: string | null;
    date_of_birth: string | null;
  } | null;
};

const ageFromDob = (dob?: string | null) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

const FindLovePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const route = useLocation();
  const embedded = route.pathname.startsWith('/meet');
  const fileRef = useRef<HTMLInputElement>(null);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [incomingMatches, setIncomingMatches] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [bio, setBio] = useState('');
  const [place, setPlace] = useState('');
  const [lookingFor, setLookingFor] = useState('serious');
  const [interests, setInterests] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState('approve');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const myGender = (profile as any)?.gender as string | null | undefined;
  const canCreateListing = profile?.relationship_status === 'single';
  const current = deck[deckIndex] || null;

  const load = useCallback(async () => {
    if (!user) return;

    const { data: mine, error: mineError } = await supabase
      .from('dating_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (mineError) {
      toast.error(mineError.message || 'Unable to load your dating profile');
      return;
    }
    setMyProfile(mine);
    if (mine) {
      setBio(mine.bio || '');
      setPlace(mine.location || '');
      setLookingFor(mine.looking_for || 'serious');
      setInterests(mine.interests || []);
      setMatchMode(mine.match_mode || 'approve');
      setPhotos(mine.photos || []);
    }

    const preferred = (mine?.preferred_genders?.length
      ? mine.preferred_genders
      : defaultPreferredGenders(myGender)) as string[];

    const { data: all, error: allError } = await supabase
      .from('dating_profiles')
      .select('*')
      .eq('is_active', true)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);
    if (allError) {
      toast.error(allError.message || 'Unable to load dating profiles');
      return;
    }

    const { data: liked } = await supabase
      .from('dating_likes')
      .select('liked_id')
      .eq('liker_id', user.id);
    const likedIds = new Set((liked || []).map((l: any) => l.liked_id));

    const { data: sentMatches } = await supabase
      .from('dating_match_requests')
      .select('to_user_id')
      .eq('from_user_id', user.id)
      .in('status', ['pending', 'approved']);
    const matchedIds = new Set((sentMatches || []).map((m: any) => m.to_user_id));

    const { data: conns } = await supabase
      .from('connections')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .not('status', 'in', '("ended","blocked")');
    const connectedIds = new Set<string>();
    (conns || []).forEach((c) => {
      connectedIds.add(c.user1_id === user.id ? c.user2_id : c.user1_id);
    });

    const enriched = await Promise.all(
      (all || []).map(async (dp: any) => {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url, relationship_status, city, country, gender, date_of_birth')
          .eq('user_id', dp.user_id)
          .single();
        return { ...dp, profile: p };
      }),
    );

    const filtered = enriched.filter((item) => {
      if (!item.profile || item.profile.relationship_status !== 'single') return false;
      if (likedIds.has(item.user_id) || matchedIds.has(item.user_id) || connectedIds.has(item.user_id)) return false;
      if (!preferred.length) return false;
      return preferred.includes(item.profile.gender || '');
    }) as DeckCard[];

    setDeck(filtered);
    setDeckIndex(0);
    setPhotoIndex(0);

    const { data: incoming } = await supabase
      .from('dating_match_requests')
      .select('*')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    const incomingEnriched = await Promise.all(
      (incoming || []).map(async (req: any) => {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('user_id', req.from_user_id)
          .single();
        const { data: dp } = await supabase
          .from('dating_profiles')
          .select('photos, bio, location')
          .eq('user_id', req.from_user_id)
          .maybeSingle();
        return { ...req, sender: p, dating: dp };
      }),
    );
    setIncomingMatches(incomingEnriched);
  }, [user, myGender]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [deckIndex, current?.id]);

  const saveDatingProfile = async () => {
    if (!user) return;
    if (!canCreateListing && !myProfile) {
      toast.error('Dating is only available when you are single');
      return;
    }
    if (!myGender || myGender === 'prefer_not') {
      toast.error('Set your gender on You (Man or Woman) first');
      navigate('/you');
      return;
    }
    if (photos.length === 0 && !profile?.avatar_url) {
      toast.error('Add at least one photo for your dating card');
      return;
    }

    setSaving(true);
    const preferred = defaultPreferredGenders(myGender);
    const photoList = photos.length ? photos : profile?.avatar_url ? [profile.avatar_url] : [];
    const data = {
      user_id: user.id,
      bio: bio.trim(),
      location: place.trim(),
      looking_for: lookingFor,
      interests,
      is_active: true,
      photos: photoList,
      match_mode: matchMode,
      preferred_genders: preferred,
    };
    const query = myProfile
      ? supabase.from('dating_profiles').update(data).eq('id', myProfile.id).select().single()
      : supabase.from('dating_profiles').insert(data).select().single();
    const { data: savedProfile, error } = await query;

    if (error) {
      toast.error(error.message || 'Unable to save dating profile');
      setSaving(false);
      return;
    }

    setMyProfile(savedProfile);
    toast.success('Dating card saved');
    setSaving(false);
    setShowCreate(false);
    load();
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!user || !files?.length) return;
    setUploading(true);
    const next = [...photos];
    for (const file of Array.from(files).slice(0, 6 - next.length)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Only JPG, PNG, WEBP');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Max 5MB per photo');
        continue;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/dating/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) {
        toast.error(error.message || 'Upload failed');
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      next.push(publicUrl);
    }
    setPhotos(next);
    setUploading(false);
  };

  const advanceDeck = () => {
    setDeckIndex((i) => i + 1);
    setPhotoIndex(0);
  };

  const passCard = async () => {
    if (!current || busy) return;
    setBusy(true);
    advanceDeck();
    setBusy(false);
  };

  const likeCard = async () => {
    if (!user || !current || busy) return;
    setBusy(true);
    await supabase.from('dating_likes').upsert(
      { liker_id: user.id, liked_id: current.user_id },
      { onConflict: 'liker_id,liked_id' },
    );
    toast.success('Liked');
    advanceDeck();
    setBusy(false);
  };

  const createDatingBond = async (otherUserId: string) => {
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .or(
        `and(user1_id.eq.${user!.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user!.id})`,
      )
      .not('status', 'in', '("ended","blocked")')
      .maybeSingle();
    if (existing) return existing.id;

    const { data: newConn, error } = await supabase
      .from('connections')
      .insert({
        user1_id: user!.id,
        user2_id: otherUserId,
        origin_type: CONNECTION_ORIGINS.dating,
        relationship_track: 'friendship',
        status: 'connected',
      } as any)
      .select('id')
      .single();
    if (error) throw error;
    await supabase.from('connection_timeline_events').insert({
      connection_id: newConn.id,
      event_type: 'connected',
      title: 'Matched on Dating',
    });
    return newConn.id as string;
  };

  const matchCard = async () => {
    if (!user || !current || busy) return;
    if (!myProfile) {
      toast.error('Create your dating card first');
      setShowCreate(true);
      return;
    }
    setBusy(true);
    try {
      const theirMode = current.match_mode || 'approve';

      if (theirMode === 'instant') {
        const connId = await createDatingBond(current.user_id);
        await supabase.from('dating_match_requests').upsert(
          {
            from_user_id: user.id,
            to_user_id: current.user_id,
            status: 'approved',
            connection_id: connId,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'from_user_id,to_user_id' },
        );
        await createNotification({
          userId: current.user_id,
          type: NOTIFICATION_TYPES.dating_instant_match,
          title: 'New match — chat is open',
          message: `${profile?.full_name || 'Someone'} matched with you`,
          actorId: user.id,
          data: { connection_id: connId, url: `/connection/${connId}` },
        });
        toast.success('Matched! Opening chat…');
        navigate(`/connection/${connId}`);
        return;
      }

      await supabase.from('dating_match_requests').upsert(
        {
          from_user_id: user.id,
          to_user_id: current.user_id,
          status: 'pending',
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'from_user_id,to_user_id' },
      );
      await createNotification({
        userId: current.user_id,
        type: NOTIFICATION_TYPES.dating_match_request,
        title: 'Someone wants to match',
        message: `${profile?.full_name || 'Someone'} tapped Match on your dating card`,
        actorId: user.id,
        data: { from_user_id: user.id, url: '/meet?tab=dating' },
      });
      toast.success('Match request sent — they need to approve');
      advanceDeck();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send match');
    }
    setBusy(false);
  };

  const respondIncoming = async (req: any, approve: boolean) => {
    setBusy(true);
    try {
      if (!approve) {
        await supabase
          .from('dating_match_requests')
          .update({ status: 'declined', updated_at: new Date().toISOString() } as any)
          .eq('id', req.id);
        await createNotification({
          userId: req.from_user_id,
          type: NOTIFICATION_TYPES.dating_match_declined,
          title: 'Match declined',
          message: `${profile?.full_name || 'Someone'} declined your match. You can both keep using Lovli.`,
          actorId: user!.id,
          data: { url: '/meet?tab=dating' },
        });
        toast.info('Declined — you both keep using Lovli');
        setIncomingMatches((prev) => prev.filter((r) => r.id !== req.id));
        setBusy(false);
        return;
      }

      const connId = await createDatingBond(req.from_user_id);
      await supabase
        .from('dating_match_requests')
        .update({ status: 'approved', connection_id: connId, updated_at: new Date().toISOString() } as any)
        .eq('id', req.id);
      await createNotification({
        userId: req.from_user_id,
        type: NOTIFICATION_TYPES.dating_match_approved,
        title: 'They approved your match',
        message: `${profile?.full_name || 'Someone'} said yes — chat is open`,
        actorId: user!.id,
        data: { connection_id: connId, url: `/connection/${connId}` },
      });
      toast.success('Matched! Opening chat…');
      navigate(`/connection/${connId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not respond');
    }
    setBusy(false);
  };

  const toggleInterest = (tag: string) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const currentPhotos =
    current?.photos?.length
      ? current.photos
      : current?.profile?.avatar_url
        ? [current.profile.avatar_url]
        : [];

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {!embedded && (
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Heart className="text-primary" size={24} /> Dating
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            Opposite-gender deck. Dating photos stay here — not on your TikTok-style profile.
          </p>
        </div>
        {canCreateListing && (
          <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground shrink-0" onClick={() => setShowCreate(true)}>
            <Plus size={14} className="mr-1" /> {myProfile ? 'Edit card' : 'Create card'}
          </Button>
        )}
      </motion.div>

      {(!myGender || myGender === 'prefer_not') && (
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm font-bold">Set your gender to unlock Dating</p>
            <p className="text-xs text-muted-foreground">Men see women · Women see men</p>
            <Button size="sm" className="rounded-xl" onClick={() => navigate('/you')}>Open You</Button>
          </CardContent>
        </Card>
      )}

      {!canCreateListing && !myProfile && (
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-4 text-center">
            <Sparkles size={24} className="mx-auto text-primary mb-2" />
            <p className="text-sm font-bold">Dating is for singles</p>
            <p className="text-xs text-muted-foreground">Set relationship status to Single on You.</p>
          </CardContent>
        </Card>
      )}

      {incomingMatches.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Match requests</h2>
          {incomingMatches.map((req) => (
            <Card key={req.id} className="shadow-sm border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden lovli-gradient shrink-0">
                  {(req.dating?.photos?.[0] || req.sender?.avatar_url) ? (
                    <img src={req.dating?.photos?.[0] || req.sender?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-foreground font-bold">
                      {req.sender?.full_name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{req.sender?.full_name || 'Someone'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{req.dating?.bio || 'Wants to match with you'}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="icon" className="h-8 w-8 rounded-xl lovli-gradient text-primary-foreground" disabled={busy} onClick={() => respondIncoming(req, true)}>
                    <Check size={16} />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" disabled={busy} onClick={() => respondIncoming(req, false)}>
                    <X size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {myProfile && current && (
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40 }}
              className="rounded-3xl overflow-hidden border border-border bg-card shadow-md"
            >
              <div className="relative aspect-[3/4] bg-muted">
                {currentPhotos[photoIndex] ? (
                  <img src={currentPhotos[photoIndex]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No photo</div>
                )}
                <div className="absolute inset-x-0 top-0 p-2 flex gap-1">
                  {currentPhotos.map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
                {currentPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center"
                      onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center"
                      onClick={() => setPhotoIndex((i) => Math.min(currentPhotos.length - 1, i + 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-16 text-white">
                  <p className="text-xl font-bold font-display">
                    {current.profile?.full_name}
                    {ageFromDob(current.profile?.date_of_birth) ? `, ${ageFromDob(current.profile?.date_of_birth)}` : ''}
                  </p>
                  <p className="text-xs opacity-90 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} />
                    {current.location || current.profile?.city || 'Nearby'}
                    {' · '}
                    {LOOKING_FOR_OPTIONS.find((o) => o.value === current.looking_for)?.label}
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {current.bio && <p className="text-sm text-muted-foreground">{current.bio}</p>}
                {current.interests?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {current.interests.map((i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] rounded-full">{i}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-center gap-4 pt-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-14 w-14 rounded-full border-2"
                    disabled={busy}
                    onClick={passCard}
                    title="Pass"
                  >
                    <X size={22} />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full"
                    disabled={busy}
                    onClick={likeCard}
                    title="Like"
                  >
                    <Heart size={18} className="text-primary" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-14 w-14 rounded-full lovli-gradient text-primary-foreground"
                    disabled={busy}
                    onClick={matchCard}
                    title="Match"
                  >
                    <Sparkles size={22} />
                  </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">
                  Pass · Like · Match
                  {current.match_mode === 'instant' ? ' (their chat opens instantly)' : ' (they approve first)'}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {myProfile && !current && myGender && myGender !== 'prefer_not' && (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center space-y-2">
            <Heart className="mx-auto text-primary" size={28} />
            <p className="text-sm font-bold">No more people right now</p>
            <p className="text-xs text-muted-foreground">Check back later — or tweak your dating card.</p>
            <Button variant="outline" className="rounded-xl" onClick={() => load()}>Refresh</Button>
          </CardContent>
        </Card>
      )}

      {!myProfile && canCreateListing && myGender && myGender !== 'prefer_not' && (
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm font-bold">Create your dating card to start discovering</p>
            <Button className="rounded-2xl lovli-gradient text-primary-foreground" onClick={() => setShowCreate(true)}>
              Create dating card
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[420px] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Your dating card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Photos (Meet only — not Discover)</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs"
                      onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <button
                    type="button"
                    className="aspect-square rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-1"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    <ImagePlus size={18} />
                    <span className="text-[10px]">{uploading ? '…' : 'Add'}</span>
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => uploadPhotos(e.target.files)}
              />
            </div>
            <Textarea placeholder="Tell people about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-xl" maxLength={300} />
            <Input placeholder="City / location" value={place} onChange={(e) => setPlace(e.target.value)} className="rounded-xl" />
            <Select value={lookingFor} onValueChange={setLookingFor}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOOKING_FOR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">When someone Matches you</p>
              <Select value={matchMode} onValueChange={setMatchMode}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATING_MATCH_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {DATING_MATCH_MODES.find((m) => m.value === matchMode)?.description}
              </p>
            </div>
            <p className="text-xs font-bold text-muted-foreground">Interests</p>
            <div className="flex flex-wrap gap-1">
              {INTEREST_OPTIONS.map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant={interests.includes(tag) ? 'default' : 'outline'}
                  className={`rounded-full text-[10px] h-6 ${interests.includes(tag) ? 'lovli-gradient text-primary-foreground' : ''}`}
                  onClick={() => toggleInterest(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveDatingProfile} disabled={saving} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
              {saving ? 'Saving…' : 'Save dating card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindLovePage;
