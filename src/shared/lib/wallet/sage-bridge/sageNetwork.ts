import { getSageClient } from "sage-app-sdk";
import type { WalletNetwork } from "../types";
import { mapSageNetwork } from "./sageMappers";

/**
 * Read Sage's active network directly from the bridge, without going through
 * the wallet provider context.
 *
 * `NetworkProvider` is mounted *above* `WalletRuntimeProvider` (the
 * WalletConnect adapter derives its SignClient from the active network, so
 * the network has to exist first) — see
 * `src/shared/providers/WalletRuntimeProvider.tsx`. That means it cannot read
 * `useWalletState().network` from the Sage adapter, so it calls the bridge
 * directly here instead. Returns `null` when the call fails (not running
 * inside Sage, or the capability was not granted); the caller keeps whatever
 * network it already had.
 */
export async function fetchSageNetwork(): Promise<WalletNetwork | null> {
  try {
    const client = await getSageClient();
    const result = await client.environment.getNetwork();
    return mapSageNetwork(result);
  } catch {
    return null;
  }
}
