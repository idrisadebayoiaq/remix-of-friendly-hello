import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, data } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing user_id or title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails(
      'mailto:hello@lovli.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check user's push notification preferences
    // Keep in sync with src/lib/notificationTypes.ts
    const notifType = data?.type || '';
    const prefMap: Record<string, string> = {
      'new_message': 'push_messages',
      'connection_request': 'push_connection_requests',
      'request_accepted': 'push_connection_requests',
      'request_declined': 'push_connection_requests',
      'dating_request': 'push_dating_requests',
      'dating_match_request': 'push_dating_requests',
      'dating_match_approved': 'push_dating_requests',
      'dating_match_declined': 'push_dating_requests',
      'dating_instant_match': 'push_dating_requests',
      'daily_question': 'push_daily_questions',
      'community_like': 'push_community',
      'community_comment': 'push_community',
      'post_liked': 'push_community',
      'post_reacted': 'push_community',
      'post_shared': 'push_community',
      'post_comment': 'push_community',
      'new_follow': 'push_community',
      'new_invite': 'push_invites',
      'invite_response': 'push_invites',
      'invite_accepted': 'push_invites',
      'invite_declined': 'push_invites',
      'date_plan_review': 'push_messages',
      'date_plan_updated': 'push_messages',
      'date_plan_agreed': 'push_messages',
      'appeal_approved': 'push_appeals',
      'appeal_rejected': 'push_appeals',
      'new_report': 'push_reports',
    };

    const prefColumn = prefMap[notifType];
    if (prefColumn) {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select(prefColumn)
        .eq('user_id', user_id)
        .single();

      if (userSettings && userSettings[prefColumn] === false) {
        return new Response(JSON.stringify({ sent: 0, message: 'User opted out of this notification type' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title: title || 'Lovli 💕',
      body: message || 'You have a new notification!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      url: data?.url || '/',
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (err: any) {
        console.error(`Push failed for sub ${sub.id}:`, err.statusCode, err.body);
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid, remove it
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          console.log(`Removed expired subscription ${sub.id}`);
        }
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
