import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, MessageCircle, Users, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const tabs = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
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
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          const showBadge = to === '/notifications' && unreadCount > 0;
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
