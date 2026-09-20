import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertCircle, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BannedPage = () => {
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const banReason = profile?.ban_reason || 'Your account has been suspended due to a violation of our community guidelines.';
  const bannedAt = profile?.banned_at 
    ? new Date(profile.banned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 mb-4">
          <AlertCircle className="text-destructive" size={40} />
        </div>
        <h1 className="text-4xl font-bold mb-2">Account Suspended</h1>
        <p className="text-muted-foreground">Your account has been temporarily disabled</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-[400px]"
      >
        <Card className="shadow-lg border-destructive/30 bg-card">
          <CardHeader>
            <CardTitle className="text-destructive">Suspension Details</CardTitle>
            <CardDescription>Suspended on {bannedAt}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold block mb-2">Reason for suspension:</span>
                {banReason}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                If you believe this is a mistake or would like to appeal this decision, please contact our support team.
              </p>
              <a 
                href="mailto:support@lovli.com"
                className="text-sm text-primary hover:underline font-medium"
              >
                📧 Contact Support
              </a>
            </div>

            <Button 
              onClick={handleSignOut}
              className="w-full rounded-2xl h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2">
            <Heart className="text-muted-foreground" size={16} />
            <p className="text-xs text-muted-foreground">We hope to see you back soon 💕</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BannedPage;
