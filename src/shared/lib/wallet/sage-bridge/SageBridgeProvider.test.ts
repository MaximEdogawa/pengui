import { describe, it, expect } from "bun:test";
import type { SageClient } from "sage-app-sdk";
import { createSageBridgeProvider, INITIAL_SAGE_BRIDGE_STATE } from "./SageBridgeProvider";
import type { CoinSpend } from "../types";

type CapabilityChangeHandler = (event: {
  removed: string[];
  added: string[];
  full: string[];
}) => void;

interface FakeSageClientOptions {
  capabilities?: string[];
  key?: { fingerprint: number; name: string; public_key: string } | null;
  receiveAddress?: string;
  networkId?: string;
  networkKind?: "mainnet" | "testnet" | "unknown";
  /** Recorded calls into `wallet.sendXch`, for assertions on the request shape sent to Sage. */
  onSendXch?: (params: unknown) => void;
  onSignCoinSpends?: (params: unknown) => void;
  onSignMessage?: (params: unknown) => void;
}

/**
 * A fake `SageClient` matching `sage-app-sdk`'s real shape (checked against
 * the imported `SageClient` type below), so the adapter can be exercised
 * without a real Sage host. Every granted capability is auto-approved by
 * `requestCapabilityGrant`, mirroring what Sage does for a capability the
 * manifest already lists as optional.
 */
function createFakeSageClient(options: FakeSageClientOptions = {}) {
  const capabilities = new Set(
    options.capabilities ?? [
      "app.get_capabilities",
      "app.request_capability_grant",
      "environment.get_network",
      "wallet.get_key",
      "wallet.get_sync_status",
      "wallet.get_asset_balance",
      "wallet.get_asset_coins",
    ]
  );
  let key =
    options.key === undefined
      ? { fingerprint: 987654321, name: "Main Wallet", public_key: `aa${"11".repeat(23)}` }
      : options.key;
  const receiveAddress = options.receiveAddress ?? "xch1testreceiveaddress";
  const networkId = options.networkId ?? "mainnet";
  const networkKind = options.networkKind ?? "mainnet";

  const capabilityChangeHandlers: CapabilityChangeHandler[] = [];
  const beforeStopHandlers: Array<(event: { requestId: string }) => void | Promise<void>> = [];

  const client: SageClient = {
    initialAppInfo: {
      id: "pengui",
      name: "Pengui",
      version: "0.0.1",
      requestedPermissions: {
        network: { whitelist: { required: [], optional: [] }, whitelistByNetwork: {} },
        capabilities: { required: [], optional: [] },
      },
      capabilities: Array.from(capabilities) as SageClient["initialAppInfo"]["capabilities"],
      network: [],
    },
    app: {
      bridgePing: async () => ({ ok: true, appId: "pengui", appName: "Pengui" }),
      bridgeSend: async () => ({ ok: true }),
      getInfo: async () => client.initialAppInfo,
      getCapabilities: async () => Array.from(capabilities),
      requestCapabilityGrant: async ({ capability }) => {
        capabilities.add(capability);
        return {
          granted: true,
          capability,
          fullGrantedCapabilities: Array.from(capabilities) as SageClient["initialAppInfo"]["capabilities"],
        };
      },
      requestNetworkWhitelistGrant: async ({ entry, networkId: forNetworkId }) => ({
        granted: true,
        entry,
        networkId: forNetworkId,
        fullGrantedNetworkWhitelist: [],
      }),
      onGrantedCapabilitiesChange: (handler) => {
        capabilityChangeHandlers.push(handler);
        return () => {
          const index = capabilityChangeHandlers.indexOf(handler);
          if (index >= 0) capabilityChangeHandlers.splice(index, 1);
        };
      },
      onGrantedNetworkWhitelistChange: () => () => {},
      lifecycle: {
        onBeforeStop: (handler) => {
          beforeStopHandlers.push(handler);
          return () => {};
        },
      },
    },
    wallet: {
      sendTransaction: async ({ spendBundle }) => ({ status: 1, error: null, spendBundle }) as never,
      signMessage: async (params) => {
        options.onSignMessage?.(params);
        return `sig:${params.publicKey}:${params.message}`;
      },
      signCoinSpends: async (params) => {
        options.onSignCoinSpends?.(params);
        return "aggregated-signature-hex";
      },
      getAssetBalance: async () => ({ confirmed: "100000", spendable: "90000", spendableCoinCount: 2 }),
      getAssetCoins: async () => [
        {
          coin: { parent_coin_info: "0xparent", puzzle_hash: "0xpuzzle", amount: "1000" },
          coinName: "0xcoinname",
          puzzle: "0xreveal",
          confirmedBlockIndex: 10,
          locked: false,
          lineageProof: null,
        },
      ],
      filterUnlockedCoins: async () => [],
      getPublicKeys: async () => ["pk-0", "pk-1"],
      getKey: async () => ({ key }),
      getSecretKey: async () => ({ secrets: null }),
      getSyncStatus: async () => ({
        selectable_balance: "90000",
        unit: { ticker: "XCH", precision: 12 },
        synced_coins: 1,
        total_coins: 1,
        receive_address: receiveAddress,
        burn_address: "xch1burn",
        unhardened_derivation_index: 0,
        hardened_derivation_index: 0,
        checked_files: 0,
        total_files: 0,
        database_size: 0,
      }),
      getVersion: async () => ({ version: "0.13.0" }),
      getPendingTransactions: async () => ({ transactions: [] }),
      getXchUsdPrice: async () => ({ usd: 20 }),
      checkAddress: async () => ({ valid: true }),
      getDerivations: async ({ hardened }) => ({
        derivations: hardened
          ? []
          : [{ index: 0, public_key: "pk-for-known-address", address: receiveAddress }],
        total: hardened ? 0 : 1,
      }),
      getSpendableCoinCount: async () => ({ count: 1 }),
      getCoinsByIds: async () => ({ coins: [] }),
      getCoins: async () => ({ coins: [], total: 0 }),
      getTransaction: async () => ({ transaction: null }),
      getTransactions: async () => ({
        transactions: [{ height: 555, timestamp: 1_700_000_000, spent: [], created: [] }],
        total: 1,
      }),
      sendXch: async (params) => {
        options.onSendXch?.(params);
        return {
          summary: {
            fee: params.fee,
            inputs: [
              {
                coin_id: "0xspentcoin",
                amount: params.amount,
                address: params.address,
                asset: null,
                outputs: [],
              },
            ],
          },
          coin_spends: [],
        };
      },
    },
    environment: {
      theme: {
        getCurrent: async () => ({
          theme: { name: "dark", displayName: "Dark", mostLike: "dark", cssVars: {} },
        }),
        onChanged: () => () => {},
        mountCssVars: async () => () => {},
      },
      getNetwork: async () => ({
        name: networkKind === "mainnet" ? "Mainnet" : "Testnet",
        networkId,
        kind: networkKind,
        ticker: "XCH",
        prefix: "xch",
        precision: 12,
      }),
    },
  };

  return {
    client,
    emitCapabilityChange: (event: { removed: string[]; added: string[]; full: string[] }) => {
      capabilityChangeHandlers.forEach((handler) => handler(event));
    },
    beforeStopHandlers,
    /** Simulate Sage switching to a different wallet: the next getKey() call sees this. */
    setKey: (nextKey: typeof key) => {
      key = nextKey;
    },
  };
}

/**
 * Let a fire-and-forget `refreshConnectionState()` settle.
 *
 * The event handlers kick off an async refresh that is not awaited, so tests
 * have to yield until it lands. Counting microtask ticks is brittle — it breaks
 * whenever the adapter's async chain gets one link longer — so poll the state
 * instead, with a tick budget as the failure mode.
 */
async function settle(check: () => boolean, ticks = 50): Promise<void> {
  for (const _tick of Array.from({ length: ticks })) {
    if (check()) return;
    await Promise.resolve();
  }
}

function providerWith(options: FakeSageClientOptions = {}) {
  const fake = createFakeSageClient(options);
  const provider = createSageBridgeProvider({ getClient: async () => fake.client });
  return { provider, ...fake };
}

describe("createSageBridgeProvider", () => {
  it("reports the sage-bridge kind and starts from the disconnected snapshot", () => {
    const { provider } = providerWith();
    expect(provider.kind).toBe("sage-bridge");
    expect(provider.getState()).toEqual(INITIAL_SAGE_BRIDGE_STATE);
    expect(provider.getSageClient()).toBeNull();
  });

  it("initialize() resolves connection state from getKey/getSyncStatus/getNetwork", async () => {
    const { provider } = providerWith();
    await provider.initialize();

    const state = provider.getState();
    expect(state.isConnected).toBe(true);
    expect(state.isReady).toBe(true);
    expect(state.fingerprint).toBe(987654321);
    expect(state.address).toBe("xch1testreceiveaddress");
    expect(state.network).toBe("mainnet");
    expect(state.walletName).toBe("Main Wallet");
    // Fixture's default granted set has no wallet.send_xch/sign_coin_spends/sign_message.
    expect(state.capabilities).toEqual({
      createOffer: false,
      takeOffer: false,
      cancelOffer: false,
      sendXch: false,
      signCoinSpends: false,
      signMessage: false,
      switchNetwork: false,
    });
  });

  it("initialize() is idempotent: a second call does not re-resolve the client", async () => {
    const { provider, client } = providerWith();
    await provider.initialize();
    await provider.initialize();
    expect(provider.getSageClient()).toBe(client);
  });

  it("stays disconnected and rejects if the client never resolves (not actually inside Sage)", async () => {
    const provider = createSageBridgeProvider({
      getClient: async () => {
        throw new Error("Sage bridge is unavailable in this runtime.");
      },
    });

    await expect(provider.initialize()).rejects.toThrow(/unavailable/);
    expect(provider.getState()).toEqual(INITIAL_SAGE_BRIDGE_STATE);
  });

  it("connect() requests missing capabilities and reflects them in state", async () => {
    const { provider } = providerWith();
    const result = await provider.connect();

    expect(result.success).toBe(true);
    const state = provider.getState();
    expect(state.isConnected).toBe(true);
    // The fake auto-grants whatever is requested, so every optional
    // capability the adapter asks for ends up granted.
    expect(state.capabilities.sendXch).toBe(true);
    expect(state.capabilities.signCoinSpends).toBe(true);
    expect(state.capabilities.signMessage).toBe(true);
    // Offers are never enabled by this task regardless of what Sage grants.
    expect(state.capabilities.createOffer).toBe(false);
    expect(provider.getGrantedCapabilities()).toContain("wallet.send_xch");
  });

  it("connect() reports not-connected when Sage never grants wallet.get_key", async () => {
    const { provider } = providerWith({ key: null });
    const result = await provider.connect();

    expect(result.success).toBe(false);
    expect(result.code).toBe("not-connected");
    expect(provider.getState().isConnected).toBe(false);
  });

  it("a capability-change event refreshes the granted capability set", async () => {
    const { provider, emitCapabilityChange } = providerWith();
    await provider.initialize();
    expect(provider.getState().capabilities.sendXch).toBe(false);

    emitCapabilityChange({
      removed: [],
      added: ["wallet.send_xch"],
      full: [...provider.getGrantedCapabilities(), "wallet.send_xch"],
    });
    await settle(() => provider.getState().capabilities.sendXch);

    expect(provider.getState().capabilities.sendXch).toBe(true);
  });

  it("a wallet.selectedWallet.changed bridge event refreshes connection state (AC #7)", async () => {
    // sage-app-sdk 0.13.0's typed client has no selectedWallet-change
    // listener; the adapter falls back to the SDK's own window re-dispatch
    // (`sage:event:<type>`) instead (see sage-bridge/SageBridgeProvider.ts,
    // registerEventListeners), so this drives that path directly.
    const { provider, setKey } = providerWith();
    await provider.initialize();
    expect(provider.getState().fingerprint).toBe(987654321);

    setKey({ fingerprint: 111222333, name: "Second Wallet", public_key: "bb".repeat(24) });
    window.dispatchEvent(
      new CustomEvent("sage:event:wallet.selectedWallet.changed", {
        detail: { type: "wallet.selectedWallet.changed", payload: { fingerprint: 111222333 } },
      })
    );
    await settle(() => provider.getState().fingerprint === 111222333);

    expect(provider.getState().fingerprint).toBe(111222333);
    expect(provider.getState().walletName).toBe("Second Wallet");
  });

  it("registers a lifecycle.onBeforeStop handler during initialize() (AC #7)", async () => {
    const { provider, beforeStopHandlers } = providerWith();
    expect(beforeStopHandlers).toHaveLength(0);
    await provider.initialize();
    expect(beforeStopHandlers).toHaveLength(1);
  });

  it("getNetwork maps Sage's network id to Pengui's", async () => {
    const { provider } = providerWith({ networkId: "testnet11", networkKind: "testnet" });
    await provider.initialize();
    const result = await provider.getNetwork();
    expect(result).toEqual({ success: true, data: "testnet" });
  });

  it("getAddress reads wallet.getSyncStatus().receive_address", async () => {
    const { provider } = providerWith({ receiveAddress: "xch1anotheraddress" });
    await provider.initialize();
    const result = await provider.getAddress();
    expect(result).toEqual({ success: true, data: { address: "xch1anotheraddress" } });
  });

  it("getAssetBalance is a pass-through of Sage's response shape", async () => {
    const { provider } = providerWith();
    await provider.initialize();
    const result = await provider.getAssetBalance("cat", "asset-id-1");
    expect(result).toEqual({
      success: true,
      data: { confirmed: "100000", spendable: "90000", spendableCoinCount: 2 },
    });
  });

  it("getAssetCoins maps snake_case fields and converts amounts to numbers", async () => {
    const { provider } = providerWith();
    await provider.initialize();
    const result = await provider.getAssetCoins(null, null);
    expect(result.success).toBe(true);
    expect(result.data?.[0].coin.amount).toBe(1000);
    expect(result.data?.[0].lineageProof).toEqual({
      parentName: "",
      innerPuzzleHash: "",
      amount: 0,
    });
  });

  it("getTransactions maps Sage's TransactionRecord height into transactionId", async () => {
    const { provider } = providerWith();
    await provider.initialize();
    const result = await provider.getTransactions();
    expect(result.success).toBe(true);
    expect(result.data?.[0]).toMatchObject({ transactionId: "555", height: 555 });
  });

  it("sendXch converts amount/fee to mojo strings and derives a transactionId", async () => {
    let seenParams: unknown;
    const { provider } = providerWith({ onSendXch: (params) => (seenParams = params) });
    await provider.initialize();

    const result = await provider.sendXch({
      walletId: 1,
      address: "xch1recipient",
      amount: 1_000_000_000_000,
      fee: 5,
      memos: ["hi"],
    });

    expect(seenParams).toMatchObject({
      address: "xch1recipient",
      amount: "1000000000000",
      fee: "5",
      memos: ["hi"],
    });
    expect(result.success).toBe(true);
    expect(result.data?.transactionId).toBe("0xspentcoin");
  });

  it("signCoinSpends assembles a SpendBundle from Sage's bare aggregated signature", async () => {
    let seenParams: unknown;
    const { provider } = providerWith({ onSignCoinSpends: (params) => (seenParams = params) });
    await provider.initialize();

    const coinSpends: CoinSpend[] = [
      {
        coin: { parent_coin_info: "0xparent", puzzle_hash: "0xpuzzle", amount: 42 },
        puzzle_reveal: "0xreveal",
        solution: "0xsolution",
      },
    ];

    const result = await provider.signCoinSpends({ walletId: 1, coinSpends, partialSign: true });

    expect(seenParams).toEqual({ coinSpends, partialSign: true });
    expect(result).toEqual({
      success: true,
      data: { coin_spends: coinSpends, aggregated_signature: "aggregated-signature-hex" },
    });
  });

  it("sendTransaction passes the spend bundle through and returns Sage's status/error", async () => {
    const { provider } = providerWith();
    await provider.initialize();

    const result = await provider.sendTransaction({
      spendBundle: { coin_spends: [], aggregated_signature: "sig" },
    });

    expect(result).toEqual({ success: true, data: { status: 1, error: null } });
  });

  describe("signMessage", () => {
    it("uses an explicit publicKey field when the caller supplies one", async () => {
      let seenParams: unknown;
      const { provider } = providerWith({ onSignMessage: (params) => (seenParams = params) });
      await provider.initialize();

      const result = await provider.signMessage({
        message: "hello",
        publicKey: "explicit-pk",
      } as Parameters<typeof provider.signMessage>[0]);

      expect(seenParams).toEqual({ message: "hello", publicKey: "explicit-pk" });
      // No address was given in the request; the response falls back to the
      // connected wallet's current receive address.
      expect(result).toEqual({
        success: true,
        data: {
          signature: "sig:explicit-pk:hello",
          message: "hello",
          address: "xch1testreceiveaddress",
        },
      });
    });

    it("resolves a public key for a known address via getDerivations", async () => {
      const { provider } = providerWith({ receiveAddress: "xch1knownaddress" });
      await provider.initialize();

      const result = await provider.signMessage({ message: "hi", address: "xch1knownaddress" });

      expect(result.success).toBe(true);
      expect(result.data?.signature).toBe("sig:pk-for-known-address:hi");
    });

    it("falls back to the active key's public key with no address or publicKey", async () => {
      const { provider, client } = providerWith();
      await provider.initialize();
      const { key } = await client.wallet.getKey({});

      const result = await provider.signMessage({ message: "hi" });

      expect(result.success).toBe(true);
      expect(result.data?.signature).toBe(`sig:${key?.public_key}:hi`);
    });

    it("reports invalid-request when no key can be resolved", async () => {
      const { provider } = providerWith({ key: null });
      await provider.initialize();

      const result = await provider.signMessage({ message: "hi" });

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("public key"),
        code: "invalid-request",
      });
    });
  });

  it("createOffer/takeOffer/cancelOffer report unsupported regardless of connection state", async () => {
    const { provider } = providerWith();
    await provider.initialize();

    const createResult = await provider.createOffer(
      {} as Parameters<typeof provider.createOffer>[0]
    );
    const takeResult = await provider.takeOffer({} as Parameters<typeof provider.takeOffer>[0]);
    const cancelResult = await provider.cancelOffer(
      {} as Parameters<typeof provider.cancelOffer>[0]
    );

    expect(createResult.code).toBe("unsupported");
    expect(takeResult.code).toBe("unsupported");
    expect(cancelResult.code).toBe("unsupported");
  });

  it("disconnect() always succeeds: there is no disconnect inside Sage", async () => {
    const { provider } = providerWith();
    await provider.initialize();
    expect(await provider.disconnect()).toEqual({ success: true });
  });

  it("ping() reports not-connected before initialize() and Sage's ok flag after", async () => {
    const { provider } = providerWith();
    expect(await provider.ping()).toEqual({
      success: false,
      error: "Sage bridge is not ready",
      code: "not-connected",
    });

    await provider.initialize();
    expect(await provider.ping()).toEqual({ success: true, data: true });
  });

  it("every query method reports not-connected before initialize()", async () => {
    const { provider } = providerWith();
    expect((await provider.getNetwork()).code).toBe("not-connected");
    expect((await provider.getAddress()).code).toBe("not-connected");
    expect((await provider.getAssetBalance()).code).toBe("not-connected");
    expect((await provider.getAssetCoins()).code).toBe("not-connected");
    expect((await provider.getPublicKeys()).code).toBe("not-connected");
    expect((await provider.getTransactions?.())?.code).toBe("not-connected");
  });
});
