/**
 * Shown while a route segment is loading (e.g. during client-side navigation).
 * Keeps the app responsive so the UI does not freeze on slow networks.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-[200px] w-full items-center justify-center"
      aria-label="Loading"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500"
        aria-hidden
      />
    </div>
  );
}
