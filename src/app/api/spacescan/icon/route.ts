import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/shared/lib/logger";
import { isSpaceScanIconOrigin } from "@/shared/lib/constants/apiProxy";
import { corsHeaders, corsPreflightResponse } from "@/shared/lib/api/cors";

/**
 * Proxy Space Scan token icons. Browser requests this to avoid CDN referrer/CORS blocking.
 * Server fetches from allowed Space Scan hosts only (SSRF protection) and streams the image.
 *
 * Sends CORS headers so the Sage snapshot (served from `sage-app://`) can fetch icons
 * cross-origin — see src/shared/lib/api/cors.ts.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !isSpaceScanIconOrigin(url)) {
    return NextResponse.json(
      { error: "Invalid or disallowed url" },
      { status: 400, headers: corsHeaders() }
    );
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "image/*",
        "User-Agent": "PenguinPool/1.0 (Token Icon Proxy)",
      },
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return new NextResponse(null, { status: res.status, headers: corsHeaders() });
    }
    const contentType = res.headers.get("content-type") || "image/webp";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    logger.error("[api/spacescan/icon]", url, error);
    return NextResponse.json({ error: "Failed to fetch icon" }, { status: 502, headers: corsHeaders() });
  }
}

/** CORS preflight for cross-origin callers (the Sage snapshot). */
export async function OPTIONS() {
  return corsPreflightResponse();
}
