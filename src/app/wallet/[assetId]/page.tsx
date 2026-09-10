import { STATIC_ASSET_DETAIL_PARAMS } from "@/shared/lib/routes/assetDetail";
import WalletAssetDetailClient from "./WalletAssetDetailClient";

/**
 * `output: "export"` (the Sage snapshot) requires a fixed param list for every
 * dynamic segment. Only the XCH slug is pre-rendered; inside Sage the asset list
 * links to the static `/wallet/asset?id=…` route instead. The hosted deployment
 * keeps rendering every asset id on demand (`dynamicParams` defaults to true).
 */
export function generateStaticParams() {
  return STATIC_ASSET_DETAIL_PARAMS;
}

export default function WalletAssetPage() {
  return <WalletAssetDetailClient />;
}
