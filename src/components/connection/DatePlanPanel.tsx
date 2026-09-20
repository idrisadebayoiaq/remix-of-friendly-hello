import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarHeart, Check, Pencil, Plus, Sparkles, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notificationTypes';

type DateIdea = { user_id: string; text: string; created_at: string; name?: string };

type DatePlan = {
  id: string;
  connection_id: string;
  created_by: string;
  title: string;
  city: string | null;
  budget: string | null;
  preference: string | null;
  plan_text: string;
  ideas: DateIdea[];
  status: string;
  creator_stance: string | null;
  partner_stance: string | null;
  updated_at: string;
};

type Props = {
  connectionId: string;
  userId: string;
  otherUserId: string;
  otherUserName: string;
  unlocked: boolean;
  lockReason?: string;
};

const DatePlanPanel = ({
  connectionId,
  userId,
  otherUserId,
  otherUserName,
  unlocked,
  lockReason,
}: Props) => {
  const [plan, setPlan] = useState<DatePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('moderate');
  const [preference, setPreference] = useState('romantic');
  const [editText, setEditText] = useState('');
  const [editing, setEditing] = useState(false);
  const [ideaText, setIdeaText] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('date_plans')
      .select('*')
      .eq('connection_id', connectionId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const row = data as any;
      setPlan({ ...row, ideas: Array.isArray(row.ideas) ? row.ideas : [] });
      setEditText(row.plan_text || '');
      setCity(row.city || '');
      setBudget(row.budget || 'moderate');
      setPreference(row.preference || 'romantic');
    } else {
      setPlan(null);
    }
    setLoading(false);
  }, [connectionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`date-plans-${connectionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'date_plans', filter: `connection_id=eq.${connectionId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, load]);

  const myStance = plan
    ? plan.created_by === userId
      ? plan.creator_stance
      : plan.partner_stance
    : null;
  const theirStance = plan
    ? plan.created_by === userId
      ? plan.partner_stance
      : plan.creator_stance
    : null;

  const generatePlan = async () => {
    if (!unlocked) return;
    setGenerating(true);
    try {
      const ideaStrings = (plan?.ideas || []).map((i) => i.text);
      const { data, error } = await supabase.functions.invoke('quiz-ai', {
        body: {
          quizType: 'co-date',
          inputs: { city, budget, preference, ideas: ideaStrings },
        },
      });
      if (error) throw error;
      const text = (data as any)?.result || '';
      if (!text) throw new Error('No plan generated');

      const title = text.split('\n').find((l: string) => l.trim())?.slice(0, 80) || 'Our date plan';

      if (plan) {
        const { error: upErr } = await supabase
          .from('date_plans')
          .update({
            plan_text: text,
            title,
            city: city || null,
            budget,
            preference,
            status: 'reviewing',
            creator_stance: null,
            partner_stance: null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', plan.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from('date_plans').insert({
          connection_id: connectionId,
          created_by: userId,
          title,
          city: city || null,
          budget,
          preference,
          plan_text: text,
          status: 'reviewing',
          ideas: [],
        } as any);
        if (insErr) throw insErr;
      }

      await createNotification({
        userId: otherUserId,
        type: NOTIFICATION_TYPES.date_plan_review,
        title: 'New date plan to review',
        message: 'Your partner shared a co-date plan',
        actorId: userId,
        data: { connection_id: connectionId, tab: 'dates', url: `/connection/${connectionId}?tab=dates` },
      });
      toast.success('Plan ready — partner notified');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const saveEdits = async () => {
    if (!plan || !editText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('date_plans')
        .update({
          plan_text: editText.trim(),
          status: 'reviewing',
          creator_stance: null,
          partner_stance: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', plan.id);
      if (error) throw error;
      setEditing(false);
      await createNotification({
        userId: otherUserId,
        type: NOTIFICATION_TYPES.date_plan_updated,
        title: 'Date plan updated',
        message: 'Your partner edited the co-date plan',
        actorId: userId,
        data: { connection_id: connectionId, tab: 'dates', url: `/connection/${connectionId}?tab=dates` },
      });
      toast.success('Edits saved — stances reset');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addIdea = async () => {
    if (!ideaText.trim()) return;
    const idea: DateIdea = {
      user_id: userId,
      text: ideaText.trim(),
      created_at: new Date().toISOString(),
    };
    if (plan) {
      const next = [...(plan.ideas || []), idea];
      const { error } = await supabase
        .from('date_plans')
        .update({ ideas: next, updated_at: new Date().toISOString() } as any)
        .eq('id', plan.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setIdeaText('');
      await createNotification({
        userId: otherUserId,
        type: NOTIFICATION_TYPES.date_plan_updated,
        title: 'New date idea',
        message: idea.text.slice(0, 80),
        actorId: userId,
        data: { connection_id: connectionId, tab: 'dates', url: `/connection/${connectionId}?tab=dates` },
      });
      await load();
    } else {
      // Seed a draft plan shell so ideas persist before AI generate
      const { error } = await supabase.from('date_plans').insert({
        connection_id: connectionId,
        created_by: userId,
        title: 'Our date plan',
        city: city || null,
        budget,
        preference,
        plan_text: '',
        status: 'draft',
        ideas: [idea],
      } as any);
      if (error) {
        toast.error(error.message);
        return;
      }
      setIdeaText('');
      await load();
    }
    toast.success('Idea added');
  };

  const setStance = async (stance: 'approve' | 'not_for_me') => {
    if (!plan) return;
    const isCreator = plan.created_by === userId;
    const patch: any = {
      updated_at: new Date().toISOString(),
      status: 'reviewing',
    };
    if (isCreator) patch.creator_stance = stance;
    else patch.partner_stance = stance;

    const other = isCreator ? plan.partner_stance : plan.creator_stance;
    if (stance === 'approve' && other === 'approve') {
      patch.status = 'agreed';
    }

    const { error } = await supabase.from('date_plans').update(patch).eq('id', plan.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (patch.status === 'agreed') {
      await createNotification({
        userId: otherUserId,
        type: NOTIFICATION_TYPES.date_plan_agreed,
        title: 'Date plan agreed!',
        message: 'You both approved the co-date plan',
        actorId: userId,
        data: { connection_id: connectionId, tab: 'dates', url: `/connection/${connectionId}?tab=dates` },
      });
      toast.success('Both approved — plan agreed');
    } else if (stance === 'not_for_me') {
      await createNotification({
        userId: otherUserId,
        type: NOTIFICATION_TYPES.date_plan_updated,
        title: 'Partner said not for me',
        message: 'Try editing or regenerating the plan',
        actorId: userId,
        data: { connection_id: connectionId, tab: 'dates', url: `/connection/${connectionId}?tab=dates` },
      });
      toast.message('Noted — partner notified');
    } else {
      toast.success('You approved');
    }
    await load();
  };

  if (!unlocked) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center space-y-2">
          <CalendarHeart className="mx-auto text-muted-foreground" size={28} />
          <p className="text-sm font-bold">Co-date planner locked</p>
          <p className="text-xs text-muted-foreground">
            {lockReason || 'Available on invite bonds, or dating bonds after Match.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <CalendarHeart size={16} className="text-primary" /> Plan a Date
        </p>
        <p className="text-xs text-muted-foreground">
          AI draft you both review — Approve, Edit, Add ideas, or Not for me.
        </p>
      </div>

      {plan?.status === 'agreed' && (
        <Badge className="rounded-full bg-emerald-100 text-emerald-800 border-0">Agreed</Badge>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
        <Input placeholder="Budget (e.g. low / moderate / treat)" value={budget} onChange={(e) => setBudget(e.target.value)} className="rounded-xl" />
        <Input placeholder="Vibe (romantic, adventurous…)" value={preference} onChange={(e) => setPreference(e.target.value)} className="rounded-xl" />
      </div>

      <Button
        className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold"
        disabled={generating}
        onClick={generatePlan}
      >
        <Sparkles size={14} className="mr-1" />
        {generating ? 'Planning…' : plan?.plan_text ? 'Regenerate with AI' : 'Generate co-date plan'}
      </Button>

      {plan?.plan_text ? (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold truncate">{plan.title}</p>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => { setEditing((v) => !v); setEditText(plan.plan_text); }}>
                <Pencil size={14} className="mr-1" /> Edit
              </Button>
            </div>
            {editing ? (
              <div className="space-y-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="rounded-xl min-h-[160px] text-sm" />
                <Button className="w-full rounded-xl" disabled={saving} onClick={saveEdits}>
                  {saving ? 'Saving…' : 'Save edits'}
                </Button>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{plan.plan_text}</p>
            )}

            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span>You: {myStance || '—'}</span>
              <span>{otherUserName}: {theirStance || '—'}</span>
            </div>

            {plan.status !== 'agreed' && (
              <div className="grid grid-cols-2 gap-2">
                <Button className="rounded-xl" variant="secondary" onClick={() => setStance('approve')}>
                  <Check size={14} className="mr-1" /> Approve
                </Button>
                <Button className="rounded-xl" variant="outline" onClick={() => setStance('not_for_me')}>
                  <ThumbsDown size={14} className="mr-1" /> Not for me
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-2">No draft yet — add ideas or generate.</p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground">Ideas</p>
        {(plan?.ideas || []).map((idea, i) => (
          <div key={`${idea.created_at}-${i}`} className="rounded-xl border px-3 py-2 text-xs">
            {idea.text}
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="Add an idea…"
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            className="rounded-xl"
          />
          <Button size="icon" className="rounded-xl shrink-0" onClick={addIdea}>
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DatePlanPanel;
