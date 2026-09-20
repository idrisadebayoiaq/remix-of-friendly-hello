import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, Heart, Sparkles, Award, Loader2, ArrowRight } from 'lucide-react';
import { awardBadge, getUserBadges, GROW_BADGES } from '@/lib/badges';

const GrowPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tip, setTip] = useState('');
  const [tipLoading, setTipLoading] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [quizCount, setQuizCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setTipLoading(true);

    const [{ data: settings }, earned, { count }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('last_love_tip, last_love_tip_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      getUserBadges(user.id),
      supabase
        .from('quiz_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    setBadges(earned);
    setQuizCount(count || 0);

    const cachedTip = (settings as any)?.last_love_tip as string | null;
    const cachedAt = (settings as any)?.last_love_tip_at as string | null;
    const fresh =
      cachedTip &&
      cachedAt &&
      Date.now() - new Date(cachedAt).getTime() < 24 * 60 * 60 * 1000;

    if (fresh) {
      setTip(cachedTip);
      setTipLoading(false);
      await awardBadge(user.id, 'tip_collector');
      setBadges(await getUserBadges(user.id));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('quiz-ai', {
        body: { quizType: 'love-tip', inputs: {} },
      });
      if (error) throw error;
      const nextTip = (data as any)?.result || cachedTip || 'Take a moment to appreciate someone you love today.';
      setTip(nextTip);
      await supabase
        .from('user_settings')
        .update({
          last_love_tip: nextTip,
          last_love_tip_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);
      await awardBadge(user.id, 'tip_collector');
      setBadges(await getUserBadges(user.id));
    } catch {
      setTip(cachedTip || 'Small kindnesses grow big love.');
    } finally {
      setTipLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const earnedKeys = new Set(badges.map((b) => b.badge_key));

  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Sparkles className="text-primary" size={24} /> Grow
        </h1>
        <p className="text-sm text-muted-foreground">Tips, quizzes, and badges — one place to level up.</p>
      </div>

      <Card className="shadow-sm border-0 overflow-hidden">
        <div className="h-1.5 lovli-gradient" />
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Today’s love tip</p>
          {tipLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin" /> Loading tip…
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{tip}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">AI Quizzes</p>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {quizCount} done
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: 'gift', label: 'Gift ideas', icon: Gift },
            { type: 'date', label: 'Date planner', icon: Calendar },
            { type: 'love-language', label: 'Love language', icon: Heart },
            { type: 'compatibility', label: 'Compatibility', icon: Sparkles },
          ].map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              className="h-auto rounded-2xl py-3 flex flex-col gap-1"
              onClick={() => navigate(`/quizzes?type=${type}`)}
            >
              <Icon size={18} className="text-primary" />
              <span className="text-xs font-semibold">{label}</span>
            </Button>
          ))}
        </div>
        <Button className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={() => navigate('/quizzes')}>
          Open quizzes <ArrowRight size={14} className="ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <Award size={16} className="text-primary" /> Badges
        </p>
        <div className="grid grid-cols-1 gap-2">
          {GROW_BADGES.map((def) => {
            const earned = earnedKeys.has(def.key);
            const row = badges.find((b) => b.badge_key === def.key);
            return (
              <Card key={def.key} className={`shadow-sm ${earned ? 'border-primary/30' : 'opacity-60'}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      earned ? 'lovli-gradient text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Award size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{def.title}</p>
                    <p className="text-[10px] text-muted-foreground">{def.description}</p>
                  </div>
                  {earned ? (
                    <Badge className="rounded-full text-[9px] bg-emerald-100 text-emerald-800 border-0">
                      {row?.earned_at ? new Date(row.earned_at).toLocaleDateString() : 'Earned'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full text-[9px]">
                      Locked
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GrowPage;
