/**
 * Feature flags configuration.
 *
 * Reads a single comma-separated env var `NEXT_PUBLIC_FEATURE_FLAGS` that
 * lists enabled features, e.g.:
 *
 *   NEXT_PUBLIC_FEATURE_FLAGS=dashboard,offers,trading,wallet
 *
 * A feature is enabled when its key appears in the list.
 * An empty / unset var means **no features** are enabled.
 */

export type FeatureFlag =
  | "dashboard"
  | "offers"
  | "trading"
  | "loans"
  | "optionContracts"
  | "piggyBank"
  | "wallet";

/** Parse the comma-separated env var once. */
const enabledFlags: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_FEATURE_FLAGS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

/** Check whether a single feature flag is enabled. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return enabledFlags.has(flag.toLowerCase());
}

/** Snapshot of all feature flags (useful for debugging / logging). */
export function getFeatureFlags(): Record<FeatureFlag, boolean> {
  const flags: FeatureFlag[] = [
    "dashboard",
    "offers",
    "trading",
    "loans",
    "optionContracts",
    "piggyBank",
    "wallet",
  ];
  return Object.fromEntries(flags.map((f) => [f, isFeatureEnabled(f)])) as Record<
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
