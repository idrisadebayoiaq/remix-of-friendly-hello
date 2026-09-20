import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, X, Smartphone, Monitor, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getApkDownloadUrl } from '@/lib/appUrl';

interface InstallPromptModalProps {
  deferredPrompt: any | null;
  onClose: (installed?: boolean, dontShowAgain?: boolean) => void;
}

const InstallPromptModal = ({ deferredPrompt, onClose }: InstallPromptModalProps) => {
  const [dontShow, setDontShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const apkUrl = getApkDownloadUrl();

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      onClose(outcome === 'accepted', false);
    } catch {
      onClose(false, false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] bg-card rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl lovli-gradient flex items-center justify-center shadow-md">
                <Download size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold font-display text-lg">Install Lovli</h3>
                <p className="text-xs text-muted-foreground">Android APK or home-screen shortcut</p>
              </div>
            </div>
            <button onClick={() => onClose(false, dontShow)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>

          {!isIOS && (
            <Button asChild className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold h-12">
              <a href={apkUrl} download target="_blank" rel="noopener noreferrer">
                <Download size={18} className="mr-2" />
                Download Android APK
              </a>
            </Button>
          )}

          {deferredPrompt ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Or install the web app to your home screen:</p>
              <Button
                className="w-full rounded-2xl h-11"
                variant="outline"
                onClick={handleInstall}
                disabled={installing}
              >
                <Smartphone size={18} className="mr-2" />
                {installing ? 'Installing...' : 'Add to home screen'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isIOS ? (
                <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Apple size={16} /> iPhone / iPad
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                    <li>Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                    <li>Tap <strong>&quot;Add&quot;</strong> to confirm</li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <p className="text-xs text-muted-foreground text-center">
                  After download, open the APK and allow install from this browser if prompted. Package:{' '}
                  <code className="text-[10px]">com.lovli.app</code>
                </p>
              ) : (
                <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Monitor size={16} /> Desktop
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Download the APK above for Android phones, or use your browser&apos;s install icon for the web app.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="dontShow"
              checked={dontShow}
              onCheckedChange={(v) => setDontShow(!!v)}
            />
            <label htmlFor="dontShow" className="text-xs text-muted-foreground cursor-pointer">
              Don&apos;t show again
            </label>
          </div>

          <Button
            variant="ghost"
            className="w-full rounded-2xl text-muted-foreground"
            onClick={() => onClose(false, dontShow)}
          >
            Not now
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default InstallPromptModal;
