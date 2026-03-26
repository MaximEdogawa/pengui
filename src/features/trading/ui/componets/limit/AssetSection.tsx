import { AssetSelector, type ExtendedAsset as ExtendedOfferAsset, Button } from "@/shared/ui";
import { Plus } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useCatTokens } from "@/entities/asset";
import { useMemo } from "react";

interface AssetSectionProps {
  title: string;
  description: string;
  assets: ExtendedOfferAsset[];
  onAdd: () => void;
  onUpdate: (index: number, asset: ExtendedOfferAsset) => void;
  onRemove: (index: number) => void;
  prefix: string;
}

export function AssetSection({
  title,
  description,
  assets,
  onAdd,
  onUpdate,
  onRemove,
  prefix,
}: AssetSectionProps) {
  const { t } = useThemeClasses();
  const { availableCatTokens, availableAssets, isLoading: isLoadingTickers } = useCatTokens();

  // Prepare token data (icons are fetched on-demand by TokenIconAuto component)
  const availableTokens = useMemo(
    () =>
      availableAssets.length > 0
        ? availableAssets.map((asset) => ({
            assetId: asset.assetId,
            ticker: asset.ticker,
            symbol: asset.symbol,
            name: asset.name,
          }))
        : availableCatTokens.map((token) => ({
            assetId: token.assetId,
            ticker: token.ticker,
            symbol: token.symbol,
            name: token.name,
          })),
    [availableAssets, availableCatTokens]
  );

  return (
    <div className="space-y-2 sm:space-y-3">
      <div>
        <h3 className={`text-xs sm:text-sm font-medium ${t.text} mb-0.5`}>{title}</h3>
        <p className={`text-[10px] sm:text-xs ${t.textSecondary}`}>{description}</p>
      </div>
      <div className="space-y-2">
        {assets.map((asset, index) => (
          <AssetSelector
            key={`${prefix}-${index}`}
            asset={asset}
            onUpdate={(updatedAsset) => onUpdate(index, updatedAsset)}
            onRemove={() => onRemove(index)}
            availableTokens={availableTokens}
            isLoadingTickers={isLoadingTickers}
          />
        ))}
        <Button type="button" onClick={onAdd} variant="secondary" icon={Plus} className="w-full">
          Add Asset
        </Button>
      </div>
    </div>
  );
}
