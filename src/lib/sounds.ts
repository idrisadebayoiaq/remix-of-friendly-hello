// Notification sound utility
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const isSoundEnabled = (): boolean => {
  return localStorage.getItem('lovli-sound-enabled') !== 'false';
};

export const setSoundEnabled = (enabled: boolean) => {
  localStorage.setItem('lovli-sound-enabled', enabled ? 'true' : 'false');
};

export const getSoundEnabled = (): boolean => isSoundEnabled();

export const playNotificationSound = (type: 'message' | 'notification' = 'message') => {
  if (!isSoundEnabled()) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'message') {
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else {
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.24);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Silently fail if audio is not available
  }
};
