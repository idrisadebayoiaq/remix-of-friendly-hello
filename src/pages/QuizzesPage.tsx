import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Calendar, Heart, Sparkles, Loader2, Zap } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const TONES = [
  { value: 'romantic', label: '🌹 Romantic' },
  { value: 'funny', label: '😄 Funny' },
  { value: 'serious', label: '🧐 Serious' },
];
const DETAIL_LEVELS = [
  { value: 'quick', label: '⚡ Quick (1 min)' },
  { value: 'normal', label: '📝 Normal (3 min)' },
  { value: 'deep', label: '🔍 Deep (5-7 min)' },
];
const RELATIONSHIP_STAGES = ['Crush', 'Talking Stage', 'Dating', 'Long Distance', 'Engaged', 'Married'];

const loveLanguageQuestions = [
  { q: 'I feel most loved when someone...', options: ['Says kind words to me', 'Gives me a thoughtful gift', 'Spends quality time with me', 'Helps me with tasks', 'Gives me a warm hug'] },
  { q: 'My ideal evening is...', options: ['Deep conversation', 'Receiving a surprise', 'Watching a movie together', 'Having dinner cooked for me', 'Cuddling on the couch'] },
  { q: 'I appreciate when my partner...', options: ['Compliments me', 'Brings me flowers', 'Plans activities together', 'Does chores without asking', 'Holds my hand in public'] },
  { q: 'I feel disconnected when...', options: ["I don't hear \"I love you\"", 'Birthdays are forgotten', "We don't spend time together", 'I do everything alone', "There's no physical affection"] },
  { q: 'The perfect gift is...', options: ['A love letter', 'Something they picked out for me', 'An experience together', 'Something practical', 'Something I can wear close to me'] },
];
const languageMap = ['Words of Affirmation', 'Receiving Gifts', 'Quality Time', 'Acts of Service', 'Physical Touch'];

const QuizzesPage = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('type') || 'gift';
  const userCurrency = (profile as any)?.preferred_currency || 'USD';

  // Common options
  const [tone, setTone] = useState('romantic');
  const [detailLevel, setDetailLevel] = useState('normal');

  // Gift
  const [relationLevel, setRelationLevel] = useState('');
  const [budget, setBudget] = useState('');
  const [giftResults, setGiftResults] = useState<string[]>([]);
  const [giftLoading, setGiftLoading] = useState(false);

  // Date
  const [dateBudget, setDateBudget] = useState('');
  const [city, setCity] = useState(profile?.city || '');
  const [preference, setPreference] = useState('');
  const [dateResult, setDateResult] = useState('');
  const [dateLoading, setDateLoading] = useState(false);

  // Love Language
  const [llAnswers, setLlAnswers] = useState<number[]>([]);
  const [llResult, setLlResult] = useState('');
  const [llExplanation, setLlExplanation] = useState('');
  const [llLoading, setLlLoading] = useState(false);

  // Compatibility
  const [compatResult, setCompatResult] = useState('');
  const [compatLoading, setCompatLoading] = useState(false);
  const [partnerTraits, setPartnerTraits] = useState('');

  const callQuizAI = async (quizType: string, inputs: any) => {
    const { data, error } = await supabase.functions.invoke('quiz-ai', { body: { quizType, inputs } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.result;
  };

  const runGiftQuiz = async () => {
    if (!relationLevel) { toast.error('Select relationship level'); return; }
    setGiftLoading(true);
    try {
      const result = await callQuizAI('gift', { relationLevel, budget: `${budget} ${userCurrency}`, tone, detailLevel });
      let suggestions: string[];
      try { suggestions = JSON.parse(result); } catch { suggestions = result.split('\n').filter((l: string) => l.trim()).slice(0, 5); }
      setGiftResults(suggestions);
      await supabase.from('quiz_results').insert({ user_id: user!.id, quiz_type: 'gift', inputs: { relationLevel, budget, tone, detailLevel } as any, results: { suggestions } as any });
      toast.success('AI gift suggestions ready! 🎁✨');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    setGiftLoading(false);
  };

  const runDatePlanner = async () => {
    setDateLoading(true);
    try {
      const result = await callQuizAI('date', { city: city || 'a typical city', budget: `${dateBudget} ${userCurrency}`, preference, tone, detailLevel });
      setDateResult(result);
      await supabase.from('quiz_results').insert({ user_id: user!.id, quiz_type: 'date', inputs: { dateBudget, city, preference, tone, detailLevel } as any, results: { plan: result } as any });
      toast.success('AI date plan ready! 📅✨');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    setDateLoading(false);
  };

  const runLoveLanguage = async () => {
    if (llAnswers.length < 5) { toast.error('Answer all questions'); return; }
    setLlLoading(true);
    const counts = [0, 0, 0, 0, 0];
    llAnswers.forEach(a => counts[a]++);
    const maxIdx = counts.indexOf(Math.max(...counts));
    const result = languageMap[maxIdx];
    setLlResult(result);
    try {
      const explanation = await callQuizAI('love-language', { answers: llAnswers, tone, detailLevel });
      setLlExplanation(explanation);
    } catch { setLlExplanation(''); }
    await supabase.from('quiz_results').insert({ user_id: user!.id, quiz_type: 'love_language', inputs: { answers: llAnswers } as any, results: { language: result } as any });
    await supabase.from('profiles').update({ love_language: result }).eq('user_id', user!.id);
    toast.success('Love language discovered! ❤️');
    setLlLoading(false);
  };

  const runCompatibility = async () => {
    if (!partnerTraits.trim()) { toast.error('Describe your partner'); return; }
    setCompatLoading(true);
    try {
      const result = await callQuizAI('compatibility', { partnerTraits, myInterests: profile?.interests || [], tone, detailLevel });
      setCompatResult(result);
      await supabase.from('quiz_results').insert({ user_id: user!.id, quiz_type: 'compatibility', inputs: { partnerTraits } as any, results: { analysis: result } as any });
      toast.success('Compatibility analysis ready! 💕');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    setCompatLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <BackHeader title="AI Quizzes ✨" />

      {/* Shared Options */}
      <Card className="shadow-sm border-0">
        <CardContent className="p-3 flex gap-2">
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="rounded-xl h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>{TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={detailLevel} onValueChange={setDetailLevel}>
            <SelectTrigger className="rounded-xl h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>{DETAIL_LEVELS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gift" className="text-xs">🎁 Gift</TabsTrigger>
          <TabsTrigger value="date" className="text-xs">📅 Date</TabsTrigger>
          <TabsTrigger value="love-language" className="text-xs">❤️ Love</TabsTrigger>
          <TabsTrigger value="compatibility" className="text-xs">💕 Match</TabsTrigger>
        </TabsList>

        <TabsContent value="gift" className="space-y-3 mt-3">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4 space-y-3">
              <Select value={relationLevel} onValueChange={setRelationLevel}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Relationship stage" /></SelectTrigger>
                <SelectContent>{RELATIONSHIP_STAGES.map(v => <SelectItem key={v} value={v.toLowerCase()}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder={`Budget (${userCurrency})`} value={budget} onChange={e => setBudget(e.target.value)} className="rounded-xl" />
              <Button onClick={runGiftQuiz} disabled={giftLoading} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
                {giftLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</> : <><Gift size={16} className="mr-2" /> Get AI Suggestions</>}
              </Button>
              {giftResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-bold">🎁 AI Gift Ideas:</p>
                  {giftResults.map((g, i) => <div key={i} className="text-sm bg-accent p-2 rounded-xl">{typeof g === 'string' ? g : JSON.stringify(g)}</div>)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="date" className="space-y-3 mt-3">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4 space-y-3">
              <Input placeholder="City / Location" value={city} onChange={e => setCity(e.target.value)} className="rounded-xl" />
              <Input placeholder={`Budget (${userCurrency})`} value={dateBudget} onChange={e => setDateBudget(e.target.value)} className="rounded-xl" />
              <Select value={preference} onValueChange={setPreference}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Indoor / Outdoor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={runDatePlanner} disabled={dateLoading} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
                {dateLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Planning...</> : <><Calendar size={16} className="mr-2" /> AI Date Plan</>}
              </Button>
              {dateResult && <pre className="text-sm bg-accent p-3 rounded-xl whitespace-pre-wrap">{dateResult}</pre>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="love-language" className="space-y-3 mt-3">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4 space-y-4">
              {loveLanguageQuestions.map((q, qi) => (
                <div key={qi} className="space-y-2">
                  <p className="text-sm font-bold">{qi + 1}. {q.q}</p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <button key={oi} onClick={() => { const next = [...llAnswers]; next[qi] = oi; setLlAnswers(next); }}
                        className={`w-full text-left text-sm p-2 rounded-xl transition-colors ${llAnswers[qi] === oi ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={runLoveLanguage} disabled={llLoading} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
                {llLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Analyzing...</> : <><Heart size={16} className="mr-2" /> Discover My Language</>}
              </Button>
              {llResult && (
                <div className="text-center p-4 bg-accent rounded-xl space-y-2">
                  <p className="text-sm text-muted-foreground">Your primary love language is</p>
                  <p className="text-xl font-bold lovli-text-gradient">{llResult}</p>
                  {llExplanation && <p className="text-sm text-muted-foreground mt-2">{llExplanation}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compatibility" className="space-y-3 mt-3">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-bold">Describe your partner or crush</p>
              <Input placeholder="Their traits, interests, personality..." value={partnerTraits} onChange={e => setPartnerTraits(e.target.value)} className="rounded-xl" />
              <Button onClick={runCompatibility} disabled={compatLoading} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
                {compatLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Analyzing...</> : <><Zap size={16} className="mr-2" /> Check Compatibility</>}
              </Button>
              {compatResult && <pre className="text-sm bg-accent p-3 rounded-xl whitespace-pre-wrap">{compatResult}</pre>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuizzesPage;
