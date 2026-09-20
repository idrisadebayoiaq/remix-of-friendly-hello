/**
 * Canonical HTTPS origin for share links (invites, posts, profiles).
 * Prefer VITE_PUBLIC_APP_URL in production so APK-built shares hit the live site.
 */
export function getPublicAppUrl(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

/** Absolute share URL for a path (must start with /). */
export function shareUrl(path: string): string {
  const base = getPublicAppUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Latest preview APK (EAS). Prefer VITE_APK_DOWNLOAD_URL so releases can swap without code changes. */
const DEFAULT_APK_DOWNLOAD_URL =
  'https://expo.dev/artifacts/eas/njOHKmP07rVyH_ldT11rSnaYAp4laWyqL1HD0JeNhdk.apk';

/** Direct APK download URL (env override, else latest known preview build). */
export function getApkDownloadUrl(): string {
  const fromEnv = (import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined)?.trim();
  return fromEnv || DEFAULT_APK_DOWNLOAD_URL;
}
