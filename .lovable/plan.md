## Full site diagnosis — results

Ran a headless-browser sweep across both domains (home, `/reflect`, `/results`, `/wall`).

| Check | ai.youreflections.workers.dev | youreflection.lovable.app |
|---|---|---|
| Home renders | ✅ | ✅ |
| `/reflect` (age gate + questions) | ✅ | ✅ |
| `/results` (live totals, per-question) | ✅ 42 responses | ✅ 42 responses |
| `/wall` (approved sentences) | ✅ same entries | ✅ same entries |
| Console/page errors | none | none |
| HTTP status | 200 across all routes | 200 across all routes |

Both domains now share the same Supabase backend and read the same 42 responses / same wall entries — no data drift, no data loss. Cloudflare secrets fix worked. The stale-cache headers from `src/server.ts` are in effect on the Worker.

**One small thing worth flagging (not part of this plan unless you say so):** the `/reflect` age gate shows an "Under 13" option, but the footer/copy says "Ages 13+". These should agree — either drop the "Under 13" chip, or route it to a polite "come back when you're 13" screen. Say the word and I'll fix it in a follow-up.

## Premium homepage improvements (minimal, low-risk)

Scope is limited to `src/routes/index.tsx` and CSS tokens. No new deps, no server changes, no routing changes, no image swaps.

1. **Hero — cinematic vignette + subtle grain-lift**
   - Add a soft radial vignette layer over the portrait so the type has more contrast without darkening the whole image.
   - Add a slow (18s) `will-change: transform` scale drift on the hero image (from `scale(1)` → `scale(1.04)`) — Apple-style "the photo breathes" motion.
   - Tighten CTA: replace the underline anchor with a hairline-bordered pill that still reads as editorial (border-foreground/25 → hover:border-accent, subtle inner glow).

2. **Numbers section — tabular refinement**
   - Add `tabular-nums` so the counting animation doesn't jitter.
   - Thin the accent suffix (font-weight 300) and increase the gap between number and label.
   - Add a hairline vertical rule between the 3 stats on desktop.

3. **Journey cards — depth**
   - Add a very soft ring (`ring-1 ring-foreground/5`) and 1px inner highlight on each parallax card.
   - Lift the caption block with a `backdrop-blur-[2px]` on a translucent panel so text is legible over any photo.

4. **How it works — index chip**
   - Replace the plain "01 / 02 …" text with a monospaced index chip inside a hairline circle. Reads much more "editorial system" than "list".

5. **Final CTA — quiet halo**
   - Add one warm accent-tinted radial glow behind the headline (identical technique already used on `/results`), so the last section doesn't feel flat compared to the hero.

6. **Global polish (tokens only, no component rewrites)**
   - Add `scroll-behavior: smooth` and a slightly larger `--radius-lg` for the new pill CTA.
   - Add a `@media (prefers-reduced-motion: reduce)` block that disables the hero drift, the marquee, and the number count-up.

### What will NOT change
- Section order, copy, images, routes, server functions, migrations, wall/results logic, Nav, footer, meta tags, cache headers.
- No new packages, no font swap, no color palette change.

### Verification
- After edits: rebuild passes, then re-run the Playwright sweep on `/` for both domains (once redeployed) and screenshot hero + CTA at 1280×1800 to confirm the vignette/pill render as intended.

Deploy note: as before, the workers.dev domain only picks up the new build after you push and your Cloudflare Worker redeploys. The Lovable-hosted domain updates automatically.