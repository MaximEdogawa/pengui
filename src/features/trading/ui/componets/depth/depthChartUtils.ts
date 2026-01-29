import { MarketDepthLevel } from "@/features/trading/lib/chartTypes";

interface PathGenerationParams {
  levels: Array<MarketDepthLevel & { cumulativeVolume: number }>;
  priceRange: { min: number; max: number };
  chartWidth: number;
  chartHeight: number;
  maxVolume: number;
  centerX: number;
  isBid: boolean;
  bestBid?: number | null;
  bestAsk?: number | null;
}

export function generateDepthPath({
  levels,
  priceRange,
  chartWidth,
  chartHeight,
  maxVolume,
  centerX,
  isBid,
  bestBid,
  bestAsk,
}: PathGenerationParams): string {
  if (levels.length === 0) return "";

  // Guard against division by zero
  const range = priceRange.max - priceRange.min;
  if (
    range === 0 ||
    !isFinite(range) ||
    maxVolume <= 0 ||
    !isFinite(maxVolume)
  ) {
    return "";
  }

  const points: string[] = [];

  if (isBid) {
    // Start from bottom-left (lowest visible bid price, bottom)
    const lowestBid = levels[levels.length - 1];
    const lowestX = ((lowestBid.price - priceRange.min) / range) * chartWidth;
    points.push(`M ${lowestX} ${chartHeight}`);

    // Draw bid depth from low price (left) to high price (right), from bottom to top
    // Bids are sorted descending (highest first), so we iterate in reverse
    // Use smooth curves with quadratic bezier
    const bidPoints = [...levels].reverse().map((bid) => {
      const x = ((bid.price - priceRange.min) / range) * chartWidth;
      const y = chartHeight - (bid.cumulativeVolume / maxVolume) * chartHeight;
      return { x, y };
    });

    // Draw smooth curve through all points using quadratic bezier
    bidPoints.forEach((point, i) => {
      if (i === 0) {
        points.push(`L ${point.x} ${point.y}`);
      } else {
        const prev = bidPoints[i - 1];
        // Control point is midpoint for smooth curve
        const controlX = (prev.x + point.x) / 2;
        const controlY = (prev.y + point.y) / 2;
        points.push(`Q ${controlX} ${controlY} ${point.x} ${point.y}`);
      }
    });

    // End at best bid position with vertical line down to bottom, then horizontal to current price
    if (bestBid) {
      const bestBidX = ((bestBid - priceRange.min) / range) * chartWidth;
      const highestBid = levels[0];
      const highestBidY =
        chartHeight - (highestBid.cumulativeVolume / maxVolume) * chartHeight;

      // Draw to best bid x position at the current y height
      points.push(`L ${bestBidX} ${highestBidY}`);
      // Vertical line straight down to bottom (x-axis)
      points.push(`L ${bestBidX} ${chartHeight}`);
      // Horizontal line from best bid to current price (mid-price) at the bottom - green
      points.push(`L ${centerX} ${chartHeight}`);
    } else {
      // Fallback: end at center (mid-price) at the bottom
      points.push(`L ${centerX} ${chartHeight}`);
    }
  } else {
    // Start from best ask position at the bottom with vertical line up
    if (bestAsk) {
      const bestAskX = ((bestAsk - priceRange.min) / range) * chartWidth;
      // Start at bottom (x-axis)
      points.push(`M ${bestAskX} ${chartHeight}`);

      // Vertical line up to first ask level
      const firstAsk = levels[0];
      const firstAskY =
        chartHeight - (firstAsk.cumulativeVolume / maxVolume) * chartHeight;
      points.push(`L ${bestAskX} ${firstAskY}`);
    } else {
      // Fallback: start from center (mid-price) at the bottom
      points.push(`M ${centerX} ${chartHeight}`);
    }

    // Draw ask depth from best ask (or mid-price) to high price (right), from bottom to top
    // Use smooth curves with quadratic bezier
    const askPoints = levels.map((ask) => {
      const x = ((ask.price - priceRange.min) / range) * chartWidth;
      const y = chartHeight - (ask.cumulativeVolume / maxVolume) * chartHeight;
      return { x, y };
    });

    // Draw smooth curve through all points using quadratic bezier
    askPoints.forEach((point, i) => {
      if (i === 0 && bestAsk) {
        // Skip first point if we already drew vertical line to it
        return;
      }
      if (i === 0) {
        points.push(`L ${point.x} ${point.y}`);
      } else {
        const prev = askPoints[i - 1];
        // Control point is midpoint for smooth curve
        const controlX = (prev.x + point.x) / 2;
        const controlY = (prev.y + point.y) / 2;
        points.push(`Q ${controlX} ${controlY} ${point.x} ${point.y}`);
      }
    });

    // End at bottom-right (highest visible ask price, bottom)
    const lastAsk = levels[levels.length - 1];
    const lastX = ((lastAsk.price - priceRange.min) / range) * chartWidth;
    points.push(`L ${lastX} ${chartHeight}`);

    // Draw horizontal line from best ask to current price (mid-price) at the bottom - red
    if (bestAsk) {
      // Go back to best ask position at bottom, then horizontal to centerX
      const bestAskX = ((bestAsk - priceRange.min) / range) * chartWidth;
      points.push(`L ${bestAskX} ${chartHeight}`);
      // Horizontal line from best ask to current price (mid-price) at the bottom
      points.push(`L ${centerX} ${chartHeight}`);
    } else {
      // Fallback: horizontal line to center (mid-price) at the bottom
      points.push(`L ${centerX} ${chartHeight}`);
    }
  }

  // Close back to start
  points.push(`Z`);

  return points.join(" ");
}

export function generatePriceLabels(
  priceRange: { min: number; max: number },
  chartWidth: number,
  numLabels: number = 8,
): Array<{ price: number; x: number }> {
  const labels: Array<{ price: number; x: number }> = [];
  const range = priceRange.max - priceRange.min;

  if (range <= 0) return labels;

  // For small ranges (tight spreads), use more labels for better granularity
  // Calculate optimal number of labels based on chart width and range size
  const rangePercent = (range / priceRange.min) * 100;
  const isSmallRange = rangePercent < 5; // Less than 5% range

  // Use more labels for small ranges to show spread detail
  const optimalSpacing = isSmallRange ? 80 : 100;
  const calculatedNumLabels = Math.max(
    isSmallRange ? 5 : 3,
    Math.min(numLabels, Math.floor(chartWidth / optimalSpacing)),
  );

  // Use a smarter algorithm to pick nice round numbers
  const step = range / calculatedNumLabels;

  // Find the order of magnitude of the step
  const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
  const normalizedStep = step / magnitude;

  // Round to a nice number (1, 2, 5, 10, etc.)
  let niceStep: number;
  if (normalizedStep <= 1) {
    niceStep = 1;
  } else if (normalizedStep <= 2) {
    niceStep = 2;
  } else if (normalizedStep <= 5) {
    niceStep = 5;
  } else {
    niceStep = 10;
  }

  const roundedStep = niceStep * magnitude;

  // Start from a nice round number near min
  const startPrice = Math.floor(priceRange.min / roundedStep) * roundedStep;
  const endPrice = Math.ceil(priceRange.max / roundedStep) * roundedStep;

  // Generate labels
  const numSteps = Math.ceil((endPrice - startPrice) / roundedStep) + 1;
  Array.from({ length: numSteps }, (_, i) => {
    const price = startPrice + i * roundedStep;
    return price;
  })
    .filter((price) => price >= priceRange.min && price <= priceRange.max)
    .forEach((price) => {
      const x = ((price - priceRange.min) / range) * chartWidth;
      labels.push({ price, x });
    });

  // Always include min and max if they're not already included
  if (
    labels.length === 0 ||
    Math.abs(labels[0].price - priceRange.min) > 0.00000001
  ) {
    labels.unshift({ price: priceRange.min, x: 0 });
  }
  if (
    labels.length === 0 ||
    Math.abs(labels[labels.length - 1].price - priceRange.max) > 0.00000001
  ) {
    labels.push({ price: priceRange.max, x: chartWidth });
  }

  // Sort by price
  labels.sort((a, b) => a.price - b.price);

  return labels;
}
