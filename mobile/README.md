# Lovli mobile (Expo)

Full Lovli product in the APK via an authenticated **WebView shell** of `https://lovlimatch.vercel.app` — same screens, login/signup, invites, chats, and features as the website.

## Behaviour

- **Signup / login:** same website Auth page (email, username, gender, terms).
- **Invite shares:** always HTTPS (`EXPO_PUBLIC_APP_URL`). Recipients Accept/Decline on the web; after Yes/No they can continue on web or download the APK.
- **Same account:** log in on the APK → Supabase session restores Home / Chats / connection state.
- **Push:** native FCM → `device_push_tokens` → `send-fcm` Edge Function. Notification icon + channel `lovli-default`.
- **Icons:** generated from `assets/lovli-icon-master.png` via `node scripts/generate-icons.mjs`.

## Build

```bash
cd mobile
# google-services.json must exist locally OR as EAS file env GOOGLE_SERVICES_JSON
npx eas-cli build --platform android --profile preview --non-interactive
```

Env (eas.json preview): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_URL`.
