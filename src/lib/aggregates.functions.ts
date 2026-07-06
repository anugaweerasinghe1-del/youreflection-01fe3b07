import { createServerFn } from "@tanstack/react-start";
import { QUESTIONS, type Question } from "./questions";

type AnswerMap = Record<string, string | number>;
type Row = { age_group: string; answers: AnswerMap; created_at: string };

export type QuestionAggregate = {
  id: string;
  category: string;
  prompt: string;
  type: "choice" | "scale";
  total: number;
  // For choice: { option: count }. For scale: { "1": count, ..., "N": count } plus mean.
  counts: Record<string, number>;
  mean?: number;
};

export type Aggregates = {
  total: number;
  byAgeGroup: Record<string, number>;
  byQuestion: QuestionAggregate[];
  conclusion: string;
  updatedAt: string;
};

function emptyAggregatesFor(): QuestionAggregate[] {
  const out: QuestionAggregate[] = [];
  for (const q of QUESTIONS as Question[]) {
    if (q.type === "text") continue;
    if (q.type === "choice") {
      const counts: Record<string, number> = {};
      for (const o of q.options) counts[o] = 0;
      out.push({ id: q.id, category: q.category, prompt: q.prompt, type: "choice", total: 0, counts });
    } else {
      const counts: Record<string, number> = {};
      for (let n = q.min; n <= q.max; n++) counts[String(n)] = 0;
      out.push({ id: q.id, category: q.category, prompt: q.prompt, type: "scale", total: 0, counts, mean: 0 });
    }
  }
  return out;
}

function buildConclusion(agg: Aggregates): string {
  if (agg.total === 0) {
    return "No responses yet. When people begin sharing, patterns will appear here.";
  }
  const bits: string[] = [];

  const importance = agg.byQuestion.find((q) => q.id === "appearance_importance");
  if (importance && importance.total > 0 && (importance.mean ?? 0) >= 3.8) {
    bits.push(`Most respondents (${Math.round(((importance.mean ?? 0) / 5) * 100)}%) rate appearance as highly important in today's society.`);
  }

  const platform = agg.byQuestion.find((q) => q.id === "platform_impact");
  if (platform && platform.total > 0) {
    const top = Object.entries(platform.counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0) {
      const pct = Math.round((top[1] / platform.total) * 100);
      bits.push(`${top[0]} is named most often as the platform that shapes body image (${pct}%).`);
    }
  }

  const comparison = agg.byQuestion.find((q) => q.id === "comparison_scale");
  if (comparison && comparison.total > 0 && (comparison.mean ?? 0) >= 6) {
    bits.push(`On average, people say they measure themselves against others ${(comparison.mean ?? 0).toFixed(1)} out of 10 — a real, everyday weight.`);
  }

  const mirror = agg.byQuestion.find((q) => q.id === "appearance_mirror");
  if (mirror && mirror.total > 0 && (mirror.mean ?? 0) < 5.5) {
    bits.push(`Yet the same people rate their inner voice at the mirror only ${(mirror.mean ?? 0).toFixed(1)} out of 10 — kindness they'd give a friend, they rarely give themselves.`);
  }

  const compassion = agg.byQuestion.find((q) => q.id === "compassion_friend");
  if (compassion && compassion.total > 0) {
    const heartbroken = (compassion.counts["Heartbroken"] ?? 0) + (compassion.counts["Concerned"] ?? 0);
    const pct = Math.round((heartbroken / compassion.total) * 100);
    if (pct >= 40) {
      bits.push(`${pct}% say they'd feel heartbroken or concerned if a close friend spoke to themselves the way they do — the double standard is visible.`);
    }
  }

  if (bits.length === 0) {
    bits.push(`${agg.total} ${agg.total === 1 ? "person has" : "people have"} shared their reflection so far. Patterns are still forming.`);
  }
  return bits.join(" ");
}

type RpcShape = {
  total: number;
  by_age_group: Record<string, number>;
  by_question: Record<string, Record<string, number>>;
  updated_at: string;
};

export const getAggregates = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");

  // Raw `responses` rows are NOT readable from the browser (SELECT policy
  // revoked). We call a SECURITY DEFINER RPC that only returns counts —
  // never any individual answer. Using the publishable-key client here so we
  // don't depend on JWT-format service-role keys.
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

  const { data, error } = await sb.rpc("get_response_aggregates");

  if (error || !data) {
    console.error("[aggregates] rpc failed", error);
    return {
      total: 0,
      byAgeGroup: {},
      byQuestion: emptyAggregatesFor(),
      conclusion: "Loading responses…",
      updatedAt: new Date().toISOString(),
    } as Aggregates;
  }

  const rpc = data as unknown as RpcShape;

  const byAgeGroup: Record<string, number> = { "13-17": 0, "18-24": 0, "25-34": 0, "35-44": 0, "45+": 0 };
  for (const [k, v] of Object.entries(rpc.by_age_group ?? {})) {
    if (byAgeGroup[k] !== undefined) byAgeGroup[k] = v;
  }

  const byQuestion = emptyAggregatesFor();
  for (const agg of byQuestion) {
    const raw = rpc.by_question?.[agg.id];
    if (!raw) continue;
    let sum = 0, n = 0;
    for (const [key, count] of Object.entries(raw)) {
      if (agg.type === "choice") {
        if (agg.counts[key] !== undefined) {
          agg.counts[key] = count;
          agg.total += count;
        }
      } else {
        const num = Number(key);
        if (!Number.isFinite(num)) continue;
        const bucket = String(Math.round(num));
        if (agg.counts[bucket] !== undefined) agg.counts[bucket] += count;
        agg.total += count;
        sum += num * count;
        n += count;
      }
    }
    if (agg.type === "scale") agg.mean = n > 0 ? sum / n : 0;
  }

  const result: Aggregates = {
    total: rpc.total ?? 0,
    byAgeGroup,
    byQuestion,
    conclusion: "",
    updatedAt: rpc.updated_at ?? new Date().toISOString(),
  };
  result.conclusion = buildConclusion(result);
  return result;
});
