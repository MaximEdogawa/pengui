"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useWalletProvider, useWalletState } from "@/shared/hooks";

type Status = "connecting" | "connected" | "error";

/**
 * Sage login panel: connects with one tap (or automatically) instead of a
 * WalletConnect QR / pairing URI (AC #2).
 *
 * `provider.connect()` requests any missing capabilities through Sage's
 * approval dialog and resolves the fingerprint/address/network. Navigation
 * to `/dashboard` is not done here: `WalletConnectionGuard` already redirects
 * off `/login` once `useWalletState().isConnected` is true, generically for
 * both adapters.
 */
export function SageLoginPanel() {
  const provider = useWalletProvider();
  const { isConnected } = useWalletState();
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const attemptConnect = async () => {
    setStatus("connecting");
    setError(null);
    try {
      const result = await provider.connect();
      if (!result.success) {
        setStatus("error");
        setError(result.error ?? "Could not connect to Sage.");
        return;
      }
      setStatus("connected");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not connect to Sage.");
    }
  };

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    void attemptConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (isConnected || status === "connected") {
    return (
      <div className="flex items-center justify-center py-6 w-full">
        <div className="flex items-center gap-2 text-sm text-cyan-300/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connected — redirecting…</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 w-full">
        <p className="text-sm text-red-300/80 text-center max-w-xs">{error}</p>
        <button
          type="button"
          onClick={() => void attemptConnect()}
          className="group relative w-full max-w-xs mx-auto overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.98] touch-manipulation"
        >
          <span className="relative flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-300/20">
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span className="text-[14px] font-semibold text-cyan-200">Retry</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-6 w-full">
      <div className="flex items-center gap-2.5 px-6 py-3 text-cyan-200">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400/70" />
        <span className="text-[15px] font-semibold tracking-wide">Connecting to Sage…</span>
        <ShieldCheck className="w-4 h-4 text-cyan-400/50" />
      </div>
    </div>
  );
}
