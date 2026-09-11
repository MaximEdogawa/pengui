import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Serves the Sage static snapshot (`bun run build:sage` -> out/) from the same
 * origin as the hosted app, so a single URL (https://pengui.space) works both
 * as the WalletConnect web app and as the Sage "Install from URL" target.
 *
 * The snapshot's own `_next/static/<hash>/...` assets can't live in Next's
 * `public/` folder -- Next refuses to build with a `_next` folder inside
 * `public/` ("This conflicts with the internal '/_next' route"). Middleware
 * runs ahead of that internal `_next` handling, so it can serve arbitrary
 * snapshot files at any path -- including under `_next/` -- without touching
 * `public/` or any app route.
 *
 * Only paths actually listed in the snapshot's own sage-manifest.json are
 * served; everything else falls through to the normal app untouched. If the
 * snapshot was never built into this deployment (local dev, CI, `bun run
 * build` without `build:sage`), the manifest read fails once at module load
 * and this middleware becomes a permanent no-op.
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

function loadServablePaths(): ReadonlySet<string> {
  try {
    const manifest = JSON.parse(readFileSync(join(SNAPSHOT_DIR, "sage-manifest.json"), "utf8")) as {
      files?: Array<{ path: string }>;
    };
    const paths = new Set<string>(["sage-manifest.json"]);
    for (const file of manifest.files ?? []) paths.add(file.path);
    return paths;
  } catch {
    // No snapshot baked into this deployment -- middleware stays inert.
    return new Set();
  }
}

const SERVABLE_PATHS = loadServablePaths();

export const config = {
  runtime: "nodejs",
  matcher: ["/:path*"],
};

export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname.replace(/^\/+/, "");

  if (!SERVABLE_PATHS.has(path)) return NextResponse.next();

  try {
    const body = readFileSync(join(SNAPSHOT_DIR, path));
    return new NextResponse(body, { headers: { "Content-Type": mimeFor(path) } });
  } catch {
    return NextResponse.next();
  }
}
