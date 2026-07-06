import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Cache policy — permanent fix for the "stale SPA" problem.
 *
 * - HTML (the SSR shell): must always be revalidated so browsers pick up new
 *   asset filenames on the next visit.
 * - Hashed static assets under /assets/ or /_build/: safe to cache forever
 *   because the filename changes on every build.
 * - Server-function / API responses: never cache.
 */
function applyCachePolicy(request: Request, response: Response): Response {
  // Don't touch redirects, errors, or already-set explicit cache policies from
  // server functions.
  if (response.status >= 300 || response.headers.has("cache-control")) {
    return response;
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const contentType = response.headers.get("content-type") ?? "";

  const headers = new Headers(response.headers);

  // Server-fn RPC and API endpoints: never cache.
  if (path.startsWith("/_serverFn/") || path.startsWith("/api/")) {
    headers.set("cache-control", "no-store");
  } else if (
    path.startsWith("/assets/") ||
    path.startsWith("/_build/") ||
    // Fingerprinted files (Vite hashes end in ~8 hex chars before the ext)
    /\.[A-Za-z0-9_-]{8,}\.(js|css|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico|mp4|webm)$/i.test(path)
  ) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  } else if (contentType.startsWith("text/html")) {
    headers.set("cache-control", "no-cache, no-store, must-revalidate");
    headers.set("pragma", "no-cache");
    headers.set("expires", "0");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applyCachePolicy(request, normalized);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  },
};
