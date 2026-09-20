import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, ShieldCheck, BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const SafetyModeWidget = () => {
  const { user } = useAuth();
  const [safetyMode, setSafetyMode] = useState(true);
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load user setting
    const { data: settings } = await supabase
      .from('user_settings')
      .select('date_safety_mode')
      .eq('user_id', user.id)
      .single();
    setSafetyMode(settings?.date_safety_mode ?? true);

    // Load a daily tip deterministically
    const { data: tips } = await supabase
      .from('safety_tips')
      .select('*')
      .order('created_at', { ascending: true });

    if (tips && tips.length > 0) {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const idx = dayOfYear % tips.length;
      setTip(tips[idx].tip_text);
    } else {
      setTip('🛡️ Always meet in a public place for the first few dates.');
    }

    setLoading(false);
  };

  const toggleSafetyMode = async (value: boolean) => {
    setSafetyMode(value);
    await supabase
      .from('user_settings')
      .update({ date_safety_mode: value } as any)
      .eq('user_id', user!.id);
    toast.success(value ? 'Safety Mode ON ✅' : 'Safety Mode OFF');
  };

  if (loading) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm border-primary/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  🛡 Safety Mode
                </p>
              </div>
              {safetyMode && (
                <Badge label="ON ✅" />
              )}
            </div>

            <p className="text-sm">{tip}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-muted-foreground" />
                <Label className="text-sm">Date Safety Mode</Label>
              </div>
              <Switch checked={safetyMode} onCheckedChange={toggleSafetyMode} />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="rounded-xl w-full"
              onClick={() => setShowGuide(true)}
            >
              <BookOpen size={14} className="mr-1" /> Open Safety Guide
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={20} className="text-primary" /> Date Safety Guide
            </DialogTitle>
            <DialogDescription>Keep these tips in mind before meeting someone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { emoji: '🏙️', text: 'Meet in public first — coffee shops, parks, malls.' },
              { emoji: '📱', text: 'Tell a trusted person where you\'re going and who you\'re meeting.' },
              { emoji: '🏠', text: 'Avoid private homes on the first few dates.' },
              { emoji: '💸', text: 'Don\'t exchange money or gift cards with someone new.' },
              { emoji: '👂', text: 'Trust your instincts — if it feels wrong, leave.' },
              { emoji: '🚗', text: 'Use your own transportation.' },
              { emoji: '📞', text: 'Have a friend check in on you during the date.' },
              { emoji: '📍', text: 'Share your live location with a trusted contact.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-base">{item.emoji}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl lovli-gradient text-primary-foreground" onClick={() => setShowGuide(false)}>
              I Understand ✅
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Simple inline badge
const Badge = ({ label }: { label: string }) => (
  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{label}</span>
);

export default SafetyModeWidget;
