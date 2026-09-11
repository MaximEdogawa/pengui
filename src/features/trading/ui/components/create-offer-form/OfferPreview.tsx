import { formatAssetAmount, formatXchAmount } from "@/shared/lib/utils/chia-units";
import { TickerIcon, XchIcon } from "@/entities/asset";
import { useNetwork } from "@/shared/hooks";
import type { ThemeClasses } from "@/shared/lib/theme";
import type { AssetType } from "@/entities/offer";

interface AssetPreview {
  assetId: string;
  type: AssetType;
  amount: number;
  symbol?: string;
}

interface OfferPreviewProps {
  offeredAssets: AssetPreview[];
  requestedAssets: AssetPreview[];
  fee: number;
  t: ThemeClasses;
}

/**
 * Extract offer preview section to reduce CreateOfferForm size
 */
export function OfferPreview({ offeredAssets, requestedAssets, fee, t }: OfferPreviewProps) {
  const { network } = useNetwork();
  const isTestnet = network === "testnet";

  const renderAssetWithIcon = (asset: AssetPreview, index: number) => {
    const ticker = asset.symbol || asset.type.toUpperCase();
    const isXch = !asset.assetId || asset.type === "xch" || ticker === "XCH" || ticker === "TXCH";

    return (
      <span
        key={asset.assetId || `${asset.type}-${index}`}
        className="inline-flex items-center gap-1"
      >
        {isXch ? (
          <XchIcon size={14} isTestnet={isTestnet} />
        ) : (
          <TickerIcon assetId={asset.assetId} ticker={ticker} size={14} />
        )}
        <span>
          {formatAssetAmount(asset.amount, asset.type)} {ticker}
        </span>
      </span>
    );
  };

  return (
    <div className={`p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}>
      <h4 className={`text-xs font-medium ${t.text} mb-2`}>Offer Preview</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-start">
          <span className={t.textSecondary}>You will offer:</span>
          <span className={`${t.text} flex flex-wrap gap-1 justify-end`}>
            {offeredAssets.length > 0
              ? offeredAssets.map((asset, idx) => (
                  <span key={asset.assetId || idx} className="inline-flex items-center gap-1">
                    {renderAssetWithIcon(asset, idx)}
                    {idx < offeredAssets.length - 1 && ","}
                  </span>
                ))
              : "No assets"}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className={t.textSecondary}>You will receive:</span>
          <span className={`${t.text} flex flex-wrap gap-1 justify-end`}>
            {requestedAssets.length > 0
              ? requestedAssets.map((asset, idx) => (
                  <span key={asset.assetId || idx} className="inline-flex items-center gap-1">
                    {renderAssetWithIcon(asset, idx)}
                    {idx < requestedAssets.length - 1 && ","}
                  </span>
                ))
              : "No assets"}
          </span>
        </div>
        <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
          <span className={`font-medium ${t.text}`}>Fee:</span>
          <span className={`font-medium ${t.text}`}>{formatXchAmount(fee)} XCH</span>
        </div>
      </div>
    </div>
  );
}
