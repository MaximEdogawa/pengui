import { logger } from "@/shared/lib/logger";
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
 *
 * Caveat: Sage 0.13 rejected `environment.open_external_url` as an unknown
 * capability at install time, so the manifest no longer requests it and this
 * bridge method may not exist on that release either. Resolve either way
 * rather than rejecting — callers fire this from a click handler, and an
 * unhandled rejection would make a dead link look like nothing happened.
 * Returns whether the URL was actually handed to Sage.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (!isSageRuntime()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  try {
    await callUnwrappedSageBridgeMethod<unknown>("environment.openExternalUrl", { url });
    return true;
  } catch (error) {
    logger.error(`Sage refused to open external URL ${url}:`, error);
    return false;
  }
}
