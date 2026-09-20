import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical notification `type` values for Lovli.
 * Keep send-push prefMap in sync when adding types.
 */
export const NOTIFICATION_TYPES = {
  // Connections / social
  connection_request: 'connection_request',
  request_accepted: 'request_accepted',
  request_declined: 'request_declined',
  post_liked: 'post_liked',
  post_reacted: 'post_reacted',
  post_shared: 'post_shared',
  post_comment: 'post_comment',
  new_follow: 'new_follow',

  // Invites
  new_invite: 'new_invite',
  invite_accepted: 'invite_accepted',
  invite_declined: 'invite_declined',
  invite_response: 'invite_response',

  // Dating (Meet)
  dating_match_request: 'dating_match_request',
  dating_match_approved: 'dating_match_approved',
  dating_match_declined: 'dating_match_declined',
  dating_instant_match: 'dating_instant_match',
  dating_request: 'dating_request',

  // Couples
  date_plan_review: 'date_plan_review',
  date_plan_updated: 'date_plan_updated',
  date_plan_agreed: 'date_plan_agreed',
  new_message: 'new_message',
  daily_question: 'daily_question',

  // Moderation
  appeal_approved: 'appeal_approved',
  appeal_rejected: 'appeal_rejected',
  new_report: 'new_report',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Deep-link path hints for Home / Alerts (fallback when data has no rich url). */
export const NOTIFICATION_ROUTES: Partial<Record<NotificationType, string>> = {
  connection_request: '/home',
  request_accepted: '/chats',
  request_declined: '/home',
  invite_accepted: '/chats',
  invite_declined: '/home',
  new_invite: '/meet?tab=invite',
  dating_match_request: '/meet?tab=dating',
  dating_match_approved: '/chats',
  dating_match_declined: '/meet?tab=dating',
  dating_instant_match: '/chats',
  dating_request: '/chats',
  date_plan_review: '/chats',
  date_plan_updated: '/chats',
  date_plan_agreed: '/chats',
  new_message: '/chats',
  daily_question: '/chats',
  post_liked: '/discover',
  post_comment: '/discover',
  post_reacted: '/discover',
  post_shared: '/discover',
  new_follow: '/you',
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  actorId?: string | null;
  data?: Record<string, unknown>;
  /** Also fire edge send-push when true (default true). */
  push?: boolean;
};

/**
 * Insert an in-app notification and optionally trigger Web Push.
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  actorId = null,
  data = {},
  push = true,
}: CreateNotificationInput): Promise<{ id?: string; error?: string }> {
  // Prefer caller deep link (e.g. /connection/:id?tab=dates) over typed fallback
  const callerUrl = typeof data.url === 'string' ? data.url : undefined;
  const typedRoute = NOTIFICATION_ROUTES[type as NotificationType];
  const route = callerUrl || typedRoute;

  const payload = {
    ...data,
    type,
    url: route || '/',
  };

  const { data: row, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      actor_id: actorId,
      data: payload as any,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('createNotification failed:', error);
    return { error: error.message };
  }

  if (push) {
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          user_id: userId,
          title,
          message,
          data: payload,
        },
      });
    } catch (err) {
      console.warn('send-push invoke failed', err);
    }
    try {
      await supabase.functions.invoke('send-fcm', {
        body: {
          user_id: userId,
          title,
          message,
          data: payload,
        },
      });
    } catch (err) {
      console.warn('send-fcm invoke failed', err);
    }
  }

  return { id: row?.id };
}
