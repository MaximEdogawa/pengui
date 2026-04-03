"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { getThemeClasses } from "@/shared/lib/theme";
import { FeatureGate } from "@/shared/ui";
import { BalanceCard } from "@/features/dashboard/ui/components/BalanceCard";
import { PortfolioCard } from "@/features/dashboard/ui/components/PortfolioCard";
import { ExpensesCard } from "@/features/dashboard/ui/components/ExpensesCard";
import { InvestmentsCard } from "@/features/dashboard/ui/components/InvestmentsCard";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { theme: currentTheme, systemTheme } = useTheme();

  const isDark = currentTheme === "dark" || (currentTheme === "system" && systemTheme === "dark");
  const t = getThemeClasses(isDark);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <FeatureGate flag="dashboard">
    <div className="w-full relative z-10 space-y-2">
      {/* Total Balance */}
      <BalanceCard isDark={isDark} t={t} />

      {/* Portfolio + Expenses side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <PortfolioCard isDark={isDark} t={t} />
        <ExpensesCard isDark={isDark} t={t} />
      </div>

      {/* Investments */}
      <InvestmentsCard isDark={isDark} t={t} />
    </div>
    </FeatureGate>
  );
}
