import { TickerIcon, XchIcon } from "@/entities/asset";
import { formatAmountForTooltip } from "@/features/trading/lib/formatAmount";
import { useNetwork } from "@/shared/hooks";

interface AssetListProps {
  label: string;
  assets: Array<{ id: string; code?: string; amount?: number }>;
  getTickerSymbol: (assetId: string, code?: string) => string;
  onSelect?: (assetId: string) => void;
  highlightedIndex?: number;
}

export function AssetList({ label, assets, getTickerSymbol, onSelect, highlightedIndex }: AssetListProps) {
  const { network } = useNetwork();
  const isTestnet = network === "testnet";

  return (
    <div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
      <div className="mt-1 space-y-1">
        {assets.map((asset, idx) => {
          const ticker = asset.code || getTickerSymbol(asset.id);
          const isXch = !asset.id || ticker === "XCH" || ticker === "TXCH";

          const isHighlighted = typeof highlightedIndex === 'number' && highlightedIndex === idx;
          const rowClasses = `flex items-center justify-between text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
            isHighlighted
              ? 'bg-gray-200 text-gray-900 dark:bg-gray-700/80 dark:text-white'
              : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`;

          return (
            <div
              key={idx}
              onClick={onSelect ? () => onSelect(asset.id) : undefined}
              role={onSelect ? 'button' : undefined}
              className={rowClasses}
            >
              <div className="flex items-center gap-1.5">
                {isXch ? (
                  <XchIcon size={16} isTestnet={isTestnet} />
                ) : (
                  <TickerIcon assetId={asset.id} ticker={ticker} size={16} />
                )}
                <span className="truncate">{ticker}</span>
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
