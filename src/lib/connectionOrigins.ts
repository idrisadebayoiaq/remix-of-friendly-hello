/** Connection bond source (stored as connections.origin_type). */
export const CONNECTION_ORIGINS = {
  invite: 'invite',
  dating: 'dating',
  friends: 'friends',
  /** @deprecated Prefer friends — kept for legacy rows */
  discover: 'discover',
} as const;

export type ConnectionOrigin =
  (typeof CONNECTION_ORIGINS)[keyof typeof CONNECTION_ORIGINS];

/** Normalize legacy discover → friends for feature gates. */
export function normalizeConnectionOrigin(
  origin: string | null | undefined,
): 'invite' | 'dating' | 'friends' {
  if (origin === 'invite') return 'invite';
  if (origin === 'dating') return 'dating';
  return 'friends';
}

/** Match / Marry stranger tools — not for invite bonds. */
export function canUseMatchMarry(origin: string | null | undefined): boolean {
  return normalizeConnectionOrigin(origin) !== 'invite';
}

/** Short chat-list / header badge for bond source. */
export function bondTypeBadge(origin: string | null | undefined): {
  label: string;
  tone: 'invite' | 'dating' | 'friends';
} {
  const o = normalizeConnectionOrigin(origin);
  if (o === 'invite') return { label: 'Invite', tone: 'invite' };
  if (o === 'dating') return { label: 'Dating', tone: 'dating' };
  return { label: 'Friends', tone: 'friends' };
}
