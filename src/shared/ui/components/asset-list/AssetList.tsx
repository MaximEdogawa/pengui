import { TickerIcon, XchIcon } from "@/entities/asset";
import { formatAmountForTooltip } from "@/features/trading/lib/formatAmount";
import { useNetwork } from "@/shared/hooks";

interface AssetListProps {
  label: string;
  assets: Array<{ id: string; code?: string; amount?: number }>;
  getTickerSymbol: (assetId: string, code?: string) => string;
}

export function AssetList({ label, assets, getTickerSymbol }: AssetListProps) {
  const { network } = useNetwork();
  const isTestnet = network === "testnet";

  return (
    <div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
      <div className="mt-1 space-y-1">
        {assets.map((asset, idx) => {
          const ticker = asset.code || getTickerSymbol(asset.id);
          const isXch = !asset.id || ticker === "XCH" || ticker === "TXCH";

          return (
            <div
              key={idx}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                {isXch ? (
                  <XchIcon size={16} isTestnet={isTestnet} />
                ) : (
                  <TickerIcon assetId={asset.id} ticker={ticker} size={16} />
                )}
                <span className="text-gray-900 dark:text-white">{ticker}</span>
              </div>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {formatAmountForTooltip(asset.amount || 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { AssetListProps };
