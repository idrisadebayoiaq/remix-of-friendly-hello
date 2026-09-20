import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import { registerServiceWorker, requestNotificationPermission, showLocalNotification, subscribeToPush } from '@/lib/notifications';
import { playNotificationSound } from '@/lib/sounds';
import { supabase } from '@/integrations/supabase/client';

const AppLayout = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Track app installation
    const onInstalled = () => {
      supabase.from('user_settings').update({ install_prompt_installed: true } as any).eq('user_id', user.id);
    };
    window.addEventListener('appinstalled', onInstalled);

    registerServiceWorker();
    requestNotificationPermission().then(granted => {
      if (granted) subscribeToPush(user.id);
    });

    // Listen for new messages via realtime
    const msgChannel = supabase
      .channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_messages' },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            playNotificationSound('message');
            showLocalNotification('New Message 💬', 'You received a new message!', '/chats');
          }
        })
      .subscribe();

    // Listen for new connection requests
    const reqChannel = supabase
      .channel('global-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_requests' },
        (payload) => {
          if (payload.new.receiver_id === user.id) {
            playNotificationSound('notification');
            showLocalNotification('Connection Request 💕', 'Someone wants to connect with you!', '/home');
          }
        })
      .subscribe();

    // Listen for notifications (invite accepted/declined)
    const notifChannel = supabase
      .channel('global-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as any;
          playNotificationSound('notification');
          showLocalNotification(notif.title, notif.message, '/home');
        })
      .subscribe();

    // Listen for support chat replies
    const supportChannel = supabase
      .channel('global-support')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chats', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if ((payload.new as any).is_admin) {
            playNotificationSound('message');
            showLocalNotification('Support Reply 💬', 'You have a new reply from support!', '/support');
          }
        })
      .subscribe();

    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(supportChannel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse-heart text-primary">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="mx-auto max-w-[480px] min-h-screen bg-background pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
};

export default AppLayout;
