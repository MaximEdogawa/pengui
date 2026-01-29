import { formatPriceForDisplay } from "@/features/trading/lib/formatAmount";

interface ChartPriceLabelsProps {
  priceLabels: Array<{ price: number; x: number }>;
  chartHeight: number;
  chartWidth: number;
  priceRange: { min: number; max: number };
}

export function ChartPriceLabels({
  priceLabels,
  chartHeight,
  chartWidth,
  priceRange,
}: ChartPriceLabelsProps) {
  if (priceLabels.length <= 2) return null; // Need at least 3 labels to have middle ones

  // Filter out first and last labels, keep only middle prices
  const middleLabels = priceLabels.slice(1, -1);

  if (middleLabels.length === 0) return null;

  // Estimate minimum text width needed (approximate: ~6px per character for monospace at 10px)
  const estimateTextWidth = (text: string) => text.length * 6;

  return (
    <>
      {middleLabels.map((label, idx) => {
        const labelText = formatPriceForDisplay(label.price);
        const textWidth = estimateTextWidth(labelText);

        // Middle labels: check for overlap with neighbors
        let x = label.x;
        const prevLabel = idx > 0 ? middleLabels[idx - 1] : priceLabels[0]; // First label if first middle
        const nextLabel =
          idx < middleLabels.length - 1
            ? middleLabels[idx + 1]
            : priceLabels[priceLabels.length - 1]; // Last label if last middle

        // Check overlap with previous label
        if (prevLabel) {
          const prevTextWidth = estimateTextWidth(
            formatPriceForDisplay(prevLabel.price),
          );
          const prevX = prevLabel.x;
          const minX = prevX + prevTextWidth / 2 + textWidth / 2 + 5; // Half width of each + padding

          if (label.x < minX) {
            // Shift right if too close to previous
            x = minX;
          }
        }

        // Check overlap with next label
        if (nextLabel) {
          const nextTextWidth = estimateTextWidth(
            formatPriceForDisplay(nextLabel.price),
          );
          const maxX = nextLabel.x - textWidth / 2 - nextTextWidth / 2 - 5; // Half width of each + padding

          if (x > maxX) {
            // Shift left if too close to next
            x = maxX;
          }
        }

        // Ensure we don't go outside bounds
        x = Math.max(textWidth / 2, Math.min(chartWidth - textWidth / 2, x));

        return (
          <g key={`price-label-middle-${idx}`}>
            <text
              x={x}
              y={chartHeight + 15}
              fill="#868993"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {labelText}
            </text>
          </g>
        );
      })}
      <text
        x={chartWidth / 2}
        y={chartHeight + 35}
        fill="#868993"
        fontSize="11"
        textAnchor="middle"
        fontWeight="500"
      >
        Price Range: {formatPriceForDisplay(priceRange.min)} -{" "}
        {formatPriceForDisplay(priceRange.max)}
      </text>
    </>
  );
}
