/**
 * Sage app manifest constraints, mirrored from the Sage 0.13.0 sources so the packaging
 * scripts can validate `sage-manifest.json` before it ever reaches a Sage install.
 *
 * Capability names: docs/generated/user-bridge-capabilities.md (xch-dev/sage, main).
 * Whitelist rules and CSP: crates/sage-apps/src/security/csp.rs and the app platform docs.
 * Snapshot limits: packages/sage-app-sdk/cli/finalize-manifest.mjs.
 */

/** Every capability Sage accepts. An unknown name rejects the whole manifest. */
export const SAGE_CAPABILITIES = [
  "bridge.send",
  "app.get_info",
  "app.lifecycle.ready_to_stop",
  "app.lifecycle.set_before_stop_listener",
  "app.get_capabilities",
  "app.request_capability_grant",
  "app.request_network_whitelist_grant",
  "app.request_permission_grants",
  "wallet.get_key",
  "wallet.get_secret_key",
  "wallet.send_xch",
  "wallet.send_xch_auto_submit",
  "wallet.get_sync_status",
  "wallet.get_version",
  "wallet.get_xch_usd_price",
  "wallet.check_address",
  "wallet.filter_unlocked_coins",
  "wallet.get_asset_coins",
  "wallet.get_asset_balance",
  "wallet.sign_coin_spends",
  "wallet.sign_message",
  "wallet.send_transaction",
  "wallet.get_public_keys",
  "wallet.get_derivations",
  "wallet.get_spendable_coin_count",
  "wallet.get_coins_by_ids",
  "wallet.get_coins",
  "wallet.get_pending_transactions",
  "wallet.get_transaction",
  "wallet.get_transactions",
  "wallet.listen_selected_wallet_changed",
  "environment.theme.get_current",
  "environment.theme.css_vars",
  "environment.theme.listen_changed",
  "environment.get_network",
  "environment.open_external_url",
  "storage.persistent_webview",
] as const;

/** Exposes key material — never request it. */
export const SECRET_CAPABILITIES = ["wallet.get_secret_key"] as const;

/** Cannot be requested by an app at all. */
export const APP_UNREQUESTABLE_CAPABILITIES = ["wallet.send_xch_auto_submit"] as const;

/**
 * Externally observable capabilities. Kept optional so the required set stays inside
 * Sage's permission policy; the app asks for them with `app.requestPermissionGrants`
 * before the first send / sign.
 */
export const EXTERNALLY_OBSERVABLE_CAPABILITIES = [
  "wallet.send_xch",
  "wallet.sign_coin_spends",
  "wallet.sign_message",
  "wallet.send_transaction",
  "environment.open_external_url",
] as const;

/** Network ids the whitelist can be scoped to. */
export const SAGE_NETWORK_IDS = ["mainnet", "testnet11"] as const;

export const MAX_FILE_COUNT = 2000;
export const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_MANIFEST_SIZE_BYTES = 1024 * 1024;

export interface SageWhitelist {
  required?: string[];
  optional?: string[];
}

export interface SageManifest {
  manifestVersion: number;
  name: string;
  version: string;
  icon?: string;
  entry?: string;
  sageVersion?: { min?: string; testedMax?: string };
  author?: { name: string; avatar?: string };
  permissions?: {
    network?: {
      whitelist?: SageWhitelist;
      whitelistByNetwork?: Record<string, SageWhitelist>;
    };
    capabilities?: { required?: string[]; optional?: string[] };
  };
  files?: { path: string; sha256: string; size: number }[];
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Validate one whitelist entry: `scheme://host[:port]`, scheme http | https | wss,
 * `http` only for loopback, at most one leading `*.` wildcard label, no path.
 */
export function validateWhitelistEntry(entry: string): string | null {
  const match = /^([a-z]+):\/\/([^/?#]+)$/.exec(entry);
  if (!match) return `"${entry}" must be scheme://host[:port] with no path`;
  const [, scheme, hostPort] = match;
  if (!["http", "https", "wss"].includes(scheme)) {
    return `"${entry}" uses scheme "${scheme}" (only http, https and wss are accepted; ws is rejected)`;
  }
  const host = hostPort.replace(/:\d+$/, "");
  if (scheme === "http" && !LOOPBACK_HOSTS.has(host)) {
    return `"${entry}" uses http for a non-loopback host (only loopback dev apps may use http)`;
  }
  const labels = host.split(".");
  if (labels.slice(1).some((label) => label.includes("*"))) {
    return `"${entry}" may only wildcard the leading label ("*.example.com")`;
  }
  if (labels[0].includes("*") && labels[0] !== "*") {
    return `"${entry}" wildcard must be a whole leading label ("*.example.com")`;
  }
  return null;
}

/** Collect every problem with a source manifest. An empty array means it is valid. */
export function validateSourceManifest(manifest: SageManifest): string[] {
  const problems: string[] = [];
  const known = new Set<string>(SAGE_CAPABILITIES);

  if (manifest.manifestVersion !== 0) problems.push("manifestVersion must be 0");
  if (!manifest.name?.trim()) problems.push("name must be a non-empty string");
  if (!manifest.version?.trim()) problems.push("version must be a non-empty string");
  if (!manifest.icon?.trim()) problems.push("icon must name a file in the snapshot");
  if (!manifest.sageVersion?.min?.trim()) problems.push("sageVersion.min must be set");

  const capabilities = manifest.permissions?.capabilities;
  const required = capabilities?.required ?? [];
  const optional = capabilities?.optional ?? [];

  for (const [group, names] of [
    ["required", required],
    ["optional", optional],
  ] as const) {
    for (const name of names) {
      if (!known.has(name)) problems.push(`unknown capability in ${group}: "${name}"`);
      if ((SECRET_CAPABILITIES as readonly string[]).includes(name)) {
        problems.push(`capability "${name}" exposes secrets and must not be requested`);
      }
      if ((APP_UNREQUESTABLE_CAPABILITIES as readonly string[]).includes(name)) {
        problems.push(`capability "${name}" cannot be requested by an app`);
      }
    }
  }

  for (const name of required) {
    if ((EXTERNALLY_OBSERVABLE_CAPABILITIES as readonly string[]).includes(name)) {
      problems.push(
        `externally observable capability "${name}" should be optional, not required ` +
          "(request it with app.requestPermissionGrants)"
      );
    }
  }

  for (const name of required) {
    if (optional.includes(name)) problems.push(`capability "${name}" is both required and optional`);
  }

  const network = manifest.permissions?.network;
  const lists: [string, SageWhitelist | undefined][] = [["whitelist", network?.whitelist]];
  for (const [id, list] of Object.entries(network?.whitelistByNetwork ?? {})) {
    if (!(SAGE_NETWORK_IDS as readonly string[]).includes(id)) {
      problems.push(`unknown network id in whitelistByNetwork: "${id}"`);
    }
    lists.push([`whitelistByNetwork.${id}`, list]);
  }
  for (const [label, list] of lists) {
    for (const group of ["required", "optional"] as const) {
      for (const entry of list?.[group] ?? []) {
        const problem = validateWhitelistEntry(entry);
        if (problem) problems.push(`${label}.${group}: ${problem}`);
      }
    }
  }

  return problems;
}

/** All host entries granted for a network id, as Sage would expand them into the CSP. */
export function whitelistForNetwork(manifest: SageManifest, networkId: string): string[] {
  const network = manifest.permissions?.network;
  const collect = (list?: SageWhitelist) => [...(list?.required ?? []), ...(list?.optional ?? [])];
  return [
    ...collect(network?.whitelist),
    ...collect(network?.whitelistByNetwork?.[networkId]),
  ].filter((entry, index, all) => all.indexOf(entry) === index);
}
