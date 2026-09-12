"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import { useNetwork } from "@/shared/hooks/useNetwork";
import {
  useThemeClasses,
  useWalletProvider,
  useWalletRuntimeKind,
  useWalletState,
} from "@/shared/hooks";
import type { SageBridgeWalletProvider } from "@/shared/lib/wallet/sage-bridge/SageBridgeProvider";
import {
  connectWalletConnect,
  resetWalletConnectSessions,
} from "@/shared/lib/wallet/walletconnect/connectWalletConnect";
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

/**
 * SafeConnectButton
 *
 * NetworkPicker-styled wallet button for the dashboard header.
 * - WalletConnect, not connected: compact "Connect" pill → opens custom QR modal
 * - WalletConnect, connected: shows shortened address → DropdownMenu with disconnect/reconnect
 * - Sage: shows fingerprint/address → DropdownMenu with a permissions entry;
 *   there is no WalletConnect-style disconnect inside Sage (the wallet is the host).
 */
export function SafeConnectButton() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();
  const { isDark } = useThemeClasses();
  const runtimeKind = useWalletRuntimeKind();
  const isSage = runtimeKind === "sage-bridge";
  const provider = useWalletProvider();

  const { isConnected, address, walletName, fingerprint } = useWalletState();

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

  // ── initiate connection ────────────────────────────────

  const initConnection = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsInitializing(true);
    setError(null);
    setUri(null);

    const outcome = await connectWalletConnect({
      isActive: () => mountedRef.current,
      onPairingUri: (pairingUri) => setUri(pairingUri),
      onPairingReady: () => setIsInitializing(false),
    });

    if (!mountedRef.current) return;

    switch (outcome.status) {
      case "connected":
        toast.success("Wallet connected!");
        setIsModalOpen(false);
        break;
      case "rejected":
        setError("Connection was rejected in the wallet");
        break;
      case "unavailable":
        setIsInitializing(false);
        break;
      case "failed":
        setError(outcome.error);
        setIsInitializing(false);
        break;
      case "cancelled":
        break;
    }
  }, []);

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
      await resetWalletConnectSessions();
      toast.success("Redirecting to login. Reconnect your wallet there.");
    } catch {
      toast.error("Failed to disconnect");
    }
  }, []);

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

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  const buttonClasses = cn(
    "tap-target relative flex items-center gap-1.5 px-2 py-1 rounded-lg",
    "backdrop-blur-[40px] transition-all duration-200",
    "hover:scale-[1.02] active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/30",
    isDark
      ? "bg-white/10 border border-white/20 text-white shadow-lg shadow-black/20"
      : "bg-white/60 border border-white/70 text-slate-800 shadow-lg shadow-black/10"
  );

  // ── Sage: fingerprint/address + a permissions entry, no disconnect ─────
  // Rendered before the WalletConnect-only `isReady` gate below, which
  // checks a WalletConnect CAIP namespace that has no Sage equivalent.
  if (isSage) {
    const handleManagePermissions = async () => {
      const result = await provider.connect();
      if (result.success) {
        const granted = (provider as SageBridgeWalletProvider).getGrantedCapabilities?.();
        toast.success(
          granted ? `Permissions refreshed (${granted.length} granted)` : "Permissions refreshed"
        );
      } else {
        toast.error(result.error ?? "Could not refresh permissions");
      }
    };

    if (!isConnected) {
      return (
        <button
          type="button"
          onClick={handleManagePermissions}
          className={buttonClasses}
          aria-label="Connect wallet"
        >
          <Wallet className="w-3 h-3" />
          <span className="text-[10px] font-medium tracking-tight">Connect</span>
        </button>
      );
    }

    return (
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
            "min-w-[180px] rounded-xl backdrop-blur-xl p-0.5",
            isDark ? "bg-slate-900/95 border-white/25" : "bg-white/95 border-slate-200/90"
          )}
          style={{ zIndex: 10001 }}
        >
          <DropdownMenuLabel className="px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Wallet className={cn("w-3.5 h-3.5", isDark ? "text-white/70" : "text-slate-600")} />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isDark ? "text-white/70" : "text-slate-600"
                )}
              >
                {shortAddress ?? "Connected"}
              </span>
            </div>
            {fingerprint != null && (
              <div
                className={cn(
                  "text-[9px] pl-5 pt-0.5",
                  isDark ? "text-white/40" : "text-slate-500"
                )}
              >
                Fingerprint {fingerprint}
              </div>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator className={isDark ? "bg-white/10" : "bg-black/5"} />

          <DropdownMenuItem
            onSelect={handleManagePermissions}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 cursor-pointer",
              isDark
                ? "text-cyan-400/90 focus:bg-cyan-500/10 focus:text-cyan-400"
                : "text-cyan-600 focus:bg-cyan-500/10 focus:text-cyan-700"
            )}
          >
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[10px] font-medium tracking-tight">Permissions</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!isReady) return null;

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
