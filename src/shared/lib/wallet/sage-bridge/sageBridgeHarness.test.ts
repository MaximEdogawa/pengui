import { afterEach, describe, expect, it } from "bun:test";
import { getSageClient, hasSageBridge, isSageRuntimeAvailable } from "sage-app-sdk";
import { installMockSageBridge, type MockSageBridgeHandle } from "@/test-utils/mocks/sageBridge";
import { detectWalletRuntime, isSageRuntime } from "../detectWalletRuntime";
import type { CoinSpend } from "../types";
import { createSageBridgeProvider } from "./SageBridgeProvider";

/**
 * Drives the real adapter through the real `sage-app-sdk` entry point
 * (`getSageClient()` → `window.__SAGE__`) against the mock Sage host from
 * `src/test-utils/mocks/sageBridge.ts`. Unlike `SageBridgeProvider.test.ts`,
 * which injects a client through `deps.getClient`, nothing here bypasses the
 * SDK: this is the closest a unit test gets to "inside Sage" without a Sage
 * build (TASK-001.05 AC #1, #2).
 */

let sage: MockSageBridgeHandle | null = null;

function install(...args: Parameters<typeof installMockSageBridge>): MockSageBridgeHandle {
  sage = installMockSageBridge(...args);
  return sage;
}

afterEach(() => {
  sage?.uninstall();
  sage = null;
});

/** Poll until `check` passes; the adapter's event handlers refresh state without awaiting. */
async function settle(check: () => boolean, ticks = 100): Promise<void> {
  for (const _tick of Array.from({ length: ticks })) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

const BASELINE_WITH_SIGNING = [
  "app.get_capabilities",
  "app.request_capability_grant",
  "environment.get_network",
  "wallet.get_key",
  "wallet.get_sync_status",
  "wallet.get_asset_balance",
  "wallet.get_asset_coins",
  "wallet.send_xch",
  "wallet.sign_coin_spends",
  "wallet.sign_message",
  "wallet.send_transaction",
];

describe("mock Sage bridge: runtime detection", () => {
  it("flips detectWalletRuntime() and the SDK probes while installed", () => {
    expect(detectWalletRuntime()).toBe("walletconnect");
    expect(hasSageBridge()).toBe(false);
    expect(isSageRuntimeAvailable()).toBe(false);

    const handle = install();
    expect(detectWalletRuntime()).toBe("sage-bridge");
    expect(isSageRuntime()).toBe(true);
    expect(hasSageBridge()).toBe(true);
    expect(isSageRuntimeAvailable()).toBe(true);

    handle.uninstall();
    sage = null;
    expect(detectWalletRuntime()).toBe("walletconnect");
    expect(hasSageBridge()).toBe(false);
  });

  it("is what sage-app-sdk's getSageClient() resolves to, without initSageRuntimeBridge()", async () => {
    const handle = install();
    const client = await getSageClient();
    expect(client).toBe(handle.client);
    // No Tauri invoke happened: the SDK never had to create a bridge runtime core.
    expect(handle.calls.map((call) => call.method)).not.toContain("app.bridgeSend");
  });

  it("refuses raw Tauri invokes, like Sage's app webview ACL does", async () => {
    install();
    const tauri = (globalThis as { __TAURI__?: { core: { invoke: (c: string) => Promise<unknown> } } })
      .__TAURI__;
    await expect(tauri!.core.invoke("get_keys")).rejects.toThrow(/not allowed/);
  });
});

describe("SageBridgeProvider through sage-app-sdk against the mock host", () => {
  it("initialize() resolves the client via the SDK and reads identity, address and network", async () => {
    const handle = install({ networkId: "testnet11", key: { fingerprint: 4242, name: "Test" } });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    expect(provider.getSageClient()).toBe(handle.client);
    const state = provider.getState();
    expect(state).toMatchObject({
      kind: "sage-bridge",
      isConnected: true,
      isReady: true,
      fingerprint: 4242,
      walletName: "Test",
      network: "testnet",
    });
    expect(state.address).toMatch(/^xch1/);
    expect(handle.callsTo("app.getCapabilities")).toHaveLength(1);
    expect(handle.callsTo("environment.getNetwork")).toHaveLength(1);
  });

  it.each([
    ["mainnet", "mainnet"],
    ["testnet11", "testnet"],
    ["testnet-custom", "testnet"],
    ["simulator0", "mainnet"],
  ])("maps Sage network id %s to Pengui network %s", async (networkId, expected) => {
    install({ networkId });
    const provider = createSageBridgeProvider();
    await provider.initialize();
    expect(provider.getState().network).toBe(expected);
    expect(await provider.getNetwork()).toEqual({ success: true, data: expected });
  });

  it("connect() requests every missing capability one by one and reflects the grants", async () => {
    const handle = install();
    const provider = createSageBridgeProvider();
    const result = await provider.connect();

    expect(result.success).toBe(true);
    const requested = handle
      .callsTo("app.requestCapabilityGrant")
      .map((params) => (params as { capability: string }).capability);
    expect(requested).toContain("wallet.send_xch");
    expect(requested).toContain("wallet.sign_coin_spends");
    expect(requested).not.toContain("wallet.get_key"); // already granted, not re-requested
    expect(provider.getState().capabilities).toEqual({
      createOffer: true,
      takeOffer: true,
      cancelOffer: true,
      sendXch: true,
      signCoinSpends: true,
      signMessage: true,
      switchNetwork: false,
    });
  });

  it("a grant the user declines leaves the capability off and the call failing with Sage's error", async () => {
    install({ grantable: [] });
    const provider = createSageBridgeProvider();
    await provider.connect();

    expect(provider.getState().capabilities.sendXch).toBe(false);
    const result = await provider.sendXch({ walletId: 1, address: "xch1recipient", amount: 1, fee: 0 });
    expect(result.success).toBe(false);
    expect(result.code).toBe("request-failed");
    expect(result.error).toContain("wallet.send_xch is not granted");
  });

  it("a grant dialog the user rejects does not break connect()", async () => {
    install({ approvals: { capabilityGrant: "reject" } });
    const provider = createSageBridgeProvider();
    const result = await provider.connect();

    expect(result.success).toBe(true);
    expect(provider.getState().isConnected).toBe(true);
    expect(provider.getState().capabilities.signCoinSpends).toBe(false);
  });

  it("connect() fails with a diagnostic when the host has neither a key nor a synced address", async () => {
    install({ key: null, receiveAddress: null, grantable: [] });
    const provider = createSageBridgeProvider();
    const result = await provider.connect();

    expect(result.success).toBe(false);
    expect(result.code).toBe("not-connected");
    expect(result.error).toContain("no wallet identity");
    expect(result.error).toContain("Granted:");
  });

  it("sendXch sends amount and fee to Sage as mojo strings and derives the transaction id", async () => {
    const handle = install({ capabilities: BASELINE_WITH_SIGNING });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    const result = await provider.sendXch({
      walletId: 1,
      address: "xch1recipient",
      amount: 1_500_000_000_000.7,
      fee: 42.9,
      memos: ["memo"],
    });

    expect(handle.callsTo("wallet.sendXch")).toEqual([
      { address: "xch1recipient", amount: "1500000000000", fee: "42", memos: ["memo"], clawback: undefined },
    ]);
    expect(result.success).toBe(true);
    expect(result.data?.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("signCoinSpends assembles a spend bundle from the aggregated signature Sage returns", async () => {
    const handle = install({
      capabilities: BASELINE_WITH_SIGNING,
      aggregatedSignature: `0x${"ab".repeat(96)}`,
    });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    const coinSpends: CoinSpend[] = [
      {
        coin: { parent_coin_info: `0x${"11".repeat(32)}`, puzzle_hash: `0x${"22".repeat(32)}`, amount: 7 },
        puzzle_reveal: "0xff",
        solution: "0x80",
      },
    ];
    const result = await provider.signCoinSpends({ walletId: 1, coinSpends, partialSign: true });

    expect(handle.callsTo("wallet.signCoinSpends")).toEqual([{ coinSpends, partialSign: true }]);
    expect(result).toEqual({
      success: true,
      data: { coin_spends: coinSpends, aggregated_signature: `0x${"ab".repeat(96)}` },
    });

    const sent = await provider.sendTransaction({ spendBundle: result.data! });
    expect(sent).toEqual({ success: true, data: { status: 1, error: null } });
    expect(handle.callsTo("wallet.sendTransaction")).toEqual([{ spendBundle: result.data }]);
  });

  it("a rejected approval surfaces as request-failed with Sage's error text", async () => {
    install({
      capabilities: BASELINE_WITH_SIGNING,
      approvals: { sendXch: "reject", signCoinSpends: "reject" },
      rejectionMessage: "User denied the transaction",
    });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    const sendResult = await provider.sendXch({ walletId: 1, address: "xch1r", amount: 1, fee: 0 });
    expect(sendResult).toEqual({
      success: false,
      error: "User denied the transaction",
      code: "request-failed",
    });

    const signResult = await provider.signCoinSpends({ walletId: 1, coinSpends: [] });
    expect(signResult.code).toBe("request-failed");
    expect(signResult.error).toBe("User denied the transaction");
  });

  it("an approval that times out surfaces the SDK's timeout error", async () => {
    install({
      capabilities: BASELINE_WITH_SIGNING,
      approvals: { signMessage: "timeout" },
      approvalTimeoutMs: 5,
    });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    const result = await provider.signMessage({ message: "hi", publicKey: "pk" } as Parameters<
      typeof provider.signMessage
    >[0]);
    expect(result).toEqual({
      success: false,
      error: "timeout for wallet.signMessage",
      code: "request-failed",
    });
  });

  it("an approval that never settles is bounded by the caller's own timeout (ping)", async () => {
    const handle = install({ approvalTimeoutMs: null });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    // ping is not approval-gated; make the mock hang by replacing it on the installed client.
    handle.client.app.bridgePing = () => new Promise(() => {});
    const result = await provider.ping({ timeoutMs: 5 });
    expect(result).toEqual({
      success: false,
      error: "Sage bridge call timed out",
      code: "request-failed",
    });
  });

  it("offer capabilities are gated on sign_coin_spends / get_asset_coins / send_transaction", async () => {
    const handle = install({ grantable: [] });
    const provider = createSageBridgeProvider();
    await provider.connect();

    expect(provider.getState().capabilities).toMatchObject({
      createOffer: false,
      takeOffer: false,
      cancelOffer: false,
    });
    const create = await provider.createOffer({ walletId: 1, offerAssets: [], requestAssets: [] });
    expect(create.code).toBe("unsupported");
    expect(create.error).toContain("wallet.sign_coin_spends");

    // The host grants signing later (Sage settings): only maker-side offers open up.
    handle.grantCapabilities("wallet.sign_coin_spends");
    await settle(() => provider.getState().capabilities.createOffer);
    expect(provider.getState().capabilities).toMatchObject({
      createOffer: true,
      takeOffer: false,
      cancelOffer: false,
    });
    const take = await provider.takeOffer({ offer: "offer1qqq" });
    expect(take.code).toBe("unsupported");
    expect(take.error).toContain("wallet.send_transaction");

    handle.grantCapabilities("wallet.send_transaction");
    await settle(() => provider.getState().capabilities.takeOffer);
    expect(provider.getState().capabilities).toMatchObject({ takeOffer: true, cancelOffer: true });

    // And a revocation closes them again.
    handle.revokeCapabilities("wallet.sign_coin_spends");
    await settle(() => !provider.getState().capabilities.createOffer);
    expect(provider.getState().capabilities).toMatchObject({
      createOffer: false,
      takeOffer: false,
      cancelOffer: false,
    });
  });

  it("switching wallets in Sage refreshes fingerprint and name through the SDK event re-dispatch", async () => {
    const handle = install();
    const provider = createSageBridgeProvider();
    await provider.initialize();
    expect(provider.getState().fingerprint).toBe(987654321);

    handle.selectWallet({ fingerprint: 1111, name: "Cold storage" });
    await settle(() => provider.getState().fingerprint === 1111);
    expect(provider.getState().walletName).toBe("Cold storage");
  });

  it("registers a lifecycle.onBeforeStop handler the host can await", async () => {
    const handle = install();
    const provider = createSageBridgeProvider();
    expect(handle.beforeStopHandlerCount()).toBe(0);
    await provider.initialize();
    expect(handle.beforeStopHandlerCount()).toBe(1);
    await expect(handle.emitBeforeStop()).resolves.toBeUndefined();
  });

  it("balances, coins and history come from the scripted asset data", async () => {
    const catId = "a".repeat(64);
    install({
      capabilities: [...BASELINE_WITH_SIGNING, "wallet.get_transactions"],
      assets: [
        {
          coins: [
            { ...structuredClone(MOCK_XCH), coin: { ...MOCK_XCH.coin, amount: "5000" } },
            { ...structuredClone(MOCK_XCH), coinName: "0xlocked", locked: true },
          ],
        },
        {
          type: "cat",
          assetId: catId,
          balance: { confirmed: "12345", spendable: "12000", spendableCoinCount: 3 },
          coins: [{ ...structuredClone(MOCK_XCH), coin: { ...MOCK_XCH.coin, amount: 12_000 } }],
        },
      ],
      transactions: [
        { height: 10, timestamp: 1_000, spent: [], created: [] },
        { height: 30, timestamp: 3_000, spent: [], created: [] },
        { height: 20, timestamp: 2_000, spent: [], created: [] },
      ],
    });
    const provider = createSageBridgeProvider();
    await provider.initialize();

    const xchBalance = await provider.getAssetBalance();
    expect(xchBalance.data).toEqual({
      confirmed: "1000000005000",
      spendable: "5000",
      spendableCoinCount: 1,
    });
    const catBalance = await provider.getAssetBalance("cat", catId);
    expect(catBalance.data).toEqual({ confirmed: "12345", spendable: "12000", spendableCoinCount: 3 });
    expect((await provider.getAssetBalance("cat", "unknown")).data).toEqual({
      confirmed: "0",
      spendable: "0",
      spendableCoinCount: 0,
    });

    const xchCoins = await provider.getAssetCoins();
    expect(xchCoins.data).toHaveLength(1); // the locked coin is hidden by default
    expect(xchCoins.data?.[0].coin.amount).toBe(5000);
    const catCoins = await provider.getAssetCoins("cat", catId);
    expect(catCoins.data?.[0].coin.amount).toBe(12_000);

    const history = await provider.getTransactions({ limit: 2 });
    expect(history.data?.map((record) => record.transactionId)).toEqual(["30", "20"]);
    const ascending = await provider.getTransactions({ ascending: true, limit: 1 });
    expect(ascending.data?.map((record) => record.transactionId)).toEqual(["10"]);
  });
});

const MOCK_XCH = {
  coin: {
    parent_coin_info: `0x${"01".repeat(32)}`,
    puzzle_hash: `0x${"02".repeat(32)}`,
    amount: "1000000000000",
  },
  coinName: `0x${"03".repeat(32)}`,
  puzzle: `0x${"04".repeat(16)}`,
  confirmedBlockIndex: 4_200_000,
  locked: false,
  lineageProof: null,
};
