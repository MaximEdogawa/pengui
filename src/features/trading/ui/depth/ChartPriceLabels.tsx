import { formatPriceForDisplay } from '../../lib/formatAmount'

interface ChartPriceLabelsProps {
  priceLabels: Array<{ price: number; x: number }>
  chartHeight: number
  chartWidth: number
}

export function ChartPriceLabels({ priceLabels, chartHeight, chartWidth }: ChartPriceLabelsProps) {
  return (
    <>
      {priceLabels.map((label, idx) => (
        <g key={`price-label-${idx}`}>
          <text
            x={label.x}
            y={chartHeight + 15}
            fill="#868993"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {formatPriceForDisplay(label.price)}
          </text>
        </g>
      ))}
      <text
        x={chartWidth / 2}
        y={chartHeight + 35}
        fill="#868993"
        fontSize="11"
        textAnchor="middle"
        fontWeight="500"
      >
        Price
      </text>
    </>
  )
}
