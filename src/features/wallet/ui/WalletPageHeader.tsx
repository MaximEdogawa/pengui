"use client";

import { useThemeClasses } from "@/shared/hooks";
import { Wallet } from "lucide-react";
import WalletBalanceCompact from "./WalletBalanceCompact";

export default function WalletPageHeader() {
  const { isDark, t } = useThemeClasses();

  return (
    <header
      className={`mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border px-3 py-2.5 ${
        isDark ? "bg-white/[0.03] border-white/5" : "bg-white/40 border-cyan-200/20"
      } ${t.border}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isDark ? "bg-cyan-500/10" : "bg-cyan-500/15"
          }`}
        >
          <Wallet
            className={isDark ? "text-cyan-400" : "text-cyan-600"}
            size={16}
            strokeWidth={2}
          />
        </div>
        <div className="min-w-0">
          <h1 className={`text-base font-semibold leading-tight ${t.text}`}>Wallet</h1>
          <p className={`text-[11px] leading-tight ${t.textSecondary}`}>
            Manage your wallet balance and transactions
          </p>
        </div>
      </div>
      <div className="flex-shrink-0">
        <WalletBalanceCompact />
      </div>
    </header>
  );
}
