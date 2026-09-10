import { describe, it, expect } from "bun:test";
import type { SessionTypes } from "@walletconnect/types";
import { buildWalletConnectSession, resolveWalletConnectFingerprint } from "./session";

function sessionWith(chains: string[] | undefined, accounts: string[] | undefined) {
  return {
    topic: "topic-1",
    namespaces: {
      chia: {
        ...(chains ? { chains } : {}),
        ...(accounts ? { accounts } : {}),
        methods: [],
        events: [],
      },
    },
  } as unknown as SessionTypes.Struct;
}

const MAINNET = "chia:mainnet";
const TESTNET = "chia:testnet";

describe("buildWalletConnectSession", () => {
  it("returns a disconnected descriptor when the wallet is not connected", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith([MAINNET], [`${MAINNET}:123`]),
      selectedSession: null,
      fingerprintMap: undefined,
      isConnected: false,
      defaultChainId: MAINNET,
    });

    expect(result).toEqual({
      session: null,
      chainId: MAINNET,
      fingerprint: 0,
      topic: "",
      isConnected: false,
    });
  });

  it("prefers the app chain id when the session supports it", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith([TESTNET, MAINNET], [`${MAINNET}:987`]),
      selectedSession: null,
      fingerprintMap: undefined,
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.chainId).toBe(MAINNET);
  });

  /**
   * Critical: the wallet rejects requests for a chain it did not approve, so a
   * mismatch has to fall back to the session's own chain, never to the app's.
   */
  it("falls back to the session chain when the app network is not supported", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith([TESTNET], [`${TESTNET}:987`]),
      selectedSession: null,
      fingerprintMap: undefined,
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.chainId).toBe(TESTNET);
  });

  it("derives the chain id from the accounts when chains is empty", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith(undefined, ["chia:chia:testnet:42"]),
      selectedSession: null,
      fingerprintMap: undefined,
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.chainId).toBe(TESTNET);
    expect(result.fingerprint).toBe(42);
  });

  it("reads the fingerprint from a three-part account string", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith([MAINNET], [`${MAINNET}:1234567890`]),
      selectedSession: null,
      fingerprintMap: undefined,
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.fingerprint).toBe(1234567890);
    expect(result.topic).toBe("topic-1");
    expect(result.isConnected).toBe(true);
  });

  it("falls back to the redux fingerprint map when there are no accounts", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith([MAINNET], undefined),
      selectedSession: null,
      fingerprintMap: { "topic-1": 555 },
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.fingerprint).toBe(555);
  });

  it("uses the redux session when the library hook has none", () => {
    const stored = sessionWith([MAINNET], [`${MAINNET}:7`]);
    const result = buildWalletConnectSession({
      walletConnectSession: null,
      selectedSession: stored,
      fingerprintMap: undefined,
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.session).toBe(stored);
    expect(result.fingerprint).toBe(7);
  });

  it("treats an unparseable fingerprint as zero", () => {
    const result = buildWalletConnectSession({
      walletConnectSession: sessionWith([MAINNET], ["chia:mainnet:not-a-number"]),
      selectedSession: null,
      fingerprintMap: undefined,
      isConnected: true,
      defaultChainId: MAINNET,
    });

    expect(result.fingerprint).toBe(0);
  });
});

describe("resolveWalletConnectFingerprint", () => {
  it("prefers the redux fingerprint map", () => {
    const session = sessionWith([MAINNET], [`${MAINNET}:1`]);
    expect(resolveWalletConnectFingerprint(session, { "topic-1": 99 })).toBe("99");
  });

  it("falls back to the account string", () => {
    const session = sessionWith([MAINNET], [`${MAINNET}:1234`]);
    expect(resolveWalletConnectFingerprint(session, {})).toBe("1234");
  });

  it("returns null without a session", () => {
    expect(resolveWalletConnectFingerprint(null, undefined)).toBeNull();
  });
});
