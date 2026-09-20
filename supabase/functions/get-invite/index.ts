import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch invite by token
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date() && invite.status === "pending") {
      return new Response(JSON.stringify({ error: "Invite expired", expired: true }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sender profile
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, username, avatar_url, bio")
      .eq("user_id", invite.sender_id)
      .single();

    return new Response(
      JSON.stringify({
        invite: {
          id: invite.id,
          invite_type: invite.invite_type,
          message: invite.message,
          status: invite.status,
          sender_id: invite.sender_id,
          receiver_id: invite.receiver_id,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
        },
        sender: senderProfile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
