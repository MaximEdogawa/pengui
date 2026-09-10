"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Wallet } from "lucide-react";
import { useWalletState } from "@/shared/hooks";
import { connectWalletConnect } from "@/shared/lib/wallet/walletconnect/connectWalletConnect";
import toast from "react-hot-toast";
import { ConnectWalletModal } from "@/shared/ui/wallet-connect-wrapper/ConnectWalletModal";

/**
 * LoginConnectWallet
 *
 * Renders a stylish "Connect Wallet" button on the login page.
 * Pre-fetches the WalletConnect pairing URI on mount so that
 * clicking the button instantly opens a custom modal with QR + copy URI.
 * Same experience on desktop and mobile — no native WC modal.
 */
export function LoginConnectWallet() {
  const [uri, setUri] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { isConnected } = useWalletState();
  const mountedRef = useRef(true);
  const initRef = useRef(false);

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

  useEffect(() => {
    mountedRef.current = true;
    if (!isConnected && !initRef.current) {
      initRef.current = true;
      initConnection();
    } else if (isConnected) {
      setIsInitializing(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isConnected) setIsModalOpen(false);
  }, [isConnected]);

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

  const handleRetry = () => {
    initRef.current = false;
    initConnection();
  };

  if (isConnected) {
    return (
      <div className="flex items-center justify-center py-6 w-full">
        <div className="flex items-center gap-2 text-sm text-cyan-300/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connected — redirecting…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── Connect Wallet Button ─── */}
      <button
        onClick={() => {
          if (error) handleRetry();
          setIsModalOpen(true);
        }}
        disabled={isInitializing && !uri}
        className="group relative w-full max-w-xs mx-auto overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.98] touch-manipulation"
      >
        {/* animated gradient border */}
        <span
          className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_var(--angle),rgb(34_211_238)_0%,rgb(56_189_248)_25%,rgb(14_165_233)_50%,rgb(2_132_199)_75%,rgb(34_211_238)_100%)] p-[1.5px] opacity-60 group-hover:opacity-90 transition-opacity duration-300 animate-[spin_4s_linear_infinite]"
          style={{ "--angle": "0deg" } as React.CSSProperties}
        >
          <span className="block h-full w-full rounded-2xl bg-slate-950" />
        </span>

        {/* button surface */}
        <span className="relative flex items-center justify-center gap-2.5 px-6 py-4 sm:py-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 group-hover:from-slate-900 group-hover:via-slate-800 group-hover:to-slate-900 transition-all duration-300">
          {isInitializing && !uri ? (
            <Loader2 className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-cyan-400/60 animate-spin" />
          ) : (
            <Wallet className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-cyan-400 group-hover:text-cyan-300 transition-colors duration-200" />
          )}
          <span className="text-[15px] sm:text-[15px] font-semibold tracking-wide bg-gradient-to-r from-cyan-200 via-sky-100 to-cyan-200 bg-clip-text text-transparent group-hover:from-white group-hover:via-cyan-100 group-hover:to-white transition-all duration-200">
            Connect Wallet
          </span>
        </span>
      </button>

      {/* ─── QR Modal ─── */}
      {isModalOpen && (
        <ConnectWalletModal
          uri={uri}
          isInitializing={isInitializing}
          error={error}
          copied={copied}
          onClose={() => setIsModalOpen(false)}
          onCopy={copyUri}
          onRetry={handleRetry}
        />
      )}
    </>
  );
}
