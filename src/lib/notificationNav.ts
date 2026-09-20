import { NOTIFICATION_ROUTES, type NotificationType } from '@/lib/notificationTypes';

/**
 * Resolve where a notification should navigate.
 * Prefer explicit data.url / connection_id / post_id over typed defaults.
 */
export function resolveNotificationPath(n: {
  type?: string;
  data?: Record<string, unknown> | null;
}): string {
  const data = n.data || {};
  const postId = data.post_id;
  if (typeof postId === 'string' && postId) return `/post/${postId}`;

  const connectionId = data.connection_id;
  if (typeof connectionId === 'string' && connectionId) {
    const tab = typeof data.tab === 'string' ? data.tab : null;
    return tab ? `/connection/${connectionId}?tab=${tab}` : `/connection/${connectionId}`;
  }

  const explicitUrl = typeof data.url === 'string' ? data.url : null;
  if (explicitUrl && explicitUrl !== '/' && explicitUrl !== '/chats') {
    // Prefer rich deep links (connection?tab=dates etc.) over coarse typed routes
    if (explicitUrl.startsWith('/connection/') || explicitUrl.startsWith('/post/') || explicitUrl.startsWith('/u/') || explicitUrl.startsWith('/meet')) {
      return explicitUrl;
    }
  }

  if (n.type === 'invite_declined' || n.type === 'request_declined') return '/home';
  if (n.type === 'connection_request') return '/home';
  if (n.type === 'new_invite') return '/meet?tab=invite';
  if (n.type === 'dating_request' && connectionId) {
    return `/connection/${connectionId}`;
  }

  const typed = NOTIFICATION_ROUTES[n.type as NotificationType];
  if (explicitUrl) return explicitUrl;
  if (typed) return typed;
  return '/home';
}
