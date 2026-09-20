import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Compass, Send, MessageCircle, Shield, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  onComplete: () => void;
}

const steps = [
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
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ overscrollBehavior: 'contain' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-[400px] bg-card rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={onComplete}
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
            {/* Icon */}
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-lg`}>
              <Icon size={36} className="text-primary-foreground" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold font-display mb-3">{step.title}</h2>

            {/* Text */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">{step.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Bottom controls */}
        <div className="px-8 pb-8 flex flex-col items-center gap-4">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-primary' : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="ghost"
              className="flex-1 rounded-2xl text-muted-foreground"
              onClick={onComplete}
            >
              Skip
            </Button>
            <Button
              className="flex-1 rounded-2xl lovli-gradient text-primary-foreground font-bold"
              onClick={() => isLast ? onComplete() : setCurrentStep(s => s + 1)}
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
