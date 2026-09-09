/**
 * Feature flags configuration.
 *
 * Reads a single comma-separated env var `NEXT_PUBLIC_FEATURE_FLAGS` that
 * lists enabled features, e.g.:
 *
 *   NEXT_PUBLIC_FEATURE_FLAGS=dashboard,offers,trading,wallet
 *
 * A feature is enabled when its key appears in the list.
 *
 * When the var is **unset or blank** the {@link DEFAULT_FEATURE_FLAGS} baseline
 * applies. Deployed builds inline this var at build time (see
 * `deployment/Dockerfile`), so a forgotten build arg / CI variable arrives here
 * as an empty string; without a baseline that silently turns every feature off
 * in that environment. To disable features, list only the ones you want (e.g.
 * `NEXT_PUBLIC_FEATURE_FLAGS=dashboard`) — an explicit list is always honoured
 * exactly as written.
 *
 * Note: the Tibet **swap / add liquidity / remove liquidity** UI has no flag of
 * its own. It lives in the Trading page's right panel, so it is available in
 * every environment whose flag list contains `trading`.
 */

export type FeatureFlag =
  | "dashboard"
  | "offers"
  | "trading"
  | "loans"
  | "optionContracts"
  | "piggyBank"
  | "wallet";

export const ALL_FEATURE_FLAGS: readonly FeatureFlag[] = [
  "dashboard",
  "offers",
  "trading",
  "loans",
  "optionContracts",
  "piggyBank",
  "wallet",
];

/**
 * Baseline used when `NEXT_PUBLIC_FEATURE_FLAGS` is unset or blank.
 * Mirrors `deployment/.env.example` so every environment ships the same core
 * features — including `trading`, which carries the swap UI.
 */
export const DEFAULT_FEATURE_FLAGS: readonly FeatureFlag[] = [
  "dashboard",
  "offers",
  "trading",
  "wallet",
];

/**
 * Parse the comma-separated flag list.
 * `undefined`, `""` or whitespace-only falls back to {@link DEFAULT_FEATURE_FLAGS}.
 */
export function parseFeatureFlags(raw: string | undefined | null): ReadonlySet<string> {
  const entries = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (entries.length === 0) {
    return new Set(DEFAULT_FEATURE_FLAGS.map((f) => f.toLowerCase()));
  }
  return new Set(entries);
}

/** Memoised parse: the env var is a build-time constant, so this runs once. */
let cachedRaw: string | undefined | null;
let cachedFlags: ReadonlySet<string> | undefined;

function enabledFlags(): ReadonlySet<string> {
  const raw = process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  if (cachedFlags === undefined || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedFlags = parseFeatureFlags(raw);
  }
  return cachedFlags;
}

/** Check whether a single feature flag is enabled. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return enabledFlags().has(flag.toLowerCase());
}

/** Snapshot of all feature flags (useful for debugging / logging). */
export function getFeatureFlags(): Record<FeatureFlag, boolean> {
  return Object.fromEntries(ALL_FEATURE_FLAGS.map((f) => [f, isFeatureEnabled(f)])) as Record<
    FeatureFlag,
    boolean
  >;
}

/**
 * Maps a menu-item id (kebab-case, as used in `useMenuItems`) to the
 * corresponding feature flag key.
 */
export const MENU_ID_TO_FLAG: Record<string, FeatureFlag> = {
  dashboard: "dashboard",
  offers: "offers",
  trading: "trading",
  loans: "loans",
  "option-contracts": "optionContracts",
  "piggy-bank": "piggyBank",
  wallet: "wallet",
};
