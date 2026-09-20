import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * FCM push for Android APK (com.lovli.app).
 * Secret: FIREBASE_SERVICE_ACCOUNT_JSON = full Admin SDK JSON string
 * (same credentials you added in Edge Function secrets — never ship in the APK).
 *
 * Web Push remains on send-push (VAPID). createNotification should invoke both.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const b64url = (obj: unknown) =>
    btoa(String.fromCharCode(...enc.encode(JSON.stringify(obj))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsigned = `${b64url(header)}.${b64url(claim)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    enc.encode(unsigned),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${unsigned}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || "Failed to get FCM access token");
  }
  return tokenJson.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, data } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawSa = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!rawSa) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT_JSON not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sa = JSON.parse(rawSa) as ServiceAccount;
    const accessToken = await getAccessToken(sa);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await supabase
      .from("device_push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = data?.url || "/";
    let sent = 0;
    const failures: string[] = [];

    for (const row of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: { title, body: message || "" },
              data: {
                title: String(title),
                message: String(message || ""),
                url: String(url),
                type: String(data?.type || ""),
              },
              android: { priority: "HIGH" },
            },
          }),
        },
      );
      if (res.ok) sent++;
      else {
        const errText = await res.text();
        failures.push(errText.slice(0, 200));
        // Drop invalid tokens
        if (res.status === 404 || errText.includes("UNREGISTERED")) {
          await supabase.from("device_push_tokens").delete().eq("token", row.token);
        }
      }
    }

    return new Response(JSON.stringify({ sent, failures: failures.length ? failures : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-fcm error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
