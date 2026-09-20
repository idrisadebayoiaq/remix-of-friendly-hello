import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Compass, Send, MessageCircle, Shield, ChevronRight, X, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const INTENT_OPTIONS = [
  {
    value: 'invite' as const,
    label: 'Invite someone I know',
    desc: 'Share a private invite link with a partner or crush',
    icon: Send,
  },
  {
    value: 'dating' as const,
    label: 'Meet someone new',
    desc: 'Browse the Meet Dating deck',
    icon: Heart,
  },
  {
    value: 'friends' as const,
    label: 'Make friends',
    desc: 'Find people and send friendship connects',
    icon: Users,
  },
  {
    value: 'grow' as const,
    label: 'Grow myself',
    desc: 'Tips, quizzes, and relationship skills',
    icon: Sparkles,
  },
];

const tourSteps = [
  {
    icon: Heart,
    title: 'Welcome to Lovli 💕',
    text: 'A safe space to connect, grow, and build meaningful relationships.',
    gradient: 'from-primary to-secondary',
  },
  {
    icon: Compass,
    title: 'Discover',
    text: 'Explore posts worldwide, like/comment/react, and connect with people you vibe with.',
    gradient: 'from-secondary to-primary',
  },
  {
    icon: Send,
    title: 'Invite & Connect',
    text: 'Create an invite link and share it anywhere. When they accept, you get a private connection space.',
    gradient: 'from-primary to-secondary',
  },
  {
    icon: MessageCircle,
    title: 'Connection Space',
    text: 'Chat, voice messages, games, daily prompts, memories — everything stays private between you two.',
    gradient: 'from-secondary to-primary',
  },
  {
    icon: Shield,
    title: 'Safety Mode',
    text: 'Lovli prioritizes your safety. Keep Safety Mode ON to get meetup guidance in chats.',
    gradient: 'from-primary to-secondary',
  },
  {
    icon: Heart,
    title: 'Install Lovli',
    text: 'Install Lovli to your home screen for an app-like experience. Look for the install option in Profile or Settings!',
    gradient: 'from-secondary to-primary',
  },
];

const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const { user, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<'intent' | 'tour'>('intent');
  const [intent, setIntent] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const isLast = currentStep === tourSteps.length - 1;
  const step = tourSteps[currentStep];
  const Icon = step.icon;

  const finish = async (selectedIntent?: string | null) => {
    setSaving(true);
    try {
      const value = selectedIntent ?? intent;
      if (user && value) {
        await supabase
          .from('profiles')
          .update({ primary_intent: value } as any)
          .eq('user_id', user.id);
        await refreshProfile?.();
      }
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const continueFromIntent = async () => {
    if (!intent) return;
    if (user) {
      await supabase
        .from('profiles')
        .update({ primary_intent: intent } as any)
        .eq('user_id', user.id);
      await refreshProfile?.();
    }
    setPhase('tour');
  };

  if (phase === 'intent') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ overscrollBehavior: 'contain' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-[400px] bg-card rounded-3xl shadow-2xl overflow-hidden p-6"
        >
          <button
            onClick={() => finish(null)}
            className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-bold font-display mb-1 pr-8">What brings you to Lovli?</h2>
          <p className="text-sm text-muted-foreground mb-4">Pick one — you can change this later in You.</p>

          <div className="space-y-2 mb-4">
            {INTENT_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              const selected = intent === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntent(opt.value)}
                  className={`w-full text-left rounded-2xl border p-3 flex gap-3 transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'lovli-gradient text-primary-foreground' : 'bg-muted'}`}>
                    <OptIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => finish(null)} disabled={saving}>
              Skip
            </Button>
            <Button
              className="flex-1 rounded-2xl lovli-gradient text-primary-foreground font-bold"
              disabled={!intent || saving}
              onClick={continueFromIntent}
            >
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ overscrollBehavior: 'contain' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-[400px] bg-card rounded-3xl shadow-2xl overflow-hidden"
      >
        <button
          onClick={() => finish(intent)}
          className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="p-8 pt-12 flex flex-col items-center text-center"
          >
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-lg`}>
              <Icon size={36} className="text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold font-display mb-3">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">{step.text}</p>
          </motion.div>
        </AnimatePresence>

        <div className="px-8 pb-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-primary' : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 w-full">
            <Button variant="ghost" className="flex-1 rounded-2xl text-muted-foreground" onClick={() => finish(intent)}>
              Skip
            </Button>
            <Button
              className="flex-1 rounded-2xl lovli-gradient text-primary-foreground font-bold"
              onClick={() => (isLast ? finish(intent) : setCurrentStep((s) => s + 1))}
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight size={16} className="ml-1" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingModal;
