import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Globe, Smartphone } from 'lucide-react';
import { getApkDownloadUrl, shareUrl } from '@/lib/appUrl';

/**
 * APK-first landing: Download Lovli + optional continue on web.
 * Query: ?next=/path&reason=accepted|declined|explore
 */
const GetAppPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/home';
  const reason = params.get('reason') || 'explore';
  const apkUrl = getApkDownloadUrl();

  const copy = useMemo(() => {
    if (reason === 'accepted') {
      return {
        title: 'You said yes — get Lovli on your phone',
        body: 'Download the APK, sign in with the same account, and open Chats to continue together. You can also keep going on the website.',
      };
    }
    if (reason === 'declined') {
      return {
        title: 'Still want Lovli?',
        body: 'You declined that invite — that’s fine. Download the app anytime to explore Discover, Meet, and Grow on your own.',
      };
    }
    return {
      title: 'Get Lovli on Android',
      body: 'Install the APK for the full mobile experience. Or continue in your browser right now.',
    };
  }, [reason]);

  const continueWeb = () => {
    if (next.startsWith('http')) {
      window.location.href = next;
      return;
    }
    navigate(next);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-[420px] w-full shadow-xl border-0">
        <CardContent className="p-8 space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl lovli-gradient flex items-center justify-center text-primary-foreground">
            <Smartphone size={28} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold font-display">{copy.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{copy.body}</p>
          </div>

          {apkUrl ? (
            <Button asChild className="w-full rounded-2xl h-12 lovli-gradient text-primary-foreground font-bold">
              <a href={apkUrl} target="_blank" rel="noopener noreferrer">
                <Download size={16} className="mr-2" /> Download APK
              </a>
            </Button>
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-left space-y-1">
              <p className="text-sm font-bold">APK coming soon</p>
              <p className="text-xs text-muted-foreground">
                Set <code className="text-[10px]">VITE_APK_DOWNLOAD_URL</code> when your release APK is hosted.
                Package: <code className="text-[10px]">com.lovli.app</code>
              </p>
            </div>
          )}

          <Button variant="outline" className="w-full rounded-2xl h-11" onClick={continueWeb}>
            <Globe size={16} className="mr-2" /> Continue on website
          </Button>

          <p className="text-[10px] text-muted-foreground">
            After install, open Lovli and log in with the same email. Shared links always start on the web:{' '}
            <span className="break-all">{shareUrl('/invite')}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GetAppPage;
