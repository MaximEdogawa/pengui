import { describe, it, expect } from "bun:test";
import type SignClient from "@walletconnect/sign-client";
import type { SessionTypes } from "@walletconnect/types";
import type { WalletConnectSession } from "@/shared/lib/walletConnect/types/walletConnect.types";
import { DISCONNECTED_WALLET_STATE } from "../walletStateStore";
import {
  createWalletConnectProvider,
  INITIAL_WALLET_CONNECT_STATE,
  type WalletConnectBindings,
} from "./WalletConnectProvider";

const TOPIC = "topic-1";
const CHAIN_ID = "chia:mainnet";
const FINGERPRINT = 1234567890;

interface RecordedRequest {
  topic: string;
  chainId: string;
  method: string;
  params: Record<string, unknown>;
}

/**
 * Minimal SignClient stand-in: records every request and answers with a canned
 * result, so the adapter can be checked against the exact RPC names and
 * parameters the WalletConnect path used before the abstraction.
 */
function createFakeSignClient(result: unknown) {
  const requests: RecordedRequest[] = [];
  const activeSession = {
    topic: TOPIC,
    namespaces: { chia: { chains: [CHAIN_ID], accounts: [`${CHAIN_ID}:${FINGERPRINT}`] } },
  } as unknown as SessionTypes.Struct;

  const signClient = {
    session: { getAll: () => [activeSession] },
    request: async (args: {
      topic: string;
      chainId: string;
      request: { method: string; params: Record<string, unknown> };
    }) => {
      requests.push({
        topic: args.topic,
        chainId: args.chainId,
        method: args.request.method,
        params: args.request.params,
      });
      return result;
    },
    ping: async () => undefined,
  } as unknown as SignClient;

  return { signClient, requests, activeSession };
}

function connectedSession(session: SessionTypes.Struct): WalletConnectSession {
  return { session, chainId: CHAIN_ID, fingerprint: FINGERPRINT, topic: TOPIC, isConnected: true };
}

const DISCONNECTED_SESSION: WalletConnectSession = {
  session: null,
  chainId: CHAIN_ID,
  fingerprint: 0,
  topic: "",
  isConnected: false,
};

function providerWith(result: unknown) {
  const fake = createFakeSignClient(result);
  const bindings: WalletConnectBindings = {
    signClient: fake.signClient,
    session: connectedSession(fake.activeSession),
    network: "mainnet",
  };
  const provider = createWalletConnectProvider(() => bindings);
  return { provider, bindings, requests: fake.requests };
}

function disconnectedProvider() {
  return createWalletConnectProvider(() => ({
    signClient: undefined,
    session: DISCONNECTED_SESSION,
    network: "mainnet",
  }));
}

describe("createWalletConnectProvider", () => {
  it("reports the WalletConnect kind and full capabilities", () => {
    const { provider } = providerWith({});
    expect(provider.kind).toBe("walletconnect");
    expect(provider.getState()).toEqual(INITIAL_WALLET_CONNECT_STATE);
    expect(provider.getState().capabilities).toEqual({
      createOffer: true,
      takeOffer: true,
      cancelOffer: true,
      sendXch: true,
      signCoinSpends: true,
      signMessage: true,
      switchNetwork: true,
    });
  });

  it("publishes state to subscribers", () => {
    const { provider } = providerWith({});
    const seen: string[] = [];
    provider.subscribe((state) => seen.push(state.address ?? ""));

    provider.setState({
      ...INITIAL_WALLET_CONNECT_STATE,
      isConnected: true,
      isReady: true,
      address: "xch1abc",
    });

    expect(seen).toEqual(["xch1abc"]);
    expect(provider.getState().isConnected).toBe(true);
  });

  describe("RPC mapping", () => {
    it("asks for the address with chia_getAddress", async () => {
      const { provider, requests } = providerWith({ address: "xch1abc" });
      const result = await provider.getAddress();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ address: "xch1abc" });
      expect(requests[0].method).toBe("chia_getAddress");
      expect(requests[0].chainId).toBe(CHAIN_ID);
      expect(requests[0].params).toEqual({ fingerprint: FINGERPRINT });
    });

    it("asks for balances with chip0002_getAssetBalance and normalises the arguments", async () => {
      const balance = { confirmed: "10", spendable: "10", spendableCoinCount: 1 };
      const { provider, requests } = providerWith(balance);

      await provider.getAssetBalance();
      await provider.getAssetBalance("cat", "abc123");

      expect(requests[0].method).toBe("chip0002_getAssetBalance");
      expect(requests[0].params).toEqual({ fingerprint: FINGERPRINT, type: null, assetId: null });
      expect(requests[1].params).toEqual({
        fingerprint: FINGERPRINT,
        type: "cat",
        assetId: "abc123",
      });
    });

    it("asks for coins with chip0002_getAssetCoins", async () => {
      const { provider, requests } = providerWith([]);
      await provider.getAssetCoins("cat", "abc123");

      expect(requests[0].method).toBe("chip0002_getAssetCoins");
      expect(requests[0].params).toEqual({
        fingerprint: FINGERPRINT,
        type: "cat",
        assetId: "abc123",
      });
    });

    it("asks for public keys with chip0002_getPublicKeys", async () => {
      const { provider, requests } = providerWith(["pk"]);
      await provider.getPublicKeys({ limit: 5 });

      expect(requests[0].method).toBe("chip0002_getPublicKeys");
      expect(requests[0].params).toEqual({ fingerprint: FINGERPRINT, limit: 5 });
    });

    it("sends XCH with chia_send", async () => {
      const { provider, requests } = providerWith({ transactionId: "tx", transaction: {} });
      await provider.sendXch({ walletId: 1, amount: 5, fee: 0, address: "xch1abc" });

      expect(requests[0].method).toBe("chia_send");
      expect(requests[0].params).toEqual({
        fingerprint: FINGERPRINT,
        walletId: 1,
        amount: 5,
        fee: 0,
        address: "xch1abc",
      });
    });

    it("signs messages with chip0002_signMessage", async () => {
      const { provider, requests } = providerWith({
        signature: "sig",
        message: "hi",
        address: "xch1abc",
      });
      await provider.signMessage({ message: "hi" });

      expect(requests[0].method).toBe("chip0002_signMessage");
    });

    it("creates offers with chia_createOffer", async () => {
      const { provider, requests } = providerWith({ offer: "offer1", tradeId: "t", id: "t" });
      await provider.createOffer({ walletId: 1, offerAssets: [], requestAssets: [] });

      expect(requests[0].method).toBe("chia_createOffer");
    });

    /** The fee conversion and the offer trimming live in the repository; the
     * adapter must not duplicate or bypass them. */
    it("takes offers with chia_takeOffer, converting XCH fees to mojos", async () => {
      const { provider, requests } = providerWith({ tradeId: "t", success: true });
      await provider.takeOffer({ offer: "  offer1abc  ", feeInXch: 0.000001 });

      expect(requests[0].method).toBe("chia_takeOffer");
      expect(requests[0].params).toEqual({
        fingerprint: FINGERPRINT,
        offer: "offer1abc",
        fee: 1_000_000,
      });
    });

    it("rejects an empty offer before reaching the wallet", async () => {
      const { provider, requests } = providerWith({});
      const result = await provider.takeOffer({ offer: "   " });

      expect(result.success).toBe(false);
      expect(requests).toHaveLength(0);
    });

    it("cancels offers with chia_cancelOffer and maps id to tradeId", async () => {
      const { provider, requests } = providerWith({ success: true });
      await provider.cancelOffer({ id: "trade-1", feeInMojos: 10 });

      expect(requests[0].method).toBe("chia_cancelOffer");
      expect(requests[0].params).toEqual({
        fingerprint: FINGERPRINT,
        tradeId: "trade-1",
        fee: 10,
      });
    });

    it("broadcasts a signed bundle with chip0002_sendTransaction", async () => {
      const { provider, requests } = providerWith({ status: 1 });
      const spendBundle = { coin_spends: [], aggregated_signature: "0xsig" };
      await provider.sendTransaction({ spendBundle });

      expect(requests[0].method).toBe("chip0002_sendTransaction");
      expect(requests[0].params).toEqual({ fingerprint: FINGERPRINT, spendBundle });
    });
  });

  describe("signCoinSpends", () => {
    const coinSpends = [
      {
        coin: { parent_coin_info: "0xa", puzzle_hash: "0xb", amount: 1 },
        puzzle_reveal: "0xc",
        solution: "0xd",
      },
    ];

    it("uses chip0002_signCoinSpends and returns a complete spend bundle", async () => {
      const { provider, requests } = providerWith(coinSpends);
      const result = await provider.signCoinSpends({ walletId: 1, coinSpends });

      expect(requests[0].method).toBe("chip0002_signCoinSpends");
      expect(requests[0].params).toEqual({
        fingerprint: FINGERPRINT,
        walletId: 1,
        coinSpends,
      });
      expect(result.success).toBe(true);
      expect(result.data?.coin_spends).toEqual(coinSpends);
    });

    it("picks up an aggregated signature when the wallet returns one", async () => {
      const { provider } = providerWith({ aggregated_signature: "0xsig" });
      const result = await provider.signCoinSpends({ walletId: 1, coinSpends });

      expect(result.data?.aggregated_signature).toBe("0xsig");
      // Nothing was signed away: the request spends are kept in the bundle.
      expect(result.data?.coin_spends).toEqual(coinSpends);
    });
  });

  describe("when the wallet is not connected", () => {
    it("answers every operation with the not-connected code instead of throwing", async () => {
      const provider = disconnectedProvider();

      const results = await Promise.all([
        provider.getAddress(),
        provider.getAssetBalance(),
        provider.getAssetCoins(),
        provider.getPublicKeys(),
        provider.sendXch({ walletId: 1, amount: 1, fee: 0, address: "xch1abc" }),
        provider.signCoinSpends({ walletId: 1, coinSpends: [] }),
        provider.signMessage({ message: "hi" }),
        provider.createOffer({ walletId: 1, offerAssets: [], requestAssets: [] }),
        provider.takeOffer({ offer: "offer1abc" }),
        provider.cancelOffer({ id: "trade-1" }),
        provider.ping(),
      ]);

      for (const result of results) {
        expect(result.success).toBe(false);
        expect(result.code).toBe("not-connected");
      }
    });

    it("reports the app network preference from getNetwork", async () => {
      const provider = disconnectedProvider();
      const result = await provider.getNetwork();
      expect(result).toEqual({ success: true, data: "mainnet" });
    });
  });

  describe("ping", () => {
    it("succeeds while the session is alive", async () => {
      const { provider } = providerWith({});
      expect(await provider.ping({ timeoutMs: 50 })).toEqual({ success: true, data: true });
    });

    it("flags a session that vanished locally", async () => {
      const fake = createFakeSignClient({});
      const provider = createWalletConnectProvider(() => ({
        signClient: fake.signClient,
        session: { ...connectedSession(fake.activeSession), topic: "other-topic" },
        network: "mainnet",
      }));

      const result = await provider.ping({ timeoutMs: 50 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("session-missing");
    });
  });

  it("derives the network from the session chain id when connected", async () => {
    const fake = createFakeSignClient({});
    const provider = createWalletConnectProvider(() => ({
      signClient: fake.signClient,
      session: { ...connectedSession(fake.activeSession), chainId: "chia:testnet" },
      network: "mainnet",
    }));

    expect(await provider.getNetwork()).toEqual({ success: true, data: "testnet" });
  });

  it("starts from the shared disconnected state", () => {
    expect(INITIAL_WALLET_CONNECT_STATE.isConnected).toBe(DISCONNECTED_WALLET_STATE.isConnected);
    expect(INITIAL_WALLET_CONNECT_STATE.isReady).toBe(false);
    expect(INITIAL_WALLET_CONNECT_STATE.kind).toBe("walletconnect");
  });
});
