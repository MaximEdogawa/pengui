"use client";

import { WalletPageHeader, AssetListPane } from "@/features/wallet";
import { useEffect, useState } from "react";
import { FeatureGate } from "@/shared/ui";

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <FeatureGate flag="wallet">
      <div className="w-full relative z-10">
        <WalletPageHeader />
        <div className="mt-2">
          <AssetListPane />
        </div>
      </div>
    </FeatureGate>
  );
}
