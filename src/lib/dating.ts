export const PROFILE_GENDERS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
] as const;

export type ProfileGender = (typeof PROFILE_GENDERS)[number]['value'];

export const DATING_MATCH_MODES = [
  {
    value: 'approve',
    label: 'Approve first',
    description: 'When someone Matches you, you approve before chat opens.',
  },
  {
    value: 'instant',
    label: 'Instant chat',
    description: 'When someone Matches you, chat opens immediately — no approve.',
  },
] as const;

export type DatingMatchMode = (typeof DATING_MATCH_MODES)[number]['value'];

/** Default opposite-gender deck for Meet Dating. */
export function defaultPreferredGenders(
  gender: ProfileGender | string | null | undefined,
): string[] {
  if (gender === 'man') return ['woman'];
  if (gender === 'woman') return ['man'];
  return [];
}

export function genderLabel(gender: string | null | undefined): string {
  return PROFILE_GENDERS.find((g) => g.value === gender)?.label || '';
}
