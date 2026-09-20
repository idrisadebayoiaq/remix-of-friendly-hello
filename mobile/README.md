# Lovli mobile (Expo) — Phase 9 APK first

**Android package:** `com.lovli.app`  
**Scheme:** `lovli://` (secondary only)

## Invite flow (locked)

1. Share **HTTPS** `https://YOUR_DOMAIN/invite?token=…` (from APK or web).
2. Recipient Accept/Decline on the **website**.
3. After **Yes** → `/get-app?reason=accepted` (Download APK + Continue on web).
4. After **No** → optional soft Download only.
5. Same-account login in APK → Chats already has the bond.

## Setup

1. Copy repo-root `google-services.json` → `mobile/google-services.json` (do not commit).
2. Edge secret `FIREBASE_SERVICE_ACCOUNT_JSON` = Admin SDK JSON (already for `send-fcm`).
3. Env:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_APP_URL` (same as web `VITE_PUBLIC_APP_URL`)
4. Web env: `VITE_PUBLIC_APP_URL`, `VITE_APK_DOWNLOAD_URL` (when APK is hosted).

## Scripts

```bash
cd mobile
npm start
# later: eas build -p android --profile preview
```
