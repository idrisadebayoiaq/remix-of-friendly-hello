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

/** Optional direct APK download URL (GitHub Release, R2, etc.). */
export function getApkDownloadUrl(): string | null {
  const url = (import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined)?.trim();
  return url || null;
}
