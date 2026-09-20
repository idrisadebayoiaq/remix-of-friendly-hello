import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, HeartHandshake, MessageCircle, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const tabs = [
  { to: '/home', icon: Home, label: 'Home', match: (p: string) => p === '/' || p.startsWith('/home') },
  { to: '/discover', icon: Compass, label: 'Discover', match: (p: string) => p.startsWith('/discover') || p.startsWith('/post/') },
  { to: '/meet', icon: HeartHandshake, label: 'Meet', match: (p: string) => p.startsWith('/meet') || p.startsWith('/ask') || p.startsWith('/find-love') || p.startsWith('/friends') },
  { to: '/chats', icon: MessageCircle, label: 'Chats', match: (p: string) => p.startsWith('/chats') || p.startsWith('/connection/') },
  { to: '/you', icon: UserRound, label: 'You', match: (p: string) => p.startsWith('/you') || p.startsWith('/profile') || p.startsWith('/settings') || p.startsWith('/notifications') },
];

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    const channel = supabase.channel('nav-notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="mx-auto max-w-[480px] flex items-center justify-around h-16 px-2">
        {tabs.map(({ to, icon: Icon, label, match }) => {
          const isActive = match(location.pathname);
          const showBadge = to === '/you' && unreadCount > 0;
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`p-1.5 rounded-xl transition-colors relative ${isActive ? 'bg-accent' : ''}`}
              >
                <Icon
                  size={22}
                  className={`transition-colors ${isActive ? 'text-primary' : 'text-secondary'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </motion.div>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-secondary'}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
