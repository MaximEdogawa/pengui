/**
 * CORS headers for the public read-only proxy routes (`/api/spacescan/*`).
 *
 * Inside the Sage wallet the app is served from the `sage-app://<origin-id>/` custom
 * protocol (Windows: `https://sage-app.<origin-id>`). The origin id is generated per
 * install, so it cannot be allow-listed ahead of time, and non-special schemes send
 * `Origin: null`. These routes proxy public, unauthenticated, read-only data and never
 * read cookies or credentials, so the default allow-origin is `*`.
 *
 * Set `API_CORS_ALLOW_ORIGIN` to pin a single origin instead.
 */

const DEFAULT_ALLOW_ORIGIN = "*";

/** Header name/value pairs to merge into a proxy response. */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.API_CORS_ALLOW_ORIGIN || DEFAULT_ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Preflight response shared by the proxy routes. */
export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
