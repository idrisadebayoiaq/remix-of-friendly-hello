import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || 'https://lovlimatch.vercel.app').replace(
  /\/$/,
  '',
);

export const hasSupabaseConfig = Boolean(url && anon);

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export function shareUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${APP_URL}${p}`;
}
