/* eslint-disable no-console */
/**
 * SageMockWallet
 *
 * A programmatic WalletConnect wallet peer that acts as a Sage Wallet for
 * Playwright E2E tests.  It runs in the Node.js test process alongside
 * Playwright and communicates with the dApp (running in Chromium) through
 * the real WalletConnect relay.
 *
 * Flow
 * ────
 * 1. `init()`         — initialise a WalletConnect SignClient (wallet side).
 * 2. `pair(uri)`      — pair with the URI the dApp displays in the QR modal.
 * 3. onProposal       — auto-approve the session using the chia namespace.
 * 4. onRequest        — respond to every Sage RPC method with fixture data.
 * 5. `destroy()`      — disconnect all active sessions and clean up.
 *
 * Requirements
 * ────────────
 * • NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID  (or WC_PROJECT_ID) must be set.
 * • NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL   optional, defaults to WC cloud.
 * • WC_CHAIN_ID                            optional, defaults to chia:mainnet.
 */

import SignClient from "@walletconnect/sign-client";
import type { SignClientTypes } from "@walletconnect/types";
import { MOCK, mockResponses } from "./responses";

const ALL_SAGE_METHODS = [
  "chip0002_connect",
  "chip0002_chainId",
  "chip0002_getPublicKeys",
  "chip0002_filterUnlockedCoins",
  "chip0002_getAssetCoins",
  "chip0002_getAssetBalance",
  "chip0002_signCoinSpends",
  "chip0002_signMessage",
  "chip0002_sendTransaction",
  "chia_createOffer",
  "chia_takeOffer",
  "chia_cancelOffer",
  "chia_getNfts",
  "chia_send",
  "chia_getAddress",
  "chia_signMessageByAddress",
  "chia_bulkMintNfts",
] as const;

export class SageMockWallet {
  private client!: Awaited<ReturnType<typeof SignClient.init>>;
  private activeTopics = new Set<string>();
  private destroyed = false;
  private readonly storagePrefix: string;
  private readonly boundOnProposal: (
    event: SignClientTypes.EventArguments["session_proposal"]
  ) => Promise<void>;
  private readonly boundOnRequest: (
    event: SignClientTypes.EventArguments["session_request"]
  ) => Promise<void>;
  private readonly boundOnSessionDelete: ({ topic }: { topic: string }) => void;

  /** The fingerprint included in the session namespace accounts. */
  get fingerprint(): number {
    return MOCK.FINGERPRINT;
  }

  /** The address returned for chia_getAddress requests. */
  get address(): string {
    return MOCK.ADDRESS;
  }

  /** Chain used in the approved session namespace. */
  readonly chainId: string;

  constructor(chainId?: string) {
    // Support testnet via env var or explicit argument.
    this.chainId =
      chainId ??
      process.env.WC_CHAIN_ID ??
      process.env.NEXT_PUBLIC_WALLET_CONNECT_CHAIN_ID ??
      MOCK.CHAIN_ID;

    // Each test wallet instance needs isolated WalletConnect core storage.
    this.storagePrefix = `pengui-e2e-wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.boundOnProposal = this.onProposal.bind(this);
    this.boundOnRequest = this.onRequest.bind(this);
    this.boundOnSessionDelete = ({ topic }: { topic: string }) => {
      this.activeTopics.delete(topic);
    };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    const projectId =
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? process.env.WC_PROJECT_ID ?? "";

    if (!projectId) {
      throw new Error(
        "SageMockWallet: no WalletConnect project ID found.\n" +
          "Set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID or WC_PROJECT_ID."
      );
    }

    const relayUrl =
      process.env.NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL ?? "wss://relay.walletconnect.com";

    this.client = await SignClient.init({
      projectId,
      relayUrl,
      customStoragePrefix: this.storagePrefix,
      metadata: {
        name: "Sage Mock Wallet (Test)",
        description: "Programmatic wallet peer for Playwright E2E tests",
        url: "https://test.pengui.local",
        icons: [],
      },
    });

    this.destroyed = false;
    this.client.on("session_proposal", this.boundOnProposal);
    this.client.on("session_request", this.boundOnRequest);
    this.client.on("session_delete", this.boundOnSessionDelete);
  }

  /**
   * Pair with the WalletConnect URI from the dApp's QR modal.
   * Returns the pairing topic (not the session topic).
   */
  async pair(uri: string): Promise<void> {
    await this.client.pair({ uri });
  }

  /**
   * Disconnect all active sessions and release the relay connection.
   * Call this in `afterEach` / fixture teardown.
   */
  async destroy(): Promise<void> {
    if (!this.client || this.destroyed) {
      return;
    }

    this.destroyed = true;

    this.client.off("session_proposal", this.boundOnProposal);
    this.client.off("session_request", this.boundOnRequest);
    this.client.off("session_delete", this.boundOnSessionDelete);

    await this.resetSessions();

    this.client.removeAllListeners("session_proposal");
    this.client.removeAllListeners("session_request");
    this.client.removeAllListeners("session_delete");
  }

  /**
   * Disconnect all live sessions/pairings but keep the client active.
   * Useful when reusing one wallet instance across multiple test pages.
   */
  async resetSessions(): Promise<void> {
    if (!this.client) {
      return;
    }

    const disconnects = Array.from(this.activeTopics).map((topic) =>
      this.client
        .disconnect({ topic, reason: { code: 6000, message: "Test complete" } })
        .catch(() => {
          /* session may already be gone */
        })
    );
    const pairings = this.client.core.pairing.getPairings().map((pairing) =>
      this.client.core.pairing.disconnect({ topic: pairing.topic }).catch(() => {
        /* pairing may already be gone */
      })
    );

    await Promise.allSettled([...disconnects, ...pairings]);
    this.activeTopics.clear();
  }

  // ── WalletConnect event handlers ───────────────────────────────────────────

  private async onProposal(
    event: SignClientTypes.EventArguments["session_proposal"]
  ): Promise<void> {
    const { id } = event;

    try {
      const { acknowledged } = await this.client.approve({
        id,
        namespaces: {
          chia: {
            // accounts format: "namespace:chainId:fingerprint"
            accounts: [`${this.chainId}:${this.fingerprint}`],
            methods: [...ALL_SAGE_METHODS],
            events: ["chainChanged", "accountsChanged"],
            chains: [this.chainId],
          },
        },
      });

      // Wait for the dApp to acknowledge the session.
      const session = await acknowledged();
      this.activeTopics.add(session.topic);
    } catch (err) {
      // Log but don't throw — let the test time out with a clear error.
      console.error("[SageMockWallet] Failed to approve session proposal:", err);
    }
  }

  private async onRequest(event: SignClientTypes.EventArguments["session_request"]): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const { topic, id, params } = event;
    const method = params.request.method as string;
    const result = this.buildResponse(method);

    try {
      await this.client.respond({
        topic,
        response: { id, jsonrpc: "2.0", result },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("No matching key")) {
        console.error(`[SageMockWallet] Failed to respond to ${method}:`, err);
      }
    }
  }

  /**
   * Build the response payload for a given Sage method name.
   * Subclasses may override this to mix in real data.
   */
  protected buildResponse(method: string): unknown {
    return (
      mockResponses[method] ?? {
        success: false,
        error: `SageMockWallet: no fixture response for method "${method}"`,
      }
    );
  }
}
