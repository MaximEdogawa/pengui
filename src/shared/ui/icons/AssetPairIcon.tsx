import type { ReactNode } from "react";

interface AssetPairIconProps {
  /** The back icon (renders behind, e.g. XCH). */
  back: ReactNode;
  /** The front icon (renders on top, slightly overlapping). */
  front: ReactNode;
  /**
   * How much the front icon overlaps the back.
   * "default" (-6 px) suits small icons (≤ 20 px).
   * "tight"   (-12 px) suits larger icons (≥ 24 px).
   */
  overlap?: "default" | "tight";
}

/**
 * AssetPairIcon — two circular asset icons overlapping side-by-side.
 * Each slot is wrapped in a ring so the icons are visually separated
 * even when they have the same background colour.
 *
 * Usage:
 *   <AssetPairIcon
 *     back={<XchIcon size={20} />}
 *     front={<TickerIcon assetId={pair.asset_id} size={20} />}
 *   />
 */
export function AssetPairIcon({ back, front, overlap = "default" }: AssetPairIconProps) {
  const gap = overlap === "tight" ? "-space-x-3" : "-space-x-1.5";
  return (
    <span className={`flex shrink-0 items-center ${gap}`}>
      <span className="rounded-full ring-2 ring-white dark:ring-gray-900 z-[1]">
        {back}
      </span>
      <span className="rounded-full ring-2 ring-white dark:ring-gray-900 z-[2]">
        {front}
      </span>
    </span>
  );
}
