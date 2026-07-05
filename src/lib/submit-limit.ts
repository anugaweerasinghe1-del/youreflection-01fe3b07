/**
 * Client-side 2-submission-per-browser limit. Uses both localStorage and a
 * first-party cookie so clearing one alone doesn't reset the counter.
 * Class-project scope: incognito bypass is acceptable.
 */

const KEY = "bwys.submits.v1";
export const MAX_SUBMITS = 2;

function readLocal(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
}

function readCookie(): number {
  if (typeof document === "undefined") return 0;
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${KEY}=`));
  if (!m) return 0;
  const n = Number.parseInt(decodeURIComponent(m.split("=")[1] ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function writeBoth(n: number) {
  try { window.localStorage.setItem(KEY, String(n)); } catch {}
  try {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${KEY}=${n}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
  } catch {}
}

export function getSubmitCount(): number {
  return Math.max(readLocal(), readCookie());
}

export function hasReachedLimit(): boolean {
  return getSubmitCount() >= MAX_SUBMITS;
}

export function recordSubmit(): number {
  const next = getSubmitCount() + 1;
  writeBoth(next);
  return next;
}
