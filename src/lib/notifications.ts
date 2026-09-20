import { supabase } from '@/integrations/supabase/client';

// VAPID public key (this is safe to embed in client code - it's public)
const VAPID_PUBLIC_KEY = 'BBIJFfE_uV0dolcs-qJelhzcO5v1qU-Dy_F3l-OHkAfRazSYhN2xiHknhgzZAKEWSofaZtPL2V8uY5Kiuz69Xtw';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
};

/**
 * Subscribe to Web Push notifications and save the subscription to the database.
 * Call this after the user is authenticated and has granted notification permission.
 */
export const subscribeToPush = async (userId: string): Promise<boolean> => {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID_PUBLIC_KEY not configured. Web push disabled.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready as any;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // Save subscription to database (upsert by endpoint)
    const subJson = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        subscription: subJson,
      } as any,
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('Failed to save push subscription:', error);
      return false;
    }

    console.log('Push subscription saved successfully');
    return true;
  } catch (err) {
    console.error('Failed to subscribe to push:', err);
    return false;
  }
};

/**
 * Unsubscribe from push notifications and remove from database.
 */
export const unsubscribeFromPush = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.ready as any;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err);
  }
};

export const showLocalNotification = (title: string, body: string, url?: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: url || '/',
      } as any);
    });
  } else {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  }
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
