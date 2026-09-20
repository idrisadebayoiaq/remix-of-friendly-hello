import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { APP_URL } from './src/lib/supabase';
import { registerForPush, setupAndroidPushChannel } from './src/lib/push';

SplashScreen.preventAutoHideAsync().catch(() => {});

const APP_HOST = (() => {
  try {
    return new URL(APP_URL).host;
  } catch {
    return 'lovlimatch.vercel.app';
  }
})();

/** Injected so the website matches native shell (hide install CTAs, same session UX). */
const INJECTED_BOOT = `
(function() {
  try {
    window.__LOVLI_NATIVE__ = true;
    document.documentElement.dataset.lovliNative = '1';
    localStorage.setItem('lovli_native_shell', '1');
  } catch (e) {}
  true;
})();
`;

/** Periodically report Supabase auth user id to RN for FCM registration. */
const INJECTED_AUTH_BRIDGE = `
(function() {
  if (window.__LOVLI_AUTH_BRIDGE__) return true;
  window.__LOVLI_AUTH_BRIDGE__ = true;
  function readUserId() {
    try {
      var keys = Object.keys(localStorage);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k.indexOf('auth-token') === -1) continue;
        var raw = localStorage.getItem(k);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var uid = parsed && parsed.user && parsed.user.id;
        if (uid) return uid;
      }
    } catch (e) {}
    return null;
  }
  function tick() {
    try {
      var uid = readUserId();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth', userId: uid }));
      }
    } catch (e) {}
  }
  tick();
  setInterval(tick, 4000);
  window.addEventListener('storage', tick);
  true;
})();
`;

function isAppUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'lovli:') return true;
    if (u.host === APP_HOST) return true;
    // Allow same-origin relative navigations / about
    if (url.startsWith(APP_URL)) return true;
    return false;
  } catch {
    return url.startsWith(APP_URL) || url.startsWith('about:');
  }
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const lastPushUser = useRef<string | null>(null);

  // Start at /home — website AppLayout sends unauthenticated users to /auth
  // (same login/signup UI + redirect behaviour as the site).
  const startUrl = useMemo(() => `${APP_URL}/home`, []);

  useEffect(() => {
    setupAndroidPushChannel().catch(() => {});
    SplashScreen.hideAsync().catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        const raw =
          (typeof data?.url === 'string' && data.url) ||
          (typeof data?.path === 'string' && data.path) ||
          (typeof data?.link === 'string' && data.link) ||
          '';
        if (!raw) return;
        const target = raw.startsWith('http') ? raw : `${APP_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
        webRef.current?.injectJavaScript(
          `window.location.href = ${JSON.stringify(target)}; true;`,
        );
      } catch {
        // ignore
      }
    });
    return () => sub.remove();
  }, []);

  // Deep links → load path inside WebView (same site = same features + state)
  useEffect(() => {
    const handle = (url: string) => {
      try {
        const parsed = Linking.parse(url);
        // https://lovlimatch.vercel.app/... or lovli://...
        let path = '';
        if (url.startsWith('http')) {
          const u = new URL(url);
          if (u.host !== APP_HOST) {
            Linking.openURL(url).catch(() => {});
            return;
          }
          path = `${u.pathname}${u.search}${u.hash}`;
        } else {
          path = parsed.path ? `/${parsed.path}` : '/home';
          if (parsed.queryParams) {
            const q = new URLSearchParams(
              Object.entries(parsed.queryParams).map(([k, v]) => [k, String(v ?? '')]),
            ).toString();
            if (q) path += `?${q}`;
          }
        }
        webRef.current?.injectJavaScript(
          `window.location.href = ${JSON.stringify(APP_URL + path)}; true;`,
        );
      } catch {
        // ignore
      }
    };

    Linking.getInitialURL().then((u) => {
      if (u) handle(u);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'auth') {
        const uid = typeof data.userId === 'string' ? data.userId : null;
        if (uid && uid !== lastPushUser.current) {
          lastPushUser.current = uid;
          setTimeout(() => {
            registerForPush(uid).catch(() => {});
          }, 2500);
        }
        if (!uid) lastPushUser.current = null;
      }
    } catch {
      // ignore malformed
    }
  }, []);

  const onShouldStart = useCallback((req: WebViewNavigation) => {
    const { url } = req;
    if (!url || url === 'about:blank') return true;
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('sms:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    // APK / external downloads & unrelated hosts → system browser
    if (
      url.includes('expo.dev/artifacts') ||
      url.endsWith('.apk') ||
      (!isAppUrl(url) && (url.startsWith('http://') || url.startsWith('https://')))
    ) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  if (bootError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.center}>
          <Text style={styles.brand}>Lovli</Text>
          <Text style={styles.err}>{bootError}</Text>
          <Text style={styles.hint}>Check your connection and reopen the app.</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Loading Lovli…</Text>
          </View>
        )}
        <WebView
          ref={webRef}
          source={{ uri: startUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setBootError('Could not load Lovli. Please check your internet connection.');
          }}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 500) {
              setBootError('Lovli is temporarily unavailable. Try again shortly.');
            }
          }}
          onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
          onShouldStartLoadWithRequest={onShouldStart}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={INJECTED_BOOT}
          injectedJavaScript={INJECTED_AUTH_BRIDGE}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          startInLoadingState
          setSupportMultipleWindows={false}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          originWhitelist={['*']}
          userAgent={
            Platform.OS === 'android'
              ? undefined
              : undefined
          }
          applicationNameForUserAgent="LovliNative/1.0"
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  webview: { flex: 1, backgroundColor: '#ffffff' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: { marginTop: 12, color: '#666', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  brand: { fontSize: 32, fontWeight: '800', marginBottom: 8, color: '#e11d48' },
  err: { color: '#b91c1c', textAlign: 'center', lineHeight: 20 },
  hint: { marginTop: 12, color: '#666', textAlign: 'center', fontSize: 13 },
});
