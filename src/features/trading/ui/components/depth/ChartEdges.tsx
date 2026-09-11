interface ChartEdgesProps {
  chartWidth: number;
  chartHeight: number;
}

export function ChartEdges({ chartWidth, chartHeight }: ChartEdgesProps) {
  return (
    <>
      <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#1a1d29" strokeWidth={1} />
      <line
        x1={chartWidth}
        y1={0}
        x2={chartWidth}
        y2={chartHeight}
        stroke="#1a1d29"
        strokeWidth={1}
      />
      <line
        x1={0}
        y1={chartHeight}
        x2={chartWidth}
        y2={chartHeight}
        stroke="#1a1d29"
        strokeWidth={1}
      />
      <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#1a1d29" strokeWidth={1} />
    </>
  );
}
