import { useMemo } from 'react'
import type { MarketDepthLevel } from '../../lib/chartTypes'
import { generateDepthPath, generatePriceLabels } from './depthChartUtils'
import { ChartGridLines } from './ChartGridLines'
import { ChartEdges } from './ChartEdges'
import { ChartPriceLabels } from './ChartPriceLabels'
import { ChartGradients } from './ChartGradients'

interface DepthChartSVGProps {
  width: number
  height: number
  chartWidth: number
  chartHeight: number
  priceRange: { min: number; max: number }
  visibleBids: Array<MarketDepthLevel & { cumulativeVolume: number }>
  visibleAsks: Array<MarketDepthLevel & { cumulativeVolume: number }>
  maxVolume: number
  centerX: number
  hoveredPrice: number | null
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseLeave: () => void
  onClick: () => void
}

const CHART_PADDING = { top: 5, right: 5, bottom: 40, left: 5 }
const SPREAD_INDICATOR_HEIGHT = 30

export default function DepthChartSVG({
  width,
  height,
  chartWidth,
  chartHeight,
  priceRange,
  visibleBids,
  visibleAsks,
  maxVolume,
  centerX,
  hoveredPrice,
  onMouseMove,
  onMouseLeave,
  onClick,
}: DepthChartSVGProps) {
  const bidPath = useMemo(
    () =>
      generateDepthPath({
        levels: visibleBids,
        priceRange,
        chartWidth,
        chartHeight,
        maxVolume,
        centerX,
        isBid: true,
      }),
    [visibleBids, priceRange, chartWidth, chartHeight, maxVolume, centerX]
  )

  const askPath = useMemo(
    () =>
      generateDepthPath({
        levels: visibleAsks,
        priceRange,
        chartWidth,
        chartHeight,
        maxVolume,
        centerX,
        isBid: false,
      }),
    [visibleAsks, priceRange, chartWidth, chartHeight, maxVolume, centerX]
  )

  const priceLabels = useMemo(
    () => generatePriceLabels(priceRange, chartWidth, 8),
    [priceRange, chartWidth]
  )

  return (
    <svg
      width={width}
      height={height}
      className="w-full h-full"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <ChartGradients />

      <g transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top + SPREAD_INDICATOR_HEIGHT})`}>
        <ChartGridLines chartWidth={chartWidth} chartHeight={chartHeight} priceLabels={priceLabels} />
        <ChartEdges chartWidth={chartWidth} chartHeight={chartHeight} />

        {/* Center line (mid-price) */}
        <line
          x1={centerX}
          y1={0}
          x2={centerX}
          y2={chartHeight}
          stroke="#2962ff"
          strokeWidth={2}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Bid depth area (left side) */}
        {bidPath && (
          <path
            d={bidPath}
            fill="url(#bidGradient)"
            stroke="#26a69a"
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}

        {/* Ask depth area (right side) */}
        {askPath && (
          <path
            d={askPath}
            fill="url(#askGradient)"
            stroke="#ef5350"
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}

        {/* Hover indicator line (vertical) */}
        {hoveredPrice !== null && (
          <line
            x1={((hoveredPrice - priceRange.min) / (priceRange.max - priceRange.min)) * chartWidth}
            y1={0}
            x2={((hoveredPrice - priceRange.min) / (priceRange.max - priceRange.min)) * chartWidth}
            y2={chartHeight}
            stroke="#2962ff"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.7}
          />
        )}

        <ChartPriceLabels priceLabels={priceLabels} chartHeight={chartHeight} chartWidth={chartWidth} priceRange={priceRange} />
      </g>
    </svg>
  )
}
