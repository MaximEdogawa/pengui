"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import {
  WalletConnect,
  store,
  setPairingUri,
  connectSession as connectSessionAction,
  setConnectedWallet,
  setSelectedFingerprint,
  useWalletConnectionState,
} from "@maximedogawa/chia-wallet-connect-react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useThemeClasses } from "@/shared/hooks";
import {
  getStoredNetwork,
  hasNetworkPreference,
  setStoredNetwork,
} from "@/shared/lib/utils/networkStorage";
import { networkToChainId } from "@/shared/lib/utils/networkUtils";
import { getRequiredNamespaces } from "@/shared/lib/walletConnect/constants/wallet-connect";
import { disconnectWallet } from "@/shared/lib/walletConnect/disconnectWallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ConnectWalletModal } from "./ConnectWalletModal";
import toast from "react-hot-toast";
import type { SessionTypes } from "@walletconnect/types";

/**
 * SafeConnectButton
 *
 * NetworkPicker-styled wallet button for the dashboard header.
 * - Not connected: compact "Connect" pill → opens custom QR modal
 * - Connected: shows shortened address → DropdownMenu with disconnect/reconnect
 */
export function SafeConnectButton() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();
  const { isDark } = useThemeClasses();

  const { isConnected, address, walletName } = useWalletConnectionState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── validation ─────────────────────────────────────────

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (!hasNetworkPreference()) setStoredNetwork("mainnet");

      const currentNetwork = getStoredNetwork();
      const chainId = networkToChainId(currentNetwork);
      const ns = getRequiredNamespaces(currentNetwork);

      if (ns.chia.chains[0] !== chainId) return;

      setIsReady(true);
    } catch {
      /* silently ignore */
    }
  }, [network]);

  // ── config helper ──────────────────────────────────────

  const getConfig = useCallback(() => {
    const penguiIcon =
      typeof window !== "undefined"
        ? `${window.location.origin}/pengui-logo.png`
        : "/pengui-logo.png";
    return {
      penguiIcon,
      metadata: {
        name: "Pengui",
        description: "Pengui - Decentralized lending platform on Chia Network",
        url: typeof window !== "undefined" ? window.location.origin : "https://pengui.space",
        icons: [penguiIcon],
      },
    };
  }, []);

  // ── session processing ─────────────────────────────────

  const processSession = useCallback(
    async (session: SessionTypes.Struct, wc: InstanceType<typeof WalletConnect>) => {
      store.dispatch(setPairingUri(null));
      setUri(null);

      await wc.detectEvents();
      await wc.updateSessions();
      store.dispatch(connectSessionAction(session));

      const fp = Number(session.namespaces.chia.accounts[0].split(":")[2]);
      store.dispatch(setSelectedFingerprint({ topic: session.topic, selectedFingerprint: fp }));

      wc.topic = session.topic;
      wc.session = session;
      wc.selectedFingerprint = fp;

      let addr: string | null = null;
      try {
        addr = await wc.verifyConnectionWithSageMethod();
        if (!addr) addr = await wc.getAddress();
      } catch {
        try {
          addr = await wc.getAddress();
        } catch {
          /* ok */
        }
      }

      store.dispatch(
        setConnectedWallet({ wallet: "WalletConnect", address: addr, name: "WalletConnect" })
      );

      toast.success("Wallet connected!");
      setIsModalOpen(false);
    },
    []
  );

  // ── initiate connection ────────────────────────────────

  const initConnection = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsInitializing(true);
    setError(null);
    setUri(null);

    try {
      if (!hasNetworkPreference()) setStoredNetwork("mainnet");

      const { penguiIcon, metadata } = getConfig();
      const wc = new WalletConnect(penguiIcon, metadata);
      const signClient = await wc.signClient();

      if (!signClient || !mountedRef.current) {
        setIsInitializing(false);
        return;
      }

      const net = getStoredNetwork();
      const ns = getRequiredNamespaces(net);
      const { uri: pairingUri, approval } = await signClient.connect({ optionalNamespaces: ns });

      if (!mountedRef.current) return;
      if (pairingUri) {
        setUri(pairingUri);
        store.dispatch(setPairingUri(pairingUri));
      }
      setIsInitializing(false);

      if (approval) {
        try {
          const session = await approval();
          if (!mountedRef.current) return;
          await processSession(session, wc);
        } catch {
          if (mountedRef.current) {
            setError("Connection was rejected in the wallet");
          }
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Connection failed");
        setIsInitializing(false);
      }
    }
  }, [getConfig, processSession]);

  // ── disconnect ─────────────────────────────────────────

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      queryClient.invalidateQueries({ queryKey: ["walletConnect"] });
      toast.success("Wallet disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  }, [queryClient]);

  // ── reconnect ──────────────────────────────────────────

  const handleReconnect = useCallback(async () => {
    try {
      const { penguiIcon, metadata } = getConfig();
      const wc = new WalletConnect(penguiIcon, metadata);

      const state = store.getState();
      const sessions = state.walletConnect?.sessions ?? [];
      for (const s of sessions) {
        try {
          await wc.disconnectSession(s.topic);
        } catch {
          /* ok */
        }
      }

      store.dispatch(setConnectedWallet(null));
      store.dispatch(connectSessionAction(null));
      toast.success("Redirecting to login. Reconnect your wallet there.");
    } catch {
      toast.error("Failed to disconnect");
    }
  }, [getConfig]);

  // ── clipboard ──────────────────────────────────────────

  const copyUri = async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = uri;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── open modal for new connection ──────────────────────

  const openConnectModal = () => {
    setIsModalOpen(true);
    if (!uri && !isInitializing) initConnection();
  };

  // ── close modal on connect ─────────────────────────────

  useEffect(() => {
    if (isConnected && isModalOpen) setIsModalOpen(false);
  }, [isConnected, isModalOpen]);

  if (!isReady) return null;

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  const buttonClasses = cn(
    "relative flex items-center gap-1.5 px-2 py-1 rounded-lg",
    "backdrop-blur-[40px] transition-all duration-200",
    "hover:scale-[1.02] active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/30",
    isDark
      ? "bg-white/10 border border-white/20 text-white shadow-lg shadow-black/20"
      : "bg-white/60 border border-white/70 text-slate-800 shadow-lg shadow-black/10"
  );

  // ── render ─────────────────────────────────────────────

  return (
    <>
      {isConnected ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={buttonClasses} aria-label="Manage wallet">
              <Wallet className="w-3 h-3" />
              <span className="text-[10px] font-medium tracking-tight max-w-[80px] truncate">
                {shortAddress ?? walletName ?? "Connected"}
              </span>
              <ChevronDown className="w-2.5 h-2.5 transition-transform duration-200" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className={cn(
              "min-w-[160px] rounded-xl backdrop-blur-xl p-0.5",
              isDark ? "bg-slate-900/95 border-white/25" : "bg-white/95 border-slate-200/90"
            )}
            style={{ zIndex: 10001 }}
          >
            <DropdownMenuLabel className="px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <Wallet
                  className={cn("w-3.5 h-3.5", isDark ? "text-white/70" : "text-slate-600")}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isDark ? "text-white/70" : "text-slate-600"
                  )}
                >
                  {shortAddress ?? "Connected"}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className={isDark ? "bg-white/10" : "bg-black/5"} />

            <DropdownMenuItem
              onSelect={handleReconnect}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 cursor-pointer",
                isDark
                  ? "text-cyan-400/90 focus:bg-cyan-500/10 focus:text-cyan-400"
                  : "text-cyan-600 focus:bg-cyan-500/10 focus:text-cyan-700"
              )}
            >
              <RefreshCw className="w-3 h-3" />
              <span className="text-[10px] font-medium tracking-tight">Reconnect</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={handleDisconnect}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 cursor-pointer",
                isDark
                  ? "text-red-400/80 focus:bg-red-500/10 focus:text-red-400"
                  : "text-red-500/80 focus:bg-red-500/10 focus:text-red-600"
              )}
            >
              <LogOut className="w-3 h-3" />
              <span className="text-[10px] font-medium tracking-tight">Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          type="button"
          onClick={openConnectModal}
          className={buttonClasses}
          aria-label="Connect wallet"
        >
          <Wallet className="w-3 h-3" />
          <span className="text-[10px] font-medium tracking-tight">Connect</span>
        </button>
      )}

      {/* ── Custom QR Modal ── */}
      {isModalOpen && (
        <ConnectWalletModal
          uri={uri}
          isInitializing={isInitializing}
          error={error}
          copied={copied}
          onClose={() => setIsModalOpen(false)}
          onCopy={copyUri}
          onRetry={() => initConnection()}
        />
      )}
    </>
  );
}
