/**
 * Lovli Android APK shell (Phase 9).
 * Package: com.lovli.app
 *
 * Next steps:
 * 1. Copy google-services.json into mobile/ (gitignored at repo root)
 * 2. Set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
 * 3. Set EXPO_PUBLIC_APP_URL to the same HTTPS host as VITE_PUBLIC_APP_URL
 * 4. Wire auth + 5-tab navigation to match web IA
 * 5. Register FCM token into device_push_tokens
 * 6. eas build -p android --profile preview (APK)
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const TABS = ['Home', 'Discover', 'Meet', 'Chats', 'You'] as const;

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Lovli</Text>
      <Text style={styles.sub}>Android APK shell · com.lovli.app</Text>
      <Text style={styles.hint}>
        Invites always open on HTTPS web first. After Yes, download this APK and sign in with the same account to chat.
      </Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Text key={t} style={styles.tab}>
            {t}
          </Text>
        ))}
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
  },
  sub: {
    fontSize: 14,
    color: '#666',
  },
  hint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f3f3',
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600',
  },
});
