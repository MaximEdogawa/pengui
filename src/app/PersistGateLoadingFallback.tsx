"use client";

import { disconnectWallet } from "@/shared/lib/walletConnect/disconnectWallet";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Show the disconnect option after 2s so it’s visible for longer during loading. */
const SHOW_ESCAPE_AFTER_MS = 2_000;

/**
 * Shown while PersistGate is rehydrating / onBeforeLift runs.
 * After a delay, shows disconnect/reload so the user can escape
 * if restoration hangs (e.g. wallet closed, relay unreachable).
 * Uses shared disconnectWallet (no QueryClient/Theme/Network needed) and
 * client-side routing so the escape hatch also works inside the Sage webview.
 */
export function PersistGateLoadingFallback() {
  const router = useRouter();
  const [showEscape, setShowEscape] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), SHOW_ESCAPE_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  const handleDisconnectAndReload = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet({
        clearPersist: true,
        redirectToLogin: true,
        navigate: (path) => router.replace(path),
      });
    } catch {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-[#0f172a] px-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
        aria-hidden
      />
      {showEscape && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-white/70">
            Taking longer than usual? You can disconnect the wallet, reload, and try opening the
            wallet again.
          </p>
          <button
            type="button"
            onClick={handleDisconnectAndReload}
            disabled={isDisconnecting}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            Disconnect wallet and reload
          </button>
        </div>
      )}
    </div>
  );
}
