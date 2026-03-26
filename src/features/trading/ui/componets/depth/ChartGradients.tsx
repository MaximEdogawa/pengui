export function ChartGradients() {
  return (
    <defs>
      <linearGradient id="bidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#26a69a" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#26a69a" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="askGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ef5350" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#ef5350" stopOpacity="0.3" />
      </linearGradient>
    </defs>
  );
}
