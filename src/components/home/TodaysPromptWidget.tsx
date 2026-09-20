import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquareHeart, Send, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const TodaysPromptWidget = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPrompt();
  }, [user]);

  const loadPrompt = async () => {
    if (!user) return;
    setLoading(true);

    // Check for active connection
    const { data: conn } = await supabase
      .from('connections')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .not('status', 'in', '("ended","blocked")')
      .limit(1)
      .maybeSingle();
    setActiveConnection(conn);

    const promptType = conn ? 'couple' : 'self';
    const today = new Date().toISOString().split('T')[0];

    // Try to get today's prompt
    let { data: existing } = await supabase
      .from('daily_prompts')
      .select('*')
      .eq('for_date', today)
      .eq('prompt_type', promptType)
      .maybeSingle();

    if (!existing) {
      // Generate with AI
      try {
        const { data: aiData } = await supabase.functions.invoke('quiz-ai', {
          body: {
            quizType: 'daily-prompt',
            inputs: { promptType },
          },
        });
        const promptText = aiData?.result || (promptType === 'couple'
          ? 'What is one thing your partner did recently that made you smile?'
          : 'What is one thing you love about yourself today?');

        const { data: inserted } = await supabase
          .from('daily_prompts')
          .insert({ prompt_text: promptText, prompt_type: promptType, for_date: today })
          .select()
          .maybeSingle();
        existing = inserted;
      } catch {
        // Fallback prompt
        const fallback = promptType === 'couple'
          ? 'What is one thing your partner did recently that made you smile?'
          : 'What is one thing you love about yourself today?';
        const { data: inserted } = await supabase
          .from('daily_prompts')
          .insert({ prompt_text: fallback, prompt_type: promptType, for_date: today })
          .select()
          .maybeSingle();
        existing = inserted;
      }
    }

    setPrompt(existing);

    // Check if already answered today
    if (existing) {
      const { data: resp } = await supabase
        .from('daily_prompt_responses')
        .select('*')
        .eq('prompt_id', existing.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setResponse(resp);
    }

    setLoading(false);
  };

  const submitAnswer = async (sendToPartner: boolean) => {
    if (!answer.trim() || !prompt || !user) return;
    setSubmitting(true);

    const insertData: any = {
      user_id: user.id,
      prompt_id: prompt.id,
      response_text: answer.trim(),
      sent_to_partner: sendToPartner,
    };

    if (sendToPartner && activeConnection) {
      insertData.connection_id = activeConnection.id;
    }

    const { data, error } = await supabase
      .from('daily_prompt_responses')
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      toast.error('Failed to submit response');
    } else {
      setResponse(data);
      setShowInput(false);
      toast.success(sendToPartner ? 'Sent to partner 💕' : 'Answer saved ✅');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-primary/10">
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading today's prompt...</span>
        </CardContent>
      </Card>
    );
  }

  if (!prompt) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="shadow-md border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareHeart size={18} className="text-primary" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              💌 Today's Prompt
            </p>
          </div>

          <p className="text-sm font-medium">{prompt.prompt_text}</p>

          {response ? (
            <div className="space-y-2">
              <div className="bg-accent/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 font-bold">Your response</p>
                <p className="text-sm">{response.response_text}</p>
              </div>
              {response.sent_to_partner && (
                <p className="text-xs text-primary font-bold">Sent 💕 waiting for their reply</p>
              )}
            </div>
          ) : showInput ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Type your answer..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                className="rounded-xl text-sm min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-xl lovli-gradient text-primary-foreground flex-1"
                  disabled={!answer.trim() || submitting}
                  onClick={() => submitAnswer(false)}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span className="ml-1">Answer</span>
                </Button>
                {activeConnection && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl flex-1"
                    disabled={!answer.trim() || submitting}
                    onClick={() => submitAnswer(true)}
                  >
                    <Send size={14} />
                    <span className="ml-1">Send to partner</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              className="rounded-xl lovli-gradient text-primary-foreground"
              onClick={() => setShowInput(true)}
            >
              <MessageSquareHeart size={14} className="mr-1" /> Answer
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TodaysPromptWidget;
