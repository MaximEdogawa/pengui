import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { logger } from "@/shared/lib/logger";

/**
 * Serves the Sage static snapshot (`bun run build:sage` -> out/) from the same
 * origin as the hosted app, so a single URL (https://pengui.space) works both
 * as the WalletConnect web app and as the Sage "Install from URL" target.
 *
 * The snapshot's own `_next/static/<hash>/...` assets can't live in Next's
 * `public/` folder -- Next refuses to build with a `_next` folder inside
 * `public/` ("This conflicts with the internal '/_next' route"). This proxy
 * (Next's renamed middleware convention; always Node.js runtime) runs ahead
 * of that internal `_next` handling, so it can serve arbitrary snapshot files
 * at any path -- including under `_next/` -- without touching `public/` or
 * any app route.
 *
 * Only paths actually listed in the snapshot's own sage-manifest.json are
 * served; everything else falls through to the normal app untouched. The
 * manifest is loaded lazily and cached only once it succeeds -- not at
 * module load -- so `bun run dev` started before the snapshot exists (then
 * built and copied in afterwards, without a server restart) picks it up on
 * the very next request instead of staying 404 for the life of the process.
 */

const SNAPSHOT_DIR = resolve(process.cwd(), process.env.SAGE_SNAPSHOT_DIR || "sage-snapshot");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function mimeFor(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "application/octet-stream" : (MIME[path.slice(dot)] ?? "application/octet-stream");
}

// Cached only on a successful load. A failed attempt is not cached, so the
// next request tries again instead of being stuck empty for the process's
// lifetime -- see the note above about `bun run dev` started too early.
let servablePaths: ReadonlySet<string> | undefined;
let warnedMissing = false;

function getServablePaths(): ReadonlySet<string> {
  if (servablePaths) return servablePaths;
  const manifestPath = join(SNAPSHOT_DIR, "sage-manifest.json");
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      files?: Array<{ path: string }>;
    };
    const paths = new Set<string>(["sage-manifest.json"]);
    for (const file of manifest.files ?? []) paths.add(file.path);
    servablePaths = paths;
    warnedMissing = false;
    return paths;
  } catch (err) {
    // No snapshot baked into this deployment (yet) -- stay inert this request.
    // Logged once (not per-request) so a genuinely missing/misplaced snapshot
    // is visible instead of silently 404ing forever.
    if (!warnedMissing) {
      warnedMissing = true;
      logger.warn(`[sage-proxy] no snapshot at ${manifestPath}:`, err);
    }
    return new Set();
  }
}

export const config = {
  matcher: ["/:path*"],
};

export function proxy(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname.replace(/^\/+/, "");

  if (!getServablePaths().has(path)) return NextResponse.next();

  try {
    const body = readFileSync(join(SNAPSHOT_DIR, path));
    return new NextResponse(body, { headers: { "Content-Type": mimeFor(path) } });
  } catch {
    return NextResponse.next();
  }
}
