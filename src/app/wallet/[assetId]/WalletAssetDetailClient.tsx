"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AssetDetailView } from "@/features/wallet";

export default function WalletAssetDetailClient() {
  const params = useParams();
  const router = useRouter();
  const assetId = typeof params?.assetId === "string" ? params.assetId : "";

  useEffect(() => {
    if (!assetId) router.replace("/wallet");
  }, [assetId, router]);

  if (!assetId) return null;

  return <AssetDetailView assetIdSlug={assetId} />;
}
