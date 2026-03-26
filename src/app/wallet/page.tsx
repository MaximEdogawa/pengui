"use client";

import { WalletPageHeader, AssetListPane } from "@/features/wallet";
import { useEffect, useState } from "react";

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full relative z-10">
      <WalletPageHeader />
      <div className="mt-2">
        <AssetListPane />
      </div>
    </div>
  );
}
