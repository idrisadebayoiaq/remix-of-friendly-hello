import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings, Camera, Edit3, MapPin, Heart, MessageCircle, Trophy, CheckCircle, Image, Cake, Download } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import InstallPromptModal from '@/components/onboarding/InstallPromptModal';

const statusLabels: Record<string, string> = {
  single: '💚 Single', talking_stage: '💛 Talking Stage', dating: '💜 Dating', engaged: '💍 Engaged', married: '💕 Married',
};
const INTEREST_OPTIONS = ['Music', 'Travel', 'Cooking', 'Fitness', 'Reading', 'Art', 'Gaming', 'Movies', 'Fashion', 'Photography', 'Dancing', 'Sports', 'Nature', 'Technology', 'Spirituality'];

const ProfilePage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const deferredPrompt = useInstallPrompt();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState((profile as any)?.country || '');
  const [relationshipStatus, setRelationshipStatus] = useState(profile?.relationship_status || 'single');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [dateOfBirth, setDateOfBirth] = useState((profile as any)?.date_of_birth || '');
  const [dobPublic, setDobPublic] = useState((profile as any)?.dob_public ?? true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postsCount, setPostsCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myQuizResults, setMyQuizResults] = useState<any[]>([]);
  const [myMemories, setMyMemories] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const { count: pc } = await supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_deleted', false);
      setPostsCount(pc || 0);
      const { count: cc } = await supabase.from('connections').select('*', { count: 'exact', head: true });
      setConnectionsCount(cc || 0);
      const { data: posts } = await supabase.from('community_posts').select('*').eq('user_id', user.id).eq('is_deleted', false).order('created_at', { ascending: false }).limit(5);
      setMyPosts(posts || []);
      const { data: qr } = await supabase.from('quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      setMyQuizResults(qr || []);
      const { data: mems } = await supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      setMyMemories(mems || []);
    };
    loadStats();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: fullName.trim(), bio: bio.trim(), city: city.trim(),
      country: country.trim(), relationship_status: relationshipStatus as any, interests,
      date_of_birth: dateOfBirth || null, dob_public: dobPublic,
    } as any).eq('user_id', profile?.user_id);
    toast.success('Profile updated! 💕');
    await refreshProfile();
    setEditing(false);
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile?.user_id) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG, WEBP'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${profile.user_id}/avatar.${ext}`;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', profile.user_id);
    toast.success('Avatar updated! 📸');
    await refreshProfile();
    setUploadingAvatar(false);
  };

  const toggleInterest = (tag: string) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleInstallClose = async (installed?: boolean) => {
    setShowInstallModal(false);
    if (installed && user) {
      await supabase.from('user_settings').update({ install_prompt_installed: true } as any).eq('user_id', user.id);
    }
  };

  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="p-4 space-y-4">
      {showInstallModal && <InstallPromptModal deferredPrompt={deferredPrompt} onClose={handleInstallClose} />}
      
      <BackHeader title="Profile" rightContent={<Button variant="ghost" size="icon" onClick={() => navigate('/settings')}><Settings size={20} className="text-muted-foreground" /></Button>} />

      <Card className="shadow-md border-0 overflow-hidden">
        <div className="h-20 lovli-gradient" />
        <CardContent className="p-4 -mt-10">
          <div className="flex items-end gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden lovli-gradient text-primary-foreground text-xl font-bold">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : profile?.full_name?.[0] || '?'}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Camera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); }} />
            </div>
            <div className="flex-1 pt-8">
              <p className="font-bold">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">@{profile?.username}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditing(!editing)}><Edit3 size={14} className="mr-1" /> Edit</Button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <Input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-xl" />
              <Textarea placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} className="rounded-xl" maxLength={200} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="rounded-xl" />
                <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="rounded-xl" />
              </div>
              <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Date of Birth</Label>
                <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="rounded-xl" />
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Show DOB publicly</Label>
                  <Switch checked={dobPublic} onCheckedChange={setDobPublic} />
                </div>
              </div>
              <p className="text-xs font-bold text-muted-foreground">Interests</p>
              <div className="flex flex-wrap gap-1">
                {INTEREST_OPTIONS.map(tag => (
                  <Button key={tag} size="sm" variant={interests.includes(tag) ? 'default' : 'outline'}
                    className={`rounded-full text-[10px] h-6 ${interests.includes(tag) ? 'lovli-gradient text-primary-foreground' : ''}`}
                    onClick={() => toggleInterest(tag)}>{tag}</Button>
                ))}
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="rounded-full">{statusLabels[profile?.relationship_status] || '💚 Single'}</Badge>
                {profile?.love_language && <Badge variant="outline" className="rounded-full">❤️ {profile.love_language}</Badge>}
                {(profile?.city || (profile as any)?.country) && (
                  <Badge variant="outline" className="rounded-full"><MapPin size={10} className="mr-0.5" /> {[profile?.city, (profile as any)?.country].filter(Boolean).join(', ')}</Badge>
                )}
                <Badge variant="outline" className="rounded-full"><CheckCircle size={10} className="mr-0.5" /> Verified Email ✅</Badge>
                {(profile as any)?.date_of_birth && (profile as any)?.dob_public && (
                  <Badge variant="outline" className="rounded-full"><Cake size={10} className="mr-0.5" /> {new Date((profile as any).date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Badge>
                )}
              </div>
              {profile?.interests?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {profile.interests.map((i: string) => <Badge key={i} variant="secondary" className="text-[10px] rounded-full">{i}</Badge>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Install App Button */}
      {!isStandalone && (
        <Button variant="outline" className="w-full rounded-2xl" onClick={() => setShowInstallModal(true)}>
          <Download size={16} className="mr-2" /> Install Lovli App
        </Button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posts', value: postsCount, icon: MessageCircle },
          { label: 'Connections', value: connectionsCount, icon: Heart },
          { label: 'Quizzes', value: myQuizResults.length, icon: Trophy },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Icon size={16} className="mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">My Posts</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="memories">Memories</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="space-y-2 mt-3">
          {myPosts.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No posts yet</p> : (
            <>
              {myPosts.slice(0, 5).map(p => (
                <Card key={p.id} className="shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-sm">{p.content}</p>
                    {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-[150px] object-cover rounded-xl mt-2" />}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Heart size={10} /> {p.likes_count || 0}
                      <MessageCircle size={10} /> {p.comments_count || 0}
                      <span className="ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {postsCount > 5 && (
                <Button variant="outline" className="w-full rounded-2xl" onClick={() => navigate('/my-posts')}>
                  See all posts ({postsCount})
                </Button>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="quizzes" className="space-y-2 mt-3">
          {myQuizResults.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No quiz results</p> : myQuizResults.map(q => (
            <Card key={q.id} className="shadow-sm">
              <CardContent className="p-3">
                <p className="text-sm font-bold capitalize">{q.quiz_type.replace('_', ' ')} Quiz</p>
                <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="memories" className="mt-3">
          {myMemories.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No memories</p> : (
            <div className="grid grid-cols-2 gap-2">
              {myMemories.map(m => (
                <div key={m.id} className="relative rounded-xl overflow-hidden shadow-sm">
                  <img src={m.image_url} alt="" className="w-full aspect-square object-cover" />
                  {m.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2"><p className="text-[10px] text-white">{m.caption}</p></div>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
