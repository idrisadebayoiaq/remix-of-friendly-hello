import { supabase } from '@/integrations/supabase/client';

export type BadgeDef = {
  key: string;
  title: string;
  description: string;
  quizTypes?: string[];
};

/** Quiz / growth badges awarded on first completion. */
export const GROW_BADGES: BadgeDef[] = [
  {
    key: 'gift_guru',
    title: 'Gift Guru',
    description: 'Completed the Gift quiz',
    quizTypes: ['gift'],
  },
  {
    key: 'date_dreamer',
    title: 'Date Dreamer',
    description: 'Completed the Date ideas quiz',
    quizTypes: ['date'],
  },
  {
    key: 'love_linguist',
    title: 'Love Linguist',
    description: 'Discovered your love language',
    quizTypes: ['love_language', 'love-language'],
  },
  {
    key: 'compat_seeker',
    title: 'Compat Seeker',
    description: 'Ran a compatibility check',
    quizTypes: ['compatibility'],
  },
  {
    key: 'tip_collector',
    title: 'Tip Collector',
    description: 'Opened Grow and read a love tip',
  },
  {
    key: 'quiz_starter',
    title: 'Quiz Starter',
    description: 'Finished your first AI quiz',
  },
];

export async function awardBadge(
  userId: string,
  badgeKey: string,
): Promise<{ awarded: boolean; title?: string }> {
  const def = GROW_BADGES.find((b) => b.key === badgeKey);
  if (!def) return { awarded: false };

  const { error } = await supabase.from('user_badges').insert({
    user_id: userId,
    badge_key: def.key,
    title: def.title,
    description: def.description,
  } as any);

  if (error) {
    if (error.code === '23505') return { awarded: false };
    console.error('awardBadge', error);
    return { awarded: false };
  }
  return { awarded: true, title: def.title };
}

export async function awardQuizBadge(userId: string, quizType: string): Promise<string[]> {
  const earned: string[] = [];
  const starter = await awardBadge(userId, 'quiz_starter');
  if (starter.awarded && starter.title) earned.push(starter.title);

  const match = GROW_BADGES.find((b) => b.quizTypes?.includes(quizType));
  if (match) {
    const res = await awardBadge(userId, match.key);
    if (res.awarded && res.title) earned.push(res.title);
  }
  return earned;
}

export async function getUserBadges(userId: string) {
  const { data } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return data || [];
}
