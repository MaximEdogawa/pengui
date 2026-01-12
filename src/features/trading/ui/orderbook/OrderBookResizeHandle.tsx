interface OrderBookResizeHandleProps {
  averagePrice: string
  onMouseDown: (event: React.MouseEvent) => void
}

export default function OrderBookResizeHandle({
  averagePrice,
  onMouseDown,
}: OrderBookResizeHandleProps) {
  return (
    <div
      className="resize-handle cursor-row-resize transition-all duration-200 flex items-center justify-end relative py-0 px-0"
      onMouseDown={onMouseDown}
      title="Drag to resize sections"
    >
      {/* Thin separator line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10" />

      {/* Average price display */}
      <div className="relative z-10 flex items-center py-0 px-0 ">
        <div
          className="px-1 py-0 rounded-md backdrop-blur-md bg-blue-500/10 dark:bg-blue-400/10 border border-blue-400/20 dark:border-blue-300/20 transition-all duration-200 hover:bg-blue-500/15 dark:hover:bg-blue-400/15 hover:border-blue-400/30 dark:hover:border-blue-300/30 flex items-center mr-0 sm:mr-1"
          style={{
            boxShadow:
              '0 0 0 0.5px rgba(59, 130, 246, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(147, 197, 253, 0.2), 0 0 8px rgba(59, 130, 246, 0.2), 0 0 12px rgba(59, 130, 246, 0.1)',
          }}
        >
          <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 font-mono tabular-nums leading-none">
            {averagePrice}
          </span>
        </div>
      </div>

      {/* Invisible larger hit area for easier dragging */}
      <div className="absolute inset-0 w-full h-6 -top-2 cursor-row-resize" />
    </div>
  )
}
