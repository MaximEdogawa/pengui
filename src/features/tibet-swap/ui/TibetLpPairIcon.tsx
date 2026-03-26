"use client";

import { XchIcon } from "@/entities/asset";
import TickerIcon from "@/entities/asset/ui/TickerIcon";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { AssetPairIcon } from "@/shared/ui/icons/AssetPairIcon";
import { useTibetLpPairMap } from "../hooks/useTibetLpPairMap";
import { TibetBadge } from "./TibetBadge";

interface TibetLpPairIconProps {
  /** The LP token asset ID (pair.liquidity_asset_id). */
  liquidityAssetId: string;
  size?: number;
}

/**
 * TibetLpPairIcon — XCH + token pair icons with a small TibetSwap badge
 * pinned to the bottom-right corner. Falls back to a plain TickerIcon
 * if the pair isn't found in the pair list.
 */
export function TibetLpPairIcon({ liquidityAssetId, size = 20 }: TibetLpPairIconProps) {
  const { network } = useNetwork();
  const lpMap = useTibetLpPairMap();
  const pair = lpMap.get(liquidityAssetId);

  if (!pair) {
    return <TickerIcon assetId={liquidityAssetId} ticker="LP" size={size} />;
  }

  // Badge scales with icon size; hidden below size 14 where it would be illegible.
  const badgeSize = Math.max(10, Math.round(size * 0.38));
  const showBadge = size >= 14;

  return (
    <span className="relative inline-flex shrink-0">
      <AssetPairIcon
        back={<XchIcon size={size} isTestnet={network === "testnet"} />}
        front={
          <TickerIcon
            assetId={pair.asset_id}
            ticker={pair.asset_short_name || pair.asset_name}
            size={size}
          />
        }
      />
      {showBadge && (
        <span className="absolute -bottom-1 -right-1 z-10">
          <TibetBadge size={badgeSize} />
        </span>
      )}
    </span>
  );
}
