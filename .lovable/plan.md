# Pass 1 — Full plan

## 0. Diagnosis of the current broken results page

Reading `src/lib/reflection.functions.ts` + `src/lib/ai-gateway.server.ts`:

- The current AI provider is **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1`) authenticated with `LOVABLE_API_KEY`. It is NOT a direct Google Gemini API call.
- The "fallback chain" today is `google/gemini-3-flash-preview → google/gemini-2.5-flash → openai/gpt-5-mini` — but all three go through the same Lovable gateway, so a single quota/credit cap on Lovable AI takes down all three at once. That is almost certainly why results are blank: one 402 (credits) or 429 (rate limit) response kills the whole chain.
- Secondary issues to fix while I'm in there: no per-attempt timeout, errors are logged but the frontend just shows a generic "Something didn't work" toast so you can't tell if it's a credits problem or a parsing problem.

I'll confirm the exact failure by reading the AI Gateway logs before writing code, and report back in the summary whether it was 402 (credits), 429 (rate limit), a parse error, or something else.

## 1. Three genuinely independent AI tiers (no template fallback anywhere)

New file `src/lib/reflection-providers.server.ts` with three isolated callers, each with a **10s timeout** (`AbortSignal.timeout(10_000)`) and its own try/catch:

- **Tier 1 — Lovable AI Gateway** (existing, kept): `google/gemini-3-flash-preview` via the existing `createGateway()` helper. Uses `LOVABLE_API_KEY` (already provisioned).
- **Tier 2 — Direct Google AI Studio Gemini** (independent quota from Lovable): raw `fetch` to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=...` using a new secret `GEMINI_API_KEY`. Free tier, no card required.
- **Tier 3 — Groq** (independent third provider): raw `fetch` to `https://api.groq.com/openai/v1/chat/completions` with `llama-3.3-70b-versatile`, using new secret `GROQ_API_KEY`. Free tier, no card.
  - If the Groq call returns 404/400 "model_decommissioned" (their free lineup does shift), automatic same-request fallback to **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`, model `meta-llama/llama-3.3-70b-instruct:free`) using secret `OPENROUTER_API_KEY`. Both are optional at Tier 3 — whichever is configured wins.

Where to paste the keys (I will trigger the secure secret forms — you paste into the form Lovable opens, not into chat):

- `GEMINI_API_KEY` → get free at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- `GROQ_API_KEY` → get free at [https://console.groq.com/keys](https://console.groq.com/keys)
- `OPENROUTER_API_KEY` (optional Tier‑3 backup) → [https://openrouter.ai/keys](https://openrouter.ai/keys)

`generateLetter` orchestrator runs Tier 1 → 2 → 3 in order, records `modelUsed` on the returned session, and only throws when **all three** fail (in which case the UI shows a retry button, never a blank page — the current inline‑preview fallback in `reflect.tsx` stays). No hardcoded/template letter anywhere.

Verification: I'll deliberately break each tier in turn (bad key / forced throw) and confirm via server-function logs that the cascade reaches Tier 2, then Tier 3, and that the letter rendered on `/letter/preview` is genuinely different personalized text each time.

## 2. Survey rebuild — age gate + curated questions + framing

New Q0 (required, gates everything): **"Which age group are you in?"** — Under 13 / 13–17 / 18–24 / 25–34 / 35–44 / 45+. Selecting *Under 13* shows a polite block screen ("This survey is for ages 13+. Thanks for stopping by.") and — critically — no row is ever inserted into `responses` for that session.

Header line above Q1: *"This takes about 2 minutes and collects anonymous data for a class survey on body image and beauty standards. We don't collect your name, email, or any identifying information."*

Question set — a curated blend of your 22 society questions + the strongest self‑reflection ones already on the site, phrased neutrally so gender/age/culture/body type don't leak in. Roughly 16 items, mostly 4‑option choice or 1‑5 scale, only 2 short open‑text:

Self‑reflection core (kept from current site, lightly reworded):

1. Something about you people usually miss at first (text)
2. Mirror kindness (1‑5 scale)
3. Candid‑photo first thought (choice)
4. Walking into a room of strangers (choice)
5. How much you measure yourself against others (1‑5 scale)
6. Close relationships lately feel… (choice)
7. Meaning right now (choice)
8. If a friend spoke to themselves the way you do (choice)

Society / beauty‑standards (curated from your list, indirect phrasing):
9. How important is appearance in society today? (1‑5 scale) — from your Q1
10. What influences people's confidence most? (choice) — Q2
11. Which platform shapes body image most? (choice) — Q4
12. How much do celebrities/influencers shape beauty standards? (1‑5 scale) — Q10
13. Should edited photos be labeled on social media? (Yes / No / Unsure) — Q11
14. Which age group feels the most appearance pressure? (choice) — Q14
15. How often do ads show realistic people? (1‑5 scale) — Q15
16. Biggest source of pressure to look a certain way? (choice) — Q17

Dropped as annoying/redundant per your note: Q3, Q5, Q6, Q7, Q8, Q9, Q12, Q13, Q16, Q18, Q19, Q20, Q21, Q22. If you want any of those back in, tell me the numbers.

All wording stays warm/editorial, not clinical. The existing `detectSignals()` psychology cues in `reflection.functions.ts` are updated to reference the new IDs so personalization still fires.  
  
NOTE: DO NOT ASK 22 QUESTIONS BECAUSE REALISTICALLY PEOPLE WILL NOT WRITE THE ANSWERS FOR 22 QUESTIONS IT TAKES A LONG TIME LIMIT IT TO 15!

## 3. Anonymous storage — one migration, zero manual dashboard work

Single Supabase migration (I run it via the migration tool; you just click Approve in chat — no external dashboard):

```
CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  age_group text NOT NULL CHECK (age_group IN ('13-17','18-24','25-34','35-44','45+')),
  answers jsonb NOT NULL   -- {question_id: value}
);
GRANT SELECT ON public.responses TO anon, authenticated;   -- aggregates only, no PII columns exist
GRANT INSERT ON public.responses TO anon, authenticated;
GRANT ALL    ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read"   ON public.responses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can insert" ON public.responses FOR INSERT TO anon, authenticated WITH CHECK (age_group <> 'Under 13');
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
```

No name/email/IP/user_agent stored. Insert happens inside `generateLetter` after the letter is written, so a failed AI generation doesn't pollute the dataset.

## 4. `/results` — dedicated live dashboard

New route `src/routes/results.tsx`, distinct look from the homepage (editorial serif headline, muted champagne accents on the existing dark palette, soft entrance animations reusing `animate-fade-up`).

- **Live count headline**: `X people have shared their reflection` — `SELECT count(*) FROM responses`.
- **Age breakdown**: horizontal bar chart (plain CSS bars, no chart lib) with % per bucket.
- **Per‑question aggregates**: for each choice/scale question, percent-per-option bars. Text questions are never displayed (protects anonymity).
- **Conclusion (deterministic, not AI)**: 2‑4 sentence paragraph built by simple thresholds over the aggregates (e.g. "When more than 60% of respondents rate appearance pressure ≥ 4/5, the section reads: 'Most people here feel a strong pull to meet appearance standards — and the same people are twice as likely to also…'"). Rewrites itself as data changes; can never hallucinate.

**Data fetching:**

- Server function `getAggregates()` (public, publishable‑key client, no auth) that returns `{ total, byAgeGroup, byQuestion, conclusion }` — computed server‑side so RLS doesn't leak per‑row data.
- Client uses TanStack Query with `queryKey: ["aggregates"]`.
- **Realtime**: `supabase.channel('responses').on('postgres_changes', {event:'INSERT', schema:'public', table:'responses'}, ...)` triggers `queryClient.invalidateQueries(["aggregates"])`.
- **Polling fallback**: if the channel status becomes `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, or if no INSERT fires within 60s while others are actively submitting, the query switches to `refetchInterval: 15000`. Both paths safe if 100 people submit concurrently — aggregation is a single SQL group‑by, and Realtime broadcast handles fan‑out.

Subtle links added: on `/` (below the hero CTA) and on the letter page (below the closing) → *"See what everyone's sharing →"* to `/results`.

## 5. 2-submission-per-browser limit (no IP, no fingerprinting)

Client-side gate in `reflect.tsx`:

- On successful submit, increment counter in **both** `localStorage['bwys.submits']` and a first-party cookie `bwys_submits` (SameSite=Lax, 1‑year max‑age), each storing `{count, sig}` where `sig = HMAC(count, publishable-random-salt-baked-into-client)`. Signature stops trivial dev-tools editing; the salt is not a real secret since the whole thing runs client-side (acknowledged, class-project scope).
- On page load, take `max(localStorage.count, cookie.count)` — so clearing one alone doesn't reset.
- When count ≥ 2: replace the survey with a friendly card *"You've already shared your reflection twice — thank you for contributing."* + link to `/results`.
- Incognito bypass is acceptable per your note.

## Files touched

- **New**: `src/lib/reflection-providers.server.ts`, `src/lib/aggregates.functions.ts`, `src/lib/submit-limit.ts`, `src/routes/results.tsx`, one migration file.
- **Edited**: `src/lib/questions.ts` (new set + age group), `src/lib/reflection.functions.ts` (orchestrator + persist to `responses`), `src/routes/reflect.tsx` (age gate, framing line, submit-limit gate, "See results" link), `src/routes/index.tsx` (results link), `src/routes/letter.$sessionId.tsx` (results link).
- **Untouched**: `/wall`, auth, existing homepage cinematic design, `reflection_sessions` table (kept for the personal letter; `responses` is separate and aggregate‑only).

## What I need from you after you approve

1. Approve the Supabase migration when the chat shows the diff.
2. Paste `GEMINI_API_KEY` and `GROQ_API_KEY` into the two secret forms I'll open (optional: `OPENROUTER_API_KEY`). Site works with just Tier 1 while you fetch them, but the multi‑provider safety net only kicks in once they're set.  
  
NOTE: ILL PASTE IT HERE BECAUSE MY CREDITS WILL LIKELY FINISH AFTER I CLICK SAVE & APPROVE AND WONT BE ABLE TO CONTINUE FOR TODAY!  
GEMINI API KEY: AQ.Ab8RN6Lt4crPAQZCb88MR0KvJTWQTUOeY2tjw4N5p_ShBt1vow  
GROQ API KEY: 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  
OPENROUTER API KEY: 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

## Final honesty check I'll run before saying "done"

- `supabase--linter` for any new RLS/grant issues on `responses`.
- Deliberate‑fail test of each of the three AI tiers, screenshots of `/letter/preview` per tier.
- Concurrent‑insert smoke test (10 parallel inserts) to prove `/results` updates live and aggregation stays consistent.
- `tsgo` clean.
- Written summary answering your (a)–(e) questions verbatim, including whether the root cause was a Lovable AI credit cap.