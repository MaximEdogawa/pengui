"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AssetDetailView } from "@/features/wallet";

/**
 * Server-less asset detail route: `/wallet/asset?id=<slug>`.
 *
 * The Sage snapshot has no SPA fallback, so a dynamic segment would only resolve
 * for pre-rendered ids. This route is a single static file that reads the asset
 * from a query parameter, which works for every asset id.
 */
function WalletAssetByQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assetId = searchParams.get("id") ?? "";

  useEffect(() => {
    if (!assetId) router.replace("/wallet");
  }, [assetId, router]);

  if (!assetId) return null;

  return <AssetDetailView assetIdSlug={assetId} />;
}

export default function WalletAssetQueryPage() {
  return (
    <Suspense fallback={null}>
      <WalletAssetByQuery />
    </Suspense>
  );
}
