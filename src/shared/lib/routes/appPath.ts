/**
 * Route-path helpers that tolerate how Sage serves the app.
 *
 * In a browser the app is served by Next.js and `usePathname()` returns clean
 * routes (`/`, `/login`, `/dashboard`). Inside Sage the snapshot is served from
 * the `sage-app://<origin>/` protocol (on Windows, `https://sage-app.<origin>`),
 * where only the manifest `entry` resolves at `/` and every other path must be
 * a listed file — so the webview URL can read `/index.html` instead of `/`, and
 * static-export routes exist on disk as `dashboard.html` alongside `dashboard/`.
 *
 * Comparing `pathname` literally against `"/"` therefore silently fails inside
 * Sage, which is what left a connected wallet on the login screen while the
 * dashboard layout rendered around it.
 */

/**
 * Normalise a pathname to its clean route form.
 *
 * `/index.html` and `/` both become `/`; `/dashboard.html`, `/dashboard/` and
 * `/dashboard` all become `/dashboard`. Already-clean browser paths are
 * returned unchanged.
 */
export function normalizeAppPath(pathname: string): string {
  if (!pathname) return "/";

  // Strip a trailing .html/.htm: static-export routes exist as files.
  const withoutExtension = pathname.replace(/\.html?$/i, "");

  // Collapse a trailing slash, except on the root itself.
  const withoutTrailingSlash =
    withoutExtension.length > 1 ? withoutExtension.replace(/\/+$/, "") : withoutExtension;

  // `/index` is the entry document, i.e. the root route.
  if (withoutTrailingSlash === "/index" || withoutTrailingSlash === "") return "/";

  return withoutTrailingSlash;
}

/**
 * Whether a pathname is the login screen.
 *
 * The root route renders login, so `/`, `/login` and their Sage-served
 * equivalents (`/index.html`, `/login.html`) all count.
 */
export function isLoginPath(pathname: string): boolean {
  const normalized = normalizeAppPath(pathname);
  return normalized === "/" || normalized === "/login";
}
