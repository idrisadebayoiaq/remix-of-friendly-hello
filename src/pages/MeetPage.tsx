import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, Send, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AskPage from '@/pages/AskPage';
import FindLovePage from '@/pages/FindLovePage';
import FriendsPage from '@/pages/FriendsPage';

const MEET_TABS = [
  { value: 'invite', label: 'Invite', icon: Send },
  { value: 'dating', label: 'Dating', icon: Heart },
  { value: 'people', label: 'People', icon: Users },
] as const;

type MeetTab = (typeof MEET_TABS)[number]['value'];

const MeetPage = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') || 'invite';
  const tab: MeetTab = useMemo(() => {
    if (raw === 'dating' || raw === 'people' || raw === 'invite') return raw;
    return 'invite';
  }, [raw]);

  const setTab = (value: string) => {
    setParams(value === 'invite' ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold font-display mb-3">Meet</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 h-11 rounded-2xl">
            {MEET_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="rounded-xl gap-1.5 text-xs font-semibold">
                <Icon size={14} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1">
        {tab === 'invite' && (
          <div className="meet-embed" data-meet-tab="invite">
            <AskPage />
          </div>
        )}
        {tab === 'dating' && (
          <div className="meet-embed" data-meet-tab="dating">
            <FindLovePage />
          </div>
        )}
        {tab === 'people' && (
          <div className="meet-embed" data-meet-tab="people">
            <FriendsPage />
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetPage;
