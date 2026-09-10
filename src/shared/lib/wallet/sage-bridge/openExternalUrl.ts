import { isSageRuntime } from "../detectWalletRuntime";
import { callUnwrappedSageBridgeMethod } from "./sageRawBridge";

/**
 * Open a URL outside the app.
 *
 * Inside Sage, `window.open` and `target="_blank"` are denied by the app
 * webview's navigation policy (`crates/sage-apps/src/security/csp.rs`);
 * every external link must go through `environment.openExternalUrl`, which
 * shows a Sage approval dialog per link. In an ordinary browser this is a
 * plain `window.open`.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!isSageRuntime()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await callUnwrappedSageBridgeMethod<unknown>("environment.openExternalUrl", { url });
}
