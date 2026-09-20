import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Camera, MapPin, Bell, Download, Cake, CheckCircle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import InstallPromptModal from '@/components/onboarding/InstallPromptModal';
import { PROFILE_GENDERS, genderLabel } from '@/lib/dating';
import { getFollowCounts, getHeartsReceived } from '@/lib/follows';
import ProfilePostsGrid from '@/components/profile/ProfilePostsGrid';
import { INTENT_OPTIONS } from '@/components/onboarding/OnboardingModal';

const statusLabels: Record<string, string> = {
  single: '💚 Single', talking_stage: '💛 Talking Stage', dating: '💜 Dating', engaged: '💍 Engaged', married: '💕 Married',
};
const INTEREST_OPTIONS = ['Music', 'Travel', 'Cooking', 'Fitness', 'Reading', 'Art', 'Gaming', 'Movies', 'Fashion', 'Photography', 'Dancing', 'Sports', 'Nature', 'Technology', 'Spirituality'];

const ProfilePage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const deferredPrompt = useInstallPrompt();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('single');
  const [interests, setInterests] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobPublic, setDobPublic] = useState(true);
  const [primaryIntent, setPrimaryIntent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myQuizResults, setMyQuizResults] = useState<any[]>([]);
  const [myMemories, setMyMemories] = useState<any[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [heartsCount, setHeartsCount] = useState(0);

  useEffect(() => {
    if (!profile || editing) return;
    setFullName(profile.full_name || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setCity(profile.city || '');
    setCountry((profile as any).country || '');
    setGender((profile as any).gender || '');
    setRelationshipStatus(profile.relationship_status || 'single');
    setInterests(profile.interests || []);
    setDateOfBirth((profile as any).date_of_birth || '');
    setDobPublic((profile as any).dob_public ?? true);
    setPrimaryIntent((profile as any).primary_intent || '');
  }, [profile, editing]);

  const openEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setCity(profile.city || '');
      setCountry((profile as any).country || '');
      setGender((profile as any).gender || '');
      setRelationshipStatus(profile.relationship_status || 'single');
      setInterests(profile.interests || []);
      setDateOfBirth((profile as any).date_of_birth || '');
      setDobPublic((profile as any).dob_public ?? true);
      setPrimaryIntent((profile as any).primary_intent || '');
    }
    setEditing(true);
  };

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [{ data: posts }, { data: qr }, { data: mems }, counts, hearts] = await Promise.all([
      supabase
        .from('community_posts')
        .select('id, content, image_url, video_url, media_type, thumbnail_url, likes_count, created_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase.from('quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      getFollowCounts(user.id),
      getHeartsReceived(user.id),
    ]);
    setMyPosts(posts || []);
    setMyQuizResults(qr || []);
    setMyMemories(mems || []);
    setFollowingCount(counts.following);
    setFollowersCount(counts.followers);
    setHeartsCount(hearts);
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSave = async () => {
    const userId = user?.id || profile?.user_id;
    if (!userId) {
      toast.error('Please sign in again to save your profile');
      return;
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '').trim();
    if (cleanUsername.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    const allowedStatuses = Object.keys(statusLabels);
    const safeStatus = allowedStatuses.includes(relationshipStatus) ? relationshipStatus : 'single';

    setSaving(true);
    try {
      if (cleanUsername !== (profile?.username || '').toLowerCase()) {
        const { data: taken } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', cleanUsername)
          .neq('user_id', userId)
          .maybeSingle();
        if (taken) {
          toast.error('That username is already taken');
          return;
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: cleanUsername,
          bio: bio.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          gender: gender || null,
          relationship_status: safeStatus as any,
          interests,
          date_of_birth: dateOfBirth || null,
          dob_public: dobPublic,
          primary_intent: primaryIntent || null,
        } as any)
        .eq('user_id', userId)
        .select('user_id')
        .maybeSingle();

      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (error.code === '23505' || msg.includes('unique') || msg.includes('duplicate')) {
          toast.error('That username is already taken');
        } else if (msg.includes('invalid input value for enum') || msg.includes('relationship_status')) {
          toast.error('Invalid relationship status');
        } else {
          toast.error(error.message || 'Failed to update profile');
        }
        return;
      }

      if (!data) {
        toast.error('Could not update profile. Please try again.');
        return;
      }

      toast.success('Profile updated');
      await refreshProfile();
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const userId = user?.id || profile?.user_id;
    if (!userId) {
      toast.error('Please sign in again');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) {
        toast.error(uploadError.message || 'Failed to upload avatar');
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId)
        .select('user_id')
        .maybeSingle();
      if (error || !data) {
        toast.error(error?.message || 'Failed to save avatar');
        return;
      }
      toast.success('Avatar updated');
      await refreshProfile();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleInterest = (tag: string) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleInstallClose = async (installed?: boolean) => {
    setShowInstallModal(false);
    if (installed && user) {
      await supabase.from('user_settings').update({ install_prompt_installed: true } as any).eq('user_id', user.id);
    }
  };

  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="pb-4">
      {showInstallModal && <InstallPromptModal deferredPrompt={deferredPrompt} onClose={handleInstallClose} />}

      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold font-display flex-1 truncate">@{profile?.username || 'you'}</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/you/alerts')} title="Alerts">
          <Bell size={20} className="text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/you/settings')}>
          <Settings size={20} className="text-muted-foreground" />
        </Button>
      </div>

      <div className="px-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-[88px] h-[88px] rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden lovli-gradient text-primary-foreground text-3xl font-bold">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0] || '?'
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]);
              }}
            />
          </div>

          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{followersCount}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{heartsCount}</p>
              <p className="text-[10px] text-muted-foreground">Hearts</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-bold text-base leading-tight">{profile?.full_name}</p>
          {profile?.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>}
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {statusLabels[profile?.relationship_status || ''] || '💚 Single'}
            </Badge>
            {genderLabel((profile as any)?.gender) && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                {genderLabel((profile as any)?.gender)}
              </Badge>
            )}
            {(profile?.city || (profile as any)?.country) && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                <MapPin size={10} className="mr-0.5" />
                {[profile?.city, (profile as any)?.country].filter(Boolean).join(', ')}
              </Badge>
            )}
            {(profile as any)?.date_of_birth && (profile as any)?.dob_public && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                <Cake size={10} className="mr-0.5" />
                {new Date((profile as any).date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Badge>
            )}
            <Badge variant="outline" className="rounded-full text-[10px]">
              <CheckCircle size={10} className="mr-0.5" /> Verified
            </Badge>
          </div>
          {(profile?.interests?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {(profile?.interests || []).map((i: string) => (
                <Badge key={i} variant="secondary" className="text-[10px] rounded-full">
                  {i}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 rounded-xl font-semibold" onClick={openEdit}>
            Edit profile
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl font-semibold" onClick={() => navigate('/meet?tab=dating')}>
            <Heart size={14} className="mr-1" /> Dating card
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground -mt-2">
          Dating photos live under Meet → Dating only — not in this Discover posts grid.
        </p>

        {!isStandalone && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowInstallModal(true)}>
            <Download size={16} className="mr-2" /> Install Lovli App
          </Button>
        )}
      </div>

      <Tabs defaultValue="posts" className="mt-4">
        <TabsList className="w-full rounded-none border-b bg-transparent h-10 p-0">
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="quizzes"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none"
          >
            Quizzes
          </TabsTrigger>
          <TabsTrigger
            value="memories"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none"
          >
            Memories
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-0">
          <ProfilePostsGrid posts={myPosts} emptyLabel="No Discover posts yet — share one from Discover" />
        </TabsContent>
        <TabsContent value="quizzes" className="mt-3 px-4 space-y-2">
          {myQuizResults.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No quiz results</p>
          ) : (
            myQuizResults.map((q) => (
              <div key={q.id} className="rounded-xl border p-3">
                <p className="text-sm font-bold capitalize">{q.quiz_type.replace('_', ' ')} Quiz</p>
                <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="memories" className="mt-3 px-4">
          {myMemories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No memories</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {myMemories.map((m) => (
                <div key={m.id} className="relative rounded-xl overflow-hidden">
                  <img src={m.image_url} alt="" className="w-full aspect-square object-cover" />
                  {m.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                      <p className="text-[10px] text-white">{m.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4 pb-8">
            <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl" />
            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl" />
            <Input value={profile?.email || user?.email || ''} disabled className="rounded-xl opacity-70" />
            <p className="text-[10px] text-muted-foreground -mt-2">Email comes from signup and can’t be changed here</p>
            <Textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-xl" maxLength={200} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
              <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">Gender</Label>
              <Select value={gender || undefined} onValueChange={setGender}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Needed for Meet Dating (men see women, women see men).</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">Primary focus</Label>
              <Select value={primaryIntent || undefined} onValueChange={setPrimaryIntent}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="What brings you here?" />
                </SelectTrigger>
                <SelectContent>
                  {INTENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Date of Birth</Label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="rounded-xl" />
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Show DOB publicly</Label>
                <Switch checked={dobPublic} onCheckedChange={setDobPublic} />
              </div>
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
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProfilePage;
