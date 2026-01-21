interface ChartGridLinesProps {
  chartWidth: number
  chartHeight: number
  priceLabels: Array<{ price: number; x: number }>
}

export function ChartGridLines({ chartWidth, chartHeight, priceLabels }: ChartGridLinesProps) {
  return (
    <>
      {/* Grid lines - horizontal (volume) */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const y = chartHeight - (ratio * chartHeight)
        return (
          <g key={`vol-grid-${idx}`}>
            <line
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#1a1d29"
              strokeWidth={0.5}
              strokeDasharray={idx === 0 || idx === 4 ? '0' : '4,4'}
              opacity={0.5}
            />
          </g>
        )
      })}

      {/* Grid lines - vertical (price) */}
      {priceLabels.map((label, idx) => (
        <g key={`price-${idx}`}>
          <line
            x1={label.x}
            y1={0}
            x2={label.x}
            y2={chartHeight}
            stroke="#1a1d29"
            strokeWidth={0.5}
            strokeDasharray={idx === 0 || idx === priceLabels.length - 1 ? '0' : '4,4'}
            opacity={0.5}
          />
        </g>
      ))}
    </>
  )
}
