import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
    const { token, receiverEmail, receiverName } = await req.json();
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender info
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: invite } = await supabase
      .from("invites")
      .select("*, profiles!invites_sender_id_fkey(full_name, username)")
      .eq("token", token)
      .single();

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = invite.profiles?.full_name || "Someone special";
    const inviteUrl = `${req.headers.get("origin") || supabaseUrl}/invite?token=${token}`;

    const typeLabels: Record<string, string> = {
      be_my_valentine: "Be My Valentine 💝",
      date_proposal: "Date Proposal 🌹",
      anniversary_surprise: "Anniversary Surprise 🎉",
      custom_message: "A Special Message 💌",
    };

    const emailHtml = `
      <div style="font-family: 'Nunito', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #C2185B, #8E24AA); padding: 30px; border-radius: 16px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">💕 Lovli</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">You have a special invite!</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 16px; margin-top: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <p style="font-size: 16px;">Hey ${receiverName || "there"} 👋</p>
          <p><strong>${senderName}</strong> sent you a <strong>${typeLabels[invite.invite_type] || "special invite"}</strong>!</p>
          ${invite.message ? `<p style="font-style: italic; color: #666; padding: 12px; background: #FFF5F8; border-radius: 12px;">"${invite.message}"</p>` : ""}
          <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #C2185B, #8E24AA); color: white; text-decoration: none; padding: 14px; border-radius: 12px; text-align: center; font-weight: bold; margin-top: 16px;">
            View Invite 💕
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">This invite expires in 7 days.</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Lovli <onboarding@resend.dev>",
        to: [receiverEmail],
        subject: `${senderName} sent you a Lovli invite! 💕`,
        html: emailHtml,
      }),
    });

    const result = await res.json();
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
