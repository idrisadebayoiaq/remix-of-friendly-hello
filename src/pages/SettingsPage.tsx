import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Bell, Eye, Moon, MessageCircle, Shield, UserX, Globe, Volume2, VolumeX, ShieldCheck, AlertTriangle, LogOut, Trash2, RotateCcw, Download } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import NotificationPreferences from '@/components/settings/NotificationPreferences';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import InstallPromptModal from '@/components/onboarding/InstallPromptModal';
import { isLovliNativeApp } from '@/lib/appUrl';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
];

const DEFAULT_SETTINGS = {
  email_notifications: true,
  invite_notifications: true,
  daily_question_notifications: true,
  profile_visibility: true,
  allow_connection_requests: true,
  allow_requests_when_dating: false,
  push_messages: true,
  push_connection_requests: true,
  push_dating_requests: true,
  push_daily_questions: true,
  push_community: true,
  push_invites: true,
  push_appeals: true,
  push_reports: true,
};

const SettingsPage = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const [soundEnabled, setSoundEnabledState] = useState(() => getSoundEnabled());
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [trustedName, setTrustedName] = useState(profile?.trusted_contact_name || '');
  const [trustedPhone, setTrustedPhone] = useState(profile?.trusted_contact_phone || '');
  const [currency, setCurrency] = useState((profile as any)?.preferred_currency || 'USD');
  const [timezone, setTimezone] = useState(
    (profile as any)?.timezone ||
      (typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC'),
  );
  const [country, setCountry] = useState((profile as any)?.country || '');
  const deferredPrompt = useInstallPrompt();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const isStandalone =
    (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
    isLovliNativeApp();

  useEffect(() => {
    if (!profile) return;
    setTrustedName(profile.trusted_contact_name || '');
    setTrustedPhone(profile.trusted_contact_phone || '');
    setCurrency((profile as any)?.preferred_currency || 'USD');
    setTimezone((profile as any)?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setCountry((profile as any)?.country || '');
  }, [profile]);

  useEffect(() => {
    if (!user?.id) {
      setLoadingSettings(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingSettings(true);
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('Failed to load settings', error);
          setSettings({ ...DEFAULT_SETTINGS, user_id: user.id });
          toast.error('Could not load settings from server');
        } else if (!data) {
          const { data: created, error: insertError } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id })
            .select('*')
            .maybeSingle();

          if (cancelled) return;

          if (insertError || !created) {
            console.error('Failed to create settings', insertError);
            setSettings({ ...DEFAULT_SETTINGS, user_id: user.id });
          } else {
            setSettings(created);
          }
        } else {
          setSettings(data);
        }

        const { data: blocks } = await supabase
          .from('blocked_users')
          .select('*')
          .eq('blocker_id', user.id);

        if (cancelled) return;

        if (blocks?.length) {
          const enriched = await Promise.all(
            blocks.map(async (b) => {
              const { data: p } = await supabase
                .from('profiles')
                .select('full_name, username')
                .eq('user_id', b.blocked_id)
                .maybeSingle();
              return { ...b, profile: p };
            }),
          );
          if (!cancelled) setBlockedUsers(enriched);
        } else {
          setBlockedUsers([]);
        }
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateSetting = async (key: string, value: boolean) => {
    if (!user?.id) {
      toast.error('Please sign in again');
      return;
    }

    setSettings((prev: any) => ({ ...(prev || DEFAULT_SETTINGS), [key]: value }));

    const { error } = await supabase
      .from('user_settings')
      .update({ [key]: value } as any)
      .eq('user_id', user.id);

    if (error) {
      toast.error(error.message || 'Failed to update settings');
      return;
    }

    // Keep Discover visibility in sync (uses profiles.profile_visible)
    if (key === 'profile_visibility') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ profile_visible: value } as any)
        .eq('user_id', user.id);
      if (profileError) {
        toast.error(profileError.message || 'Failed to update profile visibility');
        return;
      }
      await refreshProfile();
    }

    toast.success('Settings updated');
  };

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    document.documentElement.classList.toggle('dark', enabled);
    localStorage.setItem('lovli-theme', enabled ? 'dark' : 'light');
  };

  const toggleSound = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
    toast.success(enabled ? 'Sounds enabled 🔊' : 'Sounds muted 🔇');
  };

  const saveTrustedContact = async () => {
    if (!user?.id) {
      toast.error('Please sign in again');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({
        trusted_contact_name: trustedName.trim(),
        trusted_contact_phone: trustedPhone.trim(),
      } as any)
      .eq('user_id', user.id)
      .select('user_id')
      .maybeSingle();

    if (error) {
      toast.error(error.message || 'Failed to save trusted contact');
      return;
    }
    if (!data) {
      toast.error('Could not save trusted contact. Please try again.');
      return;
    }
    await refreshProfile();
    toast.success('Trusted contact saved 🛡️');
  };

  const saveGlobalSettings = async () => {
    if (!user?.id) {
      toast.error('Please sign in again');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({
        preferred_currency: currency,
        timezone,
        country: country.trim(),
      } as any)
      .eq('user_id', user.id)
      .select('user_id')
      .maybeSingle();

    if (error) {
      toast.error(error.message || 'Failed to save global settings');
      return;
    }
    if (!data) {
      toast.error('Could not save settings. Please try again.');
      return;
    }
    await refreshProfile();
    toast.success('Global settings saved');
  };

  const unblockUser = async (blockId: string) => {
    await supabase.from('blocked_users').delete().eq('id', blockId);
    setBlockedUsers((prev) => prev.filter((b) => b.id !== blockId));
    toast.success('User unblocked');
  };

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <BackHeader title="Settings" />
        <p className="text-sm text-muted-foreground text-center py-12">Please sign in to manage settings.</p>
      </div>
    );
  }

  if (loadingSettings || !settings) {
    return (
      <div className="p-4 space-y-4">
        <BackHeader title="Settings" />
        <p className="text-sm text-muted-foreground text-center py-12">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <BackHeader title="Settings" />

      {/* Notifications */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Bell size={16} /> Notifications</div>
          {[
            { key: 'email_notifications', label: 'Email Notifications' },
            { key: 'invite_notifications', label: 'Invite Notifications' },
            { key: 'daily_question_notifications', label: 'Daily Question Reminders' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={settings[key]} onCheckedChange={v => updateSetting(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Push Notification Preferences */}
      <NotificationPreferences settings={settings} onUpdate={updateSetting} />

      {/* Privacy */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Eye size={16} /> Privacy & Connections</div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show in Discover</Label>
            <Switch checked={settings.profile_visibility} onCheckedChange={v => updateSetting('profile_visibility', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Allow Connection Requests</Label>
            <Switch checked={settings.allow_connection_requests ?? true} onCheckedChange={v => updateSetting('allow_connection_requests', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Allow Requests When Dating/Married</Label>
            <Switch checked={settings.allow_requests_when_dating ?? false} onCheckedChange={v => updateSetting('allow_requests_when_dating', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Location & Currency */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Globe size={16} /> Location & Currency</div>
          <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="rounded-xl" />
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Timezone" value={timezone} onChange={e => setTimezone(e.target.value)} className="rounded-xl" />
          <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={saveGlobalSettings}>Save</Button>
        </CardContent>
      </Card>

      {/* Appearance & Sound */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Moon size={16} /> Appearance & Sound</div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Dark Mode</Label>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 size={14} className="text-muted-foreground" /> : <VolumeX size={14} className="text-muted-foreground" />}
              <Label className="text-sm">Notification Sounds</Label>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
        </CardContent>
      </Card>

      {/* Trusted Contact */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Shield size={16} /> Trusted Contact</div>
          <p className="text-xs text-muted-foreground">Save a trusted person's info for date safety.</p>
          <Input placeholder="Name" value={trustedName} onChange={e => setTrustedName(e.target.value)} className="rounded-xl" />
          <Input placeholder="Phone number" value={trustedPhone} onChange={e => setTrustedPhone(e.target.value)} className="rounded-xl" />
          <Button size="sm" className="rounded-xl lovli-gradient text-primary-foreground" onClick={saveTrustedContact}>Save Contact</Button>
        </CardContent>
      </Card>

      {/* Blocked Users */}
      {blockedUsers.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><UserX size={16} /> Blocked Users</div>
            {blockedUsers.map(b => (
              <div key={b.id} className="flex items-center justify-between">
                <div><p className="text-sm font-bold">{b.profile?.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">@{b.profile?.username}</p></div>
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => unblockUser(b.id)}>Unblock</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Install App */}
      {!isStandalone && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <Button variant="outline" className="w-full rounded-2xl" onClick={() => setShowInstallModal(true)}>
              <Download size={16} className="mr-2" /> Install Lovli App
            </Button>
          </CardContent>
        </Card>
      )}

      {showInstallModal && <InstallPromptModal deferredPrompt={deferredPrompt} onClose={(installed) => {
        setShowInstallModal(false);
        if (installed && user) supabase.from('user_settings').update({ install_prompt_installed: true } as any).eq('user_id', user.id);
      }} />}

      {/* Replay Onboarding */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full rounded-2xl"
            onClick={async () => {
              const { error } = await supabase.from('user_settings').update({ has_seen_onboarding: false, onboarding_completed_at: null } as any).eq('user_id', user.id);
              if (error) {
                toast.error(error.message || 'Failed to reset onboarding');
                return;
              }
              toast.success('Onboarding reset! Visit Home to see it again.');
            }}
          >
            <RotateCcw size={16} className="mr-2" /> Replay Onboarding Tour
          </Button>
        </CardContent>
      </Card>

      <AdminOrSupportButton userId={user.id} navigate={navigate} />

      {/* Sign Out + Delete Account */}
      <AccountActions userId={user.id} signOut={signOut} />
    </div>
  );
};

const AdminOrSupportButton = ({ userId, navigate }: { userId: string; navigate: (path: string) => void }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  if (isAdmin) {
    return (
      <Button className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={() => navigate('/admin')}>
        <ShieldCheck size={16} className="mr-2" /> Admin Dashboard
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full rounded-2xl" onClick={() => navigate('/support')}>
        <MessageCircle size={16} className="mr-2" /> Contact Support
      </Button>
      <Button variant="ghost" className="w-full rounded-2xl text-muted-foreground" onClick={() => navigate('/my-appeals')}>
        <AlertTriangle size={16} className="mr-2" /> My Appeals
      </Button>
    </div>
  );
};

const AccountActions = ({ userId, signOut }: { userId: string; signOut: () => Promise<void> }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Please type DELETE to confirm'); return; }
    setDeleting(true);
    // Soft delete: mark profile as deleted + banned
    await supabase.from('profiles').update({ is_deleted: true, is_banned: true, ban_reason: 'Account deleted by user' } as any).eq('user_id', userId);
    // Hide all posts
    await supabase.from('community_posts').update({ is_deleted: true } as any).eq('user_id', userId);
    toast.success('Account deleted. Goodbye 💔');
    await signOut();
  };

  return (
    <div className="space-y-2 pt-2">
      <Button variant="outline" className="w-full rounded-2xl h-11" onClick={signOut}>
        <LogOut size={16} className="mr-2" /> Sign Out
      </Button>
      <Button variant="ghost" className="w-full rounded-2xl h-11 text-destructive" onClick={() => setShowDeleteModal(true)}>
        <Trash2 size={16} className="mr-2" /> Delete Account
      </Button>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently remove your account and all your content. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-bold">Type <span className="text-destructive">DELETE</span> to confirm:</p>
            <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE' || deleting}>
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
