/**
 * Three independent AI tiers for the reflection letter. Each tier lives on a
 * different provider / different quota, so a credits or rate-limit hit on one
 * cannot silently kill the whole chain (which is what happened previously
 * when all three "fallbacks" went through the Lovable AI Gateway).
 *
 *   Tier 1 — Lovable AI Gateway (Gemini)  — uses LOVABLE_API_KEY (auto-provisioned)
 *   Tier 2 — Google AI Studio Gemini      — uses GEMINI_API_KEY (direct, separate quota)
 *   Tier 3 — Groq                         — uses GROQ_API_KEY, falls through to
 *   Tier 3b — OpenRouter                  — uses OPENROUTER_API_KEY
 *
 * The orchestrator returns the first tier that produces valid JSON matching
 * the schema. Never returns a hardcoded/template letter — if every tier fails
 * the orchestrator throws and the UI surfaces the specific error.
 */

import { generateText } from "ai";

const TIMEOUT_MS = 25_000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export type ProviderResult = { text: string; modelUsed: string };

/* ------------------------- Tier 1 — Lovable AI Gateway ------------------------- */

async function callLovable(systemPrompt: string, userPrompt: string): Promise<ProviderResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const { createGateway } = await import("./ai-gateway.server");
  const gateway = createGateway();

  const models = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash"];
  let lastErr: unknown = null;
  for (const modelId of models) {
    try {
      const { text, finishReason } = await withTimeout(
        generateText({ model: gateway(modelId), system: systemPrompt, prompt: userPrompt, maxRetries: 0 }),
        `lovable:${modelId}`,
      );
      if (finishReason === "length") { lastErr = new Error("truncated"); continue; }
      if (!text || text.trim().length < 40) { lastErr = new Error("empty"); continue; }
      return { text, modelUsed: `lovable/${modelId}` };
    } catch (err) {
      lastErr = err;
      console.error(`[reflection] tier1 lovable ${modelId} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("tier1 lovable failed");
}

/* ------------------------- Tier 2 — Google AI Studio direct ------------------------- */

async function callGemini(systemPrompt: string, userPrompt: string): Promise<ProviderResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");

  // Try newer model first, then a stable fallback.
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastErr: unknown = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const body = {
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      };
      const res = await withTimeout(
        fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        `gemini:${model}`,
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`gemini ${model} ${res.status}: ${t.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text || text.trim().length < 40) throw new Error("gemini empty output");
      return { text, modelUsed: `google-aistudio/${model}` };
    } catch (err) {
      lastErr = err;
      console.error(`[reflection] tier2 gemini ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("tier2 gemini failed");
}

/* ------------------------- Tier 3 — Groq, then OpenRouter ------------------------- */

async function callOpenAICompatChat(opts: {
  url: string; key: string; model: string; label: string;
  extraHeaders?: Record<string, string>;
  systemPrompt: string; userPrompt: string;
}): Promise<ProviderResult> {
  const res = await withTimeout(
    fetch(opts.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.key}`,
        ...(opts.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.9,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
      }),
    }),
    opts.label,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${opts.label} ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text || text.trim().length < 40) throw new Error(`${opts.label} empty output`);
  return { text, modelUsed: opts.label };
}

async function callGroqThenOpenRouter(systemPrompt: string, userPrompt: string): Promise<ProviderResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  let lastErr: unknown = null;

  if (groqKey) {
    const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    for (const model of groqModels) {
      try {
        return await callOpenAICompatChat({
          url: "https://api.groq.com/openai/v1/chat/completions",
          key: groqKey,
          model,
          label: `groq/${model}`,
          systemPrompt, userPrompt,
        });
      } catch (err) {
        lastErr = err;
        console.error(`[reflection] tier3 groq ${model} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (orKey) {
    const orModels = [
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-exp:free",
    ];
    for (const model of orModels) {
      try {
        return await callOpenAICompatChat({
          url: "https://openrouter.ai/api/v1/chat/completions",
          key: orKey,
          model,
          label: `openrouter/${model}`,
          extraHeaders: {
            "HTTP-Referer": "https://youreflection.lovable.app",
            "X-Title": "Beyond What You See",
          },
          systemPrompt, userPrompt,
        });
      } catch (err) {
        lastErr = err;
        console.error(`[reflection] tier3 openrouter ${model} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (!groqKey && !orKey) throw new Error("GROQ_API_KEY and OPENROUTER_API_KEY both missing");
  throw lastErr instanceof Error ? lastErr : new Error("tier3 failed");
}

/* ------------------------- Orchestrator ------------------------- */

export async function generateLetterCascade(
  systemPrompt: string,
  userPrompt: string,
): Promise<ProviderResult> {
  const tiers: Array<{ name: string; run: () => Promise<ProviderResult> }> = [
    { name: "tier1-lovable", run: () => callLovable(systemPrompt, userPrompt) },
    { name: "tier2-gemini",  run: () => callGemini(systemPrompt, userPrompt) },
    { name: "tier3-groq/openrouter", run: () => callGroqThenOpenRouter(systemPrompt, userPrompt) },
  ];

  const failures: string[] = [];
  for (const tier of tiers) {
    try {
      const r = await tier.run();
      console.log(`[reflection] ${tier.name} succeeded via ${r.modelUsed}`);
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${tier.name}: ${msg}`);
      console.error(`[reflection] ${tier.name} failed:`, msg);
    }
  }
  throw new Error(`All AI providers failed. ${failures.join(" | ")}`);
}
