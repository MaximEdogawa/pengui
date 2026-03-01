"use client";

import { useEffect, useState } from "react";

const SHOW_ESCAPE_AFTER_MS = 5_000;

/**
 * Shown while PersistGate is rehydrating / onBeforeLift runs.
 * After a delay, shows "Disconnect wallet and reload" so the user can escape
 * if restoration hangs (e.g. wallet closed, relay unreachable).
 */
export function PersistGateLoadingFallback() {
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), SHOW_ESCAPE_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  const handleDisconnectAndReload = () => {
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem("walletconnect");
      // Redux-persist typically uses "persist:root" or similar
      const keysToRemove = Array.from(
        { length: window.localStorage.length },
        (_, i) => window.localStorage.key(i)
      ).filter((key): key is string => key !== null && key.startsWith("persist:"));
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
    // Only the loading screen disconnect sends user to login
    window.location.href = "/login";
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
            Taking longer than usual? You can disconnect the wallet and reload.
          </p>
          <button
            type="button"
            onClick={handleDisconnectAndReload}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Disconnect wallet and reload
          </button>
        </div>
      )}
    </div>
  );
}
