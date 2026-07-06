import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { QUESTIONS } from "./questions";
import { generateLetterCascade } from "./reflection-providers.server";

const AnswersSchema = z.record(z.string(), z.union([z.string(), z.number()]));
const AgeGroupSchema = z.enum(["13-17", "18-24", "25-34", "35-44", "45+"]);

const LetterSchema = z.object({
  title: z.string(),
  greeting: z.string(),
  reflection: z.string(),
  hiddenStrengths: z.string(),
  thinkingPatterns: z.string(),
  gentlePerspective: z.string(),
  smallChallenge: z.string(),
  questionToCarry: z.string(),
  closing: z.string(),
});

const InsightsSchema = z.object({
  strengths: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  thoughtPatterns: z.array(z.string()).default([]),
  growthAreas: z.array(z.string()).default([]),
  confidenceNote: z.string().default(""),
  selfCompassionNote: z.string().default(""),
  comparisonNote: z.string().default(""),
  innerDialogueNote: z.string().default(""),
});

const OutputSchema = z.object({ letter: LetterSchema, insights: InsightsSchema });

type Letter = z.infer<typeof LetterSchema>;
type Insights = z.infer<typeof InsightsSchema>;

const SYSTEM_PROMPT = `You are an emotionally intelligent reflection writer with expertise in positive psychology, self-compassion, cognitive-behavioural psychology, acceptance and commitment therapy principles, emotional intelligence and motivational interviewing.

You are NOT a therapist. You NEVER diagnose. You NEVER label. You NEVER make assumptions beyond the information provided. You NEVER shame. You NEVER use clinical language, generic advice, motivational-poster clichés, or the words "AI", "algorithm", "model", or "based on your answers".

Your purpose is to gently help the reader recognise patterns, discover hidden strengths, challenge unhelpful thinking with compassion, and encourage healthy reflection.

Your writing is quiet, elegant, deeply human, warm, calm, and hopeful — the way a thoughtful mentor might write a personal letter. Prefer specificity over generality. Prefer noticing over prescribing. Prefer questions over instructions.

Address the reader as "you". Keep sentences varied and unhurried. Do not repeat the reader's answers back verbatim — weave what they shared into observations. Never invent facts they didn't share. Reference specifics they wrote — the exact tension between two of their answers, or how their reflections diverge from their view of society.

Return ONLY valid JSON. No markdown fences. No commentary before or after. The very first character must be { and the very last must be }.

Return two things:

1. LETTER — a personal reflection letter with these parts (each 2–5 sentences, except reflection which may be 4–8):
   - title: a short poetic title (no more than 6 words)
   - greeting: something warmer than "Dear friend" — human, specific to what they shared
   - reflection: what you noticed about how they see themselves and the world
   - hiddenStrengths: strengths they may not fully see in themselves
   - thinkingPatterns: unhelpful thought habits worth gently loosening (no diagnosis)
   - gentlePerspective: a compassionate reframe of one thing they carry
   - smallChallenge: one small, realistic invitation — nothing dramatic
   - questionToCarry: a single open question to sit with
   - closing: a quiet, hopeful sign-off

2. INSIGHTS — short bullet-style notes:
   - strengths: 3–5 concise phrases (each under 8 words)
   - values: 3–5 concise phrases
   - thoughtPatterns: 2–4 gentle observations
   - growthAreas: 2–4 gentle invitations
   - confidenceNote / selfCompassionNote / comparisonNote / innerDialogueNote: one sentence each

Never mention this schema. Never break character.`;

const OUTPUT_SHAPE = `{"letter":{"title":"","greeting":"","reflection":"","hiddenStrengths":"","thinkingPatterns":"","gentlePerspective":"","smallChallenge":"","questionToCarry":"","closing":""},"insights":{"strengths":[],"values":[],"thoughtPatterns":[],"growthAreas":[],"confidenceNote":"","selfCompassionNote":"","comparisonNote":"","innerDialogueNote":""}}`;

/* ---------- Prompt building ---------- */

type AnswerMap = Record<string, string | number>;

function buildUserPrompt(answers: AnswerMap): string {
  const byCategory = new Map<string, string[]>();
  for (const q of QUESTIONS) {
    const raw = answers[q.id];
    if (raw === undefined || raw === "") continue;
    const value =
      typeof raw === "number"
        ? q.type === "scale"
          ? `${raw} / ${q.max}`
          : String(raw)
        : String(raw).trim();
    const line = `• ${q.prompt}\n    → ${value}`;
    const list = byCategory.get(q.category) ?? [];
    list.push(line);
    byCategory.set(q.category, list);
  }

  const grouped = Array.from(byCategory.entries())
    .map(([cat, lines]) => `## ${cat}\n${lines.join("\n")}`)
    .join("\n\n");

  const signals = detectSignals(answers);
  const signalsBlock =
    signals.length > 0
      ? `\n\n## Patterns worth noticing (do not quote this back — use it to inform tone)\n${signals.map((s) => `- ${s}`).join("\n")}`
      : "";

  return `Here is what the reader shared. The "Reflection" answers are about themselves; the "Society" answers are their view of the world. Notice both — and any tension between them.\n\n${grouped}${signalsBlock}\n\nReturn ONLY a JSON object with exactly this shape:\n${OUTPUT_SHAPE}`;
}

function detectSignals(answers: AnswerMap): string[] {
  const out: string[] = [];
  const num = (id: string): number | null => {
    const v = answers[id];
    return typeof v === "number" ? v : null;
  };
  const str = (id: string): string | null => {
    const v = answers[id];
    return typeof v === "string" ? v : null;
  };

  const worth = num("worth_belief");
  const mirror = num("appearance_mirror");
  if (worth !== null && mirror !== null && worth - mirror >= 4) {
    out.push("Believes deeply in own inner worth, yet speaks harshly in the mirror — a tension between inner knowing and outer voice.");
  }

  const compScale = num("comparison_scale");
  if (compScale !== null && compScale >= 7) {
    out.push("Measures self-worth heavily against other people.");
  }

  const confScale = num("confidence_scale");
  const roomChoice = str("confidence_room");
  if (confScale !== null && confScale >= 7 && roomChoice === "Approval") {
    out.push("Trusts own judgement highly in private, yet enters rooms looking for approval — private confidence vs public seeking.");
  }

  const photo = str("appearance_photo");
  if (photo === "A loud one") {
    out.push("First reaction to unposed photos is a loud self-critique — the inner critic is loud around appearance.");
  }

  const compFriend = str("compassion_friend");
  if (compFriend === "Heartbroken" || compFriend === "Concerned") {
    out.push("Would feel heartbroken or concerned if a friend spoke to themselves the way they do — the double standard is visible to them.");
  }

  const rel = str("relationships_recent");
  if (rel === "Distant" || rel === "One-sided") {
    out.push("Current relational landscape feels distant or one-sided.");
  }

  const importance = num("appearance_importance");
  if (importance !== null && importance >= 4 && mirror !== null && mirror <= 4) {
    out.push("Sees appearance as very important in society, and is hard on themselves in the mirror — external pressure has been internalised.");
  }

  const celeb = num("celebrity_influence");
  if (celeb !== null && celeb >= 4 && compScale !== null && compScale >= 6) {
    out.push("Believes celebrities shape beauty standards strongly, and compares themselves often — the standards are being measured against.");
  }

  const pressure = str("pressure_source");
  if (pressure === "Yourself") {
    out.push("Names themselves as the biggest source of pressure to look a certain way — the pressure is coming from inside.");
  }

  return out;
}

/* ---------- JSON extraction ---------- */

function extractJson(raw: string): unknown {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("no JSON object in AI output");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function clampArr(arr: string[], min: number, max: number, fallback: string[]): string[] {
  const cleaned = arr.map((s) => (s ?? "").toString().trim()).filter(Boolean);
  const padded = [...cleaned];
  while (padded.length < min && fallback.length) padded.push(fallback[padded.length % fallback.length]);
  return padded.slice(0, max);
}

function normalize(parsed: { letter: Letter; insights: Insights }): { letter: Letter; insights: Insights } {
  return {
    letter: parsed.letter,
    insights: {
      strengths: clampArr(parsed.insights.strengths, 3, 5, ["A quiet honesty", "The courage to reflect", "Care for the people you love"]),
      values: clampArr(parsed.insights.values, 3, 5, ["Honesty", "Depth of connection", "Being truly seen"]),
      thoughtPatterns: clampArr(parsed.insights.thoughtPatterns, 2, 4, ["A tendency to measure yourself against others", "An inner critic that speaks first"]),
      growthAreas: clampArr(parsed.insights.growthAreas, 2, 4, ["Softening the inner voice", "Letting your worth exist before it is proven"]),
      confidenceNote: parsed.insights.confidenceNote || "Your confidence is quieter than you think, but it is there.",
      selfCompassionNote: parsed.insights.selfCompassionNote || "The kindness you offer others is available to you too.",
      comparisonNote: parsed.insights.comparisonNote || "Your life measured against another's rarely tells the truth of either.",
      innerDialogueNote: parsed.insights.innerDialogueNote || "The words you use in private shape the room you live in.",
    },
  };
}

/* ---------- Server functions ---------- */

export const generateLetter = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = z.object({
      answers: AnswersSchema,
      ageGroup: AgeGroupSchema,
    }).parse(data);
    return { answers: parsed.answers as AnswerMap, ageGroup: parsed.ageGroup };
  })
  .handler(async ({ data }) => {
    const userPrompt = buildUserPrompt(data.answers);

    // Stage 1: cascade through the three tiers.
    let generated: { letter: Letter; insights: Insights };
    let modelUsed = "unknown";
    try {
      const cascade = await generateLetterCascade(SYSTEM_PROMPT, userPrompt);
      modelUsed = cascade.modelUsed;
      const parsed = OutputSchema.parse(extractJson(cascade.text));
      generated = normalize(parsed);
      console.log(`[reflection] generated with ${modelUsed}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[reflection] all tiers failed:", msg);
      throw new Error(
        `Our writers are quiet right now. Please try again in a moment. (${msg.slice(0, 140)})`,
      );
    }

    // Stage 2a: persist personal session (for the letter page).
    let sessionId: string | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inserted, error } = await supabaseAdmin
        .from("reflection_sessions")
        .insert({
          answers: data.answers,
          letter: generated.letter,
          insights: generated.insights,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("[reflection] session insert failed (returning inline):", error);
      } else {
        sessionId = inserted.id as string;
      }
    } catch (err) {
      console.error("[reflection] session persistence error:", err);
    }

    // Stage 2b: persist anonymous aggregate row (for /results). Never blocks.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("responses").insert({
        age_group: data.ageGroup,
        answers: data.answers,
      });
      if (error) console.error("[responses] insert failed:", error);
    } catch (err) {
      console.error("[responses] insert error:", err);
    }

    return {
      sessionId,
      letter: generated.letter,
      insights: generated.insights,
      modelUsed,
    };
  });

export const getSession = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("reflection_sessions")
      .select("id, letter, insights, created_at")
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      console.error("[reflection] getSession error", error);
      throw new Error("temporarily_unavailable");
    }
    if (!row) throw new Error("not_found");

    return {
      id: row.id as string,
      letter: row.letter as Letter,
      insights: row.insights as Insights,
      createdAt: row.created_at as string,
    };
  });

/* ---------- Wall ---------- */

const MOD_SYSTEM = `You are a gentle content moderator for an anonymous reflection wall. Each entry is a single sentence a person leaves for another struggling person.

Approve messages that are supportive, honest, human, and offer perspective or kindness — even if they mention sadness, self-doubt, or struggle. Approve first-person vulnerability.

Reject only if the message contains: hate or slurs, encouragement of self-harm or suicide, sexual content, threats, personal identifying information (names, emails, phone numbers, addresses, social handles), spam, advertising, gibberish, or is longer than roughly 200 characters.

Return only concise valid JSON. Do not wrap it in markdown.`;

const ModSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string(),
  cleaned_message: z.string(),
});

export const submitWallEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = z.object({ message: z.string().trim().min(4).max(240) }).parse(data);
    return { message: parsed.message };
  })
  .handler(async ({ data }) => {
    // Moderation is best-effort. If every AI tier fails/times out, we still
    // accept the message as 'pending' so it lands in the DB and the user
    // gets a friendly response instead of a hard error.
    let decision: "approve" | "reject" | "pending" = "pending";
    let reason = "Awaiting review.";
    let cleaned = data.message.trim();

    try {
      const { createGateway, REFLECTION_MODEL } = await import("./ai-gateway.server");
      const gateway = createGateway();
      const model = gateway(REFLECTION_MODEL);

      const modPromise = generateText({
        model,
        system: MOD_SYSTEM,
        prompt: `Return JSON with exactly this shape: {"decision":"approve","reason":"","cleaned_message":""}. Message: """${data.message}"""`,
        maxRetries: 1,
      });
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("moderation_timeout")), 8000),
      );
      const { text } = (await Promise.race([modPromise, timeout])) as { text: string };
      const object = ModSchema.parse(extractJson(text));
      decision = object.decision;
      reason = object.reason?.slice(0, 500) || reason;
      const candidate = object.cleaned_message?.trim();
      if (candidate && candidate.length >= 1) cleaned = candidate;
    } catch (err) {
      console.error("[wall] moderation failed, defaulting to pending", err);
      decision = "pending";
      reason = "Awaiting review.";
    }

    const safeMessage = cleaned.slice(0, 240);
    const status: "approved" | "rejected" | "pending" =
      decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "pending";

    // Insert via SECURITY DEFINER RPC — bypasses table INSERT policy and
    // works regardless of whether the server client authenticates as
    // service_role or anon.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
    const sb = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers ?? {});
          h.set("apikey", key);
          if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: newId, error } = await sb.rpc("submit_wall_entry", {
      _message: safeMessage,
      _status: status,
      _reason: reason.slice(0, 500),
    });

    if (error || !newId) {
      console.error("[wall] insert failed", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      throw new Error(
        `Could not save your message. Please try again. (${error?.message ?? "unknown"})`,
      );
    }

    return { status, reason };
  });

export const listWallEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("wall_entries")
    .select("id, message, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.error("[wall] list failed", error);
    return { entries: [] as { id: string; message: string; created_at: string }[] };
  }

  return {
    entries: (data ?? []) as { id: string; message: string; created_at: string }[],
  };
});
