import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

let handlerConfigured = false;
let channelReady = false;

function ensureHandler() {
  if (handlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Never crash app startup over notification config
  }
}

/** Android 8+ notification channel used by FCM / expo-notifications */
export async function setupAndroidPushChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('lovli-default', {
      name: 'Lovli',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e11d48',
      sound: 'default',
    });
    channelReady = true;
  } catch (e) {
    console.warn('push channel soft-fail', e);
  }
}

/**
 * Register native FCM device token (Android) for send-fcm.
 * Fully soft-fail — never throws to callers.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  try {
    if (!userId) return null;
    if (!Device.isDevice) return null;
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;

    ensureHandler();
    await setupAndroidPushChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // Native FCM/APNs token — required by supabase send-fcm (not ExpoPushToken).
    // Race a timeout so a missing google-services / Play Services never hangs the UI thread.
    const tokenRace = await Promise.race([
      Notifications.getDevicePushTokenAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);
    if (!tokenRace || typeof (tokenRace as any).data !== 'string') return null;
    const token = (tokenRace as { data: string }).data;

    const { error } = await supabase.from('device_push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id,token' },
    );
    if (error) {
      console.warn('device_push_tokens upsert', error.message);
    }
    return token;
  } catch (e) {
    console.warn('registerForPush soft-fail', e);
    return null;
  }
}
