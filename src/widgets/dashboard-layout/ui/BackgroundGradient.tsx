import type { ThemeClasses } from '@/shared/lib/theme'

interface BackgroundGradientProps {
  t: ThemeClasses
}

export function BackgroundGradient({ t }: BackgroundGradientProps) {
  return (
    <div className="fixed inset-0 pointer-events-none w-screen max-w-screen right-0 m-0 p-0 border-r-0">
      <div className={`absolute inset-0 bg-gradient-to-br w-screen max-w-screen right-0 m-0 p-0 border-r-0 ${t.gradientBg}`}></div>
    </div>
  )
}
