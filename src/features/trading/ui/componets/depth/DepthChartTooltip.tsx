import {
  formatAmountForDisplay,
  formatPriceForDisplay,
} from "@/features/trading/lib/formatAmount";

interface TooltipData {
  x: number;
  y: number;
  price: number;
  quantity: number;
  cumulativeVolume: number;
  side: "bid" | "ask";
}

interface DepthChartTooltipProps {
  tooltip: TooltipData | null;
}

export default function DepthChartTooltip({ tooltip }: DepthChartTooltipProps) {
  if (!tooltip) return null;

  return (
    <div
      className="absolute z-20 px-3 py-2 bg-[#1e222d]/95 backdrop-blur-sm rounded-md border border-[#2a2e39] shadow-lg pointer-events-none"
      style={{
        left: `${tooltip.x + 10}px`,
        top: `${tooltip.y - 10}px`,
        transform: "translateY(-100%)",
      }}
    >
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#868993]">Price:</span>
          <span
            className={`font-mono font-medium ${tooltip.side === "bid" ? "text-[#26a69a]" : "text-[#ef5350]"}`}
          >
            {formatPriceForDisplay(tooltip.price)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#868993]">Quantity:</span>
          <span className="text-[#d1d4dc] font-mono">
            {formatAmountForDisplay(tooltip.quantity)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#868993]">Cumulative:</span>
          <span className="text-[#d1d4dc] font-mono">
            {formatAmountForDisplay(tooltip.cumulativeVolume)}
          </span>
        </div>
      </div>
    </div>
  );
}
