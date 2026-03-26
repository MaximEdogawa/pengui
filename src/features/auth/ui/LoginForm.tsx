"use client";

import { ExternalLink } from "lucide-react";
import { PenguinLogo, NetworkPicker } from "@/shared/ui";
import { LoginConnectWallet } from "./LoginConnectWallet";

export default function LoginForm() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 py-6 sm:px-4 sm:py-12 md:px-6 md:py-16 lg:px-20 xl:px-80 backdrop-blur-3xl bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{
        backgroundImage: "url('/signin-glass.jpg')",
      }}
    >
      {/* Dark icy gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-sky-950/30 to-cyan-900/15 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Background glow elements — hidden on small screens to avoid artifacts */}
      <div className="hidden sm:block absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-400/6 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="px-5 sm:px-6 md:px-8 lg:px-10 flex py-8 sm:py-8 md:py-10 flex-col items-center gap-5 sm:gap-5 w-full backdrop-blur-2xl rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900/40 via-slate-950/30 to-black/20 border border-cyan-300/10 shadow-2xl shadow-black/40 max-w-md relative z-10">
        {/* Logo and Title Section */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
          <div className="relative group">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-xl sm:rounded-2xl md:rounded-3xl bg-gradient-to-br from-cyan-500/20 via-sky-600/15 to-slate-800/25 backdrop-blur-lg border-2 border-cyan-200/25 shadow-xl sm:shadow-2xl shadow-cyan-500/15 group-hover:border-cyan-200/40 group-hover:shadow-cyan-400/20 transition-all duration-300 overflow-hidden p-2.5 sm:p-3 md:p-2.5">
              <PenguinLogo fill priority className="drop-shadow-xl sm:drop-shadow-2xl" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-none tracking-tight">
              <span className="bg-[linear-gradient(to_right,rgb(240_249_255),rgb(186_230_253),rgb(125_211_252),rgb(186_230_253))] bg-clip-text text-transparent">
                Pengui
              </span>
            </h1>
            {/* Decorative accent line */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <div className="h-px w-8 sm:w-10 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
              <div className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-sky-300/40" />
              <div className="h-px w-12 sm:w-14 bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" />
              <div className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-cyan-300/40" />
              <div className="h-px w-8 sm:w-10 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
            </div>
          </div>
        </div>

        {/* Wallet Connection Section - QR code shown inline */}
        <LoginConnectWallet />

        {/* Network Picker */}
        <div className="flex justify-center w-full">
          <NetworkPicker />
        </div>

        {/* Footer */}
        <div className="text-center pt-1">
          <a
            href="https://sagewallet.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-200/40 hover:text-sky-100/70 text-[9px] sm:text-[10px] md:text-[11px] leading-relaxed tracking-wide transition-colors duration-200"
          >
            <span>Connect with Sage Wallet</span>
            <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
