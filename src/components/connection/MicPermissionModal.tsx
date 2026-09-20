import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

interface MicPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  errorType: 'denied' | 'not-found' | 'unknown';
}

const MicPermissionModal = ({ open, onOpenChange, onRetry, errorType }: MicPermissionModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic size={18} className="text-destructive" />
            {errorType === 'not-found' ? 'No Microphone Found' : 'Microphone Blocked'}
          </DialogTitle>
          <DialogDescription>
            {errorType === 'not-found'
              ? 'No microphone was detected on your device.'
              : 'Microphone permission is blocked. Please enable it to send voice messages.'}
          </DialogDescription>
        </DialogHeader>

        {errorType !== 'not-found' && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-xs text-muted-foreground">How to enable:</p>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-muted/50">
                <p className="font-bold text-xs mb-1">📱 Android Chrome</p>
                <p className="text-xs text-muted-foreground">Tap the lock icon (🔒) in the address bar → Site settings → Microphone → Allow → Refresh the page</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/50">
                <p className="font-bold text-xs mb-1">🍎 iPhone Safari</p>
                <p className="text-xs text-muted-foreground">Go to Settings → Safari → Microphone → Allow → Reload the page</p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/50">
                <p className="font-bold text-xs mb-1">💻 Desktop Chrome</p>
                <p className="text-xs text-muted-foreground">Click the lock icon (🔒) in the address bar → Site settings → Microphone → Allow → Refresh</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={onRetry}>
            Retry 🎤
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MicPermissionModal;
