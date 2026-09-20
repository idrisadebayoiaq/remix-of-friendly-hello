import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cheap + strong for short romantic text. Override with OPENROUTER_MODEL secret.
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";

type QuizInputs = Record<string, unknown>;

function buildPrompts(quizType: string, inputs: QuizInputs) {
  let systemPrompt = "";
  let userPrompt = "";

  if (quizType === "gift") {
    systemPrompt =
      "You are a romantic gift advisor. Return exactly 5 creative, thoughtful gift suggestions. Be specific and creative. Format as a JSON array of strings.";
    userPrompt = `Suggest 5 gifts for someone in a "${inputs.relationLevel}" relationship stage with a budget of "${inputs.budget || "any"}". Return ONLY a JSON array of 5 strings, no markdown.`;
  } else if (quizType === "date") {
    systemPrompt =
      "You are a romantic date planner. Create a detailed, creative date plan. Be specific about activities, timing, and atmosphere.";
    userPrompt = `Plan a romantic date in ${inputs.city || "a typical city"} with a ${inputs.budget || "moderate"} budget, preference: ${inputs.preference || "flexible"}. Include 4 activities with timing, conversation starters, and a playlist suggestion. Format as plain text with emojis.`;
  } else if (quizType === "love-language") {
    systemPrompt =
      "You are a relationship counselor specializing in love languages. Analyze the answers and provide a thoughtful explanation.";
    const languages = [
      "Words of Affirmation",
      "Receiving Gifts",
      "Quality Time",
      "Acts of Service",
      "Physical Touch",
    ];
    const counts = [0, 0, 0, 0, 0];
    ((inputs.answers as number[]) || []).forEach((a: number) => {
      if (a >= 0 && a < 5) counts[a]++;
    });
    const maxIdx = counts.indexOf(Math.max(...counts));
    const primary = languages[maxIdx];
    userPrompt = `The user's primary love language is "${primary}". Tone: ${inputs.tone || "romantic"}. Detail: ${inputs.detailLevel || "normal"}. Write a personalized explanation. Return ONLY text.`;
  } else if (quizType === "love-tip") {
    systemPrompt =
      "You are a romantic relationship advisor. Give one short, actionable love tip for the day.";
    userPrompt =
      "Give one short romantic love tip (2-3 sentences max). Be warm, practical, and encouraging. Include an emoji. Return ONLY the tip text.";
  } else if (quizType === "compatibility") {
    systemPrompt =
      "You are a relationship compatibility analyst. Provide fun, insightful compatibility analysis.";
    userPrompt = `Analyze compatibility. My interests: ${JSON.stringify(inputs.myInterests || [])}. Partner traits: "${inputs.partnerTraits}". Tone: ${inputs.tone || "romantic"}. Detail: ${inputs.detailLevel || "normal"}. Give a fun analysis with compatibility score and tips. Return ONLY text.`;
  } else if (quizType === "daily-prompt") {
    const pType = (inputs.promptType as string) || "self";
    systemPrompt =
      "You are a warm, romantic relationship coach. Generate ONE short daily reflection prompt. Return ONLY the prompt text, no quotes, no prefix.";
    userPrompt =
      pType === "couple"
        ? "Generate a romantic couple reflection prompt for today. It should encourage partners to share feelings, memories, or appreciation. Keep it 1-2 sentences."
        : "Generate a personal self-love reflection prompt for today. It should encourage self-appreciation, growth, or gratitude. Keep it 1-2 sentences.";
  } else {
    throw new Error("Unknown quiz type");
  }

  return { systemPrompt, userPrompt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizType, inputs } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL;
    const { systemPrompt, userPrompt } = buildPrompts(quizType, inputs || {});

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("OPENROUTER_SITE_URL") || "https://lovli.app",
        "X-Title": Deno.env.get("OPENROUTER_APP_NAME") || "Lovli",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1024,
      }),
    });

    const raw = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      const apiMessage =
        (data as { error?: { message?: string } | string })?.error;
      const message =
        typeof apiMessage === "string"
          ? apiMessage
          : apiMessage?.message || raw || "OpenRouter API error";

      console.error("OpenRouter error:", response.status, message);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content =
      (data as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content, quizType, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quiz-ai error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
