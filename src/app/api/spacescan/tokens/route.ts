import { NextResponse } from "next/server";
import { logger } from "@/shared/lib/logger";
import { SPACESCAN_API_TOKENS_URL } from "@/shared/lib/constants/apiProxy";
import { corsHeaders, corsPreflightResponse } from "@/shared/lib/api/cors";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

async function fetchTokensOnce(): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(SPACESCAN_API_TOKENS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "PenguinPool/1.0 (Token List Proxy)",
    },
    signal: controller.signal,
    next: { revalidate: 3600 },
  });
  clearTimeout(timeout);
  return res;
}

/**
 * Proxy Space Scan /tokens. Browser calls this to avoid CORS (Space Scan does not send
 * Access-Control-Allow-Origin for this endpoint). Server fetches and returns JSON.
 * Retries up to MAX_RETRIES on fetch failure to handle transient network issues.
 *
 * Sends CORS headers so the Sage snapshot (served from `sage-app://`) can call it
 * cross-origin — see src/shared/lib/api/cors.ts.
 */
export async function GET() {
  let lastError: unknown;
  const attempts = [0, 1, 2] as const;
  for (const attempt of attempts) {
    try {
      const res = await fetchTokensOnce();
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, {
          headers: {
            ...corsHeaders(),
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
      const isRetryable = res.status >= 500 || res.status === 403;
      if (!isRetryable || attempt === MAX_RETRIES) {
        const status = res.status === 403 ? 502 : res.status;
        const message = res.status === 403 ? "Upstream tokens unavailable" : res.statusText;
        return NextResponse.json({ status: "error", message }, { status, headers: corsHeaders() });
      }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      } else {
        logger.error("[api/spacescan/tokens]", error);
        return NextResponse.json(
          { status: "error", message: "Failed to fetch tokens" },
          { status: 502, headers: corsHeaders() }
        );
      }
    }
  }
  logger.error("[api/spacescan/tokens]", lastError);
  return NextResponse.json(
    { status: "error", message: "Failed to fetch tokens" },
    { status: 502, headers: corsHeaders() }
  );
}

/** CORS preflight for cross-origin callers (the Sage snapshot). */
export async function OPTIONS() {
  return corsPreflightResponse();
}
