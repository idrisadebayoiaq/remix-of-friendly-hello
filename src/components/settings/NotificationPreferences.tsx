import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BellRing, MessageCircle, Users, Heart, HelpCircle, Megaphone, Send, AlertTriangle } from 'lucide-react';

const PUSH_PREFS = [
  { key: 'push_messages', label: 'Messages', icon: MessageCircle, desc: 'New chat messages from connections' },
  { key: 'push_connection_requests', label: 'Connection Requests', icon: Users, desc: 'When someone wants to connect' },
  { key: 'push_dating_requests', label: 'Dating Requests', icon: Heart, desc: 'Dating proposal notifications' },
  { key: 'push_daily_questions', label: 'Daily Questions', icon: HelpCircle, desc: 'Daily question reminders' },
  { key: 'push_community', label: 'Community Activity', icon: Megaphone, desc: 'Likes, comments on your posts' },
  { key: 'push_invites', label: 'Invites', icon: Send, desc: 'New invite notifications' },
  { key: 'push_appeals', label: 'Appeal Updates', icon: AlertTriangle, desc: 'Status changes on your appeals' },
  { key: 'push_reports', label: 'Report Updates', icon: AlertTriangle, desc: 'Admin responses to your reports' },
];

interface NotificationPreferencesProps {
  settings: Record<string, any>;
  onUpdate: (key: string, value: boolean) => void;
}

const NotificationPreferences = ({ settings, onUpdate }: NotificationPreferencesProps) => {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <BellRing size={16} /> Push Notification Preferences
        </div>
        <p className="text-xs text-muted-foreground">Choose which push notifications you receive.</p>
        {PUSH_PREFS.map(({ key, label, icon: Icon, desc }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={14} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <Label className="text-sm">{label}</Label>
                <p className="text-xs text-muted-foreground truncate">{desc}</p>
              </div>
            </div>
            <Switch checked={settings[key] ?? true} onCheckedChange={v => onUpdate(key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
