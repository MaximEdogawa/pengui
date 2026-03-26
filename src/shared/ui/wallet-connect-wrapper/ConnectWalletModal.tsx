"use client";

import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, RefreshCw, Loader2, X } from "lucide-react";

interface ConnectWalletModalProps {
  uri: string | null;
  isInitializing: boolean;
  error: string | null;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
  onRetry: () => void;
}

export function ConnectWalletModal({
  uri,
  isInitializing,
  error,
  copied,
  onClose,
  onCopy,
  onRetry,
}: ConnectWalletModalProps) {
  const modal = (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      {/* modal panel */}
      <div className="relative w-full max-w-sm animate-[modalIn_300ms_cubic-bezier(0.16,1,0.3,1)] rounded-3xl overflow-hidden">
        {/* outer glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-cyan-400/25 via-sky-500/10 to-transparent pointer-events-none" />

        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-white/[0.08] shadow-2xl shadow-cyan-950/30">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Connect Wallet
              </h2>
              <p className="text-[11px] sm:text-xs text-cyan-300/40 mt-0.5">
                Scan QR code with your wallet
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] text-white/40 hover:text-white/70 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="px-6 pb-6 flex flex-col items-center gap-5">
            {/* QR Code */}
            <div className="relative w-full flex justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />

              {isInitializing || !uri ? (
                <div className="w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 text-cyan-400/40 animate-spin" />
                  <span className="text-[11px] text-white/30">Generating QR code…</span>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-black/40">
                  <div className="bg-white p-4 rounded-2xl">
                    <QRCodeSVG
                      value={uri}
                      size={typeof window !== "undefined" && window.innerWidth < 640 ? 188 : 208}
                      bgColor="#FFFFFF"
                      fgColor="#0f172a"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <span className="text-[10px] text-white/20 uppercase tracking-widest font-medium">
                or
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            {/* Copy URI */}
            <button
              onClick={onCopy}
              disabled={!uri}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-cyan-400/20 text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group/copy"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white/40 group-hover/copy:text-cyan-300/70 transition-colors duration-200" />
                  <span className="text-white/50 group-hover/copy:text-white/70 transition-colors duration-200">
                    Copy connection URI
                  </span>
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="w-full flex flex-col items-center gap-2 py-2">
                <p className="text-red-400/70 text-xs text-center">{error}</p>
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300/60 hover:text-cyan-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 pb-6 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-white/40 hover:text-white/60 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onRetry}
              disabled={isInitializing}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-cyan-200/70 hover:text-cyan-100 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-400/15 hover:border-cyan-400/25 transition-all duration-200 disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? "animate-spin" : ""}`} />
              New QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }
  return modal;
}
