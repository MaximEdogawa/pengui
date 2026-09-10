/**
 * Calls Sage bridge methods the published `sage-app-sdk` client does not wrap
 * yet.
 *
 * `sage-app-sdk` 0.13.0's typed `SageClient` covers most of the bridge, but
 * two methods this adapter needs are missing from it even though the host
 * (`crates/sage-apps`, `docs/generated/user-bridge-methods.md` on
 * `xch-dev/sage@main`) already implements them:
 *
 * - `environment.openExternalUrl` (capability `environment.open_external_url`)
 * - `app.requestPermissionGrants`, the batched replacement for the deprecated
 *   `app.requestCapabilityGrant` / `app.requestNetworkWhitelistGrant` the SDK
 *   does wrap (this adapter still uses the deprecated singular call for
 *   capability grants — see `sageMappers.ts` — so only the first method
 *   actually needs this module today).
 *
 * Rather than a raw `@tauri-apps/api` `invoke` of a Sage-internal command
 * (the mistake the previous attempt made, blocked by the app webview ACL),
 * this calls the *same* sanctioned `apps_invoke_bridge` transport the SDK
 * itself uses, via the SDK's own exported `createBridgeRuntimeCore`. It
 * mirrors the ~15 lines of response/event wiring `initSageRuntimeBridge`
 * does internally for `window.__SAGE__`'s core, scoped to a second,
 * lazily-created core so approval-gated calls (which the host answers
 * asynchronously via a `sage-bridge:response` event once the user responds
 * to the dialog) resolve correctly instead of only handling the synchronous
 * fast path.
 *
 * Remove this module once a `sage-app-sdk` release wraps these methods.
 */
import { createBridgeRuntimeCore, parseJsonOrNull, SAGE_BRIDGE_VERSION } from "sage-app-sdk";

type BridgeCore = NonNullable<ReturnType<typeof createBridgeRuntimeCore>>;

interface RawBridgeResponse {
  bridgeVersion: string;
  id: string;
  ok: boolean;
  result?: unknown;
  resultJson?: string;
  error?: { code: string; message: string };
}

let core: BridgeCore | null | undefined;
let responseListenerAttached = false;

function ensureCore(): BridgeCore | null {
  if (core === undefined) {
    core =
      createBridgeRuntimeCore({
        version: SAGE_BRIDGE_VERSION,
        invokeCommand: "apps_invoke_bridge",
        requestIdPrefix: "pengui-sage-ext",
      }) ?? null;
  }

  if (core && !responseListenerAttached) {
    responseListenerAttached = true;
    core.webview
      .listen<RawBridgeResponse>("sage-bridge:response", (event) => {
        const data = event.payload;
        if (!data || data.bridgeVersion !== SAGE_BRIDGE_VERSION) return;
        const pending = core?.pendingRequests.get(data.id);
        if (!pending) return; // Response for a request another core issued.
        core?.pendingRequests.delete(data.id);
        clearTimeout(pending.timeoutId);
        if (data.ok) {
          pending.resolve("result" in data ? data.result : parseJsonOrNull(data.resultJson));
        } else {
          pending.reject(new Error(data.error?.message ?? "Unknown Sage bridge error"));
        }
      })
      .catch(() => {
        // Best effort: without this listener, pending-response calls (e.g.
        // an approval dialog) fall back to the core's own request timeout.
      });
  }

  return core;
}

/** True once a Sage app webview has been detected (mirrors `hasSageBridge`). */
export function hasRawBridgeCore(): boolean {
  return ensureCore() !== null;
}

/**
 * Call a Sage bridge method by name, bypassing the typed `SageClient`.
 * Only for methods not yet wrapped by `sage-app-sdk` — see the module
 * comment. Everything else should go through `getSageClient()`.
 */
export async function callUnwrappedSageBridgeMethod<T>(
  method: string,
  params?: unknown
): Promise<T> {
  const bridgeCore = ensureCore();
  if (!bridgeCore) {
    throw new Error("Sage bridge runtime is unavailable");
  }
  return bridgeCore.callHost<T>(method, params);
}

/** Test-only: drop the cached core so each test starts clean. */
export function __resetRawBridgeCoreForTests(): void {
  core = undefined;
  responseListenerAttached = false;
}
