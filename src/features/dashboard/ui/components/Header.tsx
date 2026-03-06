import { NetworkPicker, SafeConnectButton, PenguinLogo } from '@/shared/ui'
import type { ThemeClasses } from '@/shared/lib/theme'

interface HeaderProps {
  t: ThemeClasses
  isDark: boolean
  onMenuClick: () => void
}

export function Header({ t, isDark, onMenuClick }: HeaderProps) {
  return (
    <header
      className={`h-12 lg:h-10 backdrop-blur-3xl ${t.card} border-b ${t.border} flex items-center justify-between pl-2 sm:pl-3 lg:pl-4 pr-2 sm:pr-3 lg:pr-4 gap-1.5 sm:gap-2 transition-all duration-300 w-full max-w-full flex-shrink-0 border-r-0 mr-0 pr-0 overflow-visible relative z-[9999]`}
    >
      {/* Left Section - Logo button for mobile only */}
      <div className="flex items-center lg:hidden">
        <button
          onClick={onMenuClick}
          className={`
            p-1.5 rounded-xl transition-colors duration-200 touch-manipulation
            ${isDark ? 'hover:bg-white/5 active:bg-white/10' : 'hover:bg-black/5 active:bg-black/10'}
          `}
        >
          <div className="w-9 h-9 lg:w-7 lg:h-7 rounded-full overflow-hidden flex items-center justify-center">
            <PenguinLogo size={36} className={`${t.text} rounded-full lg:hidden`} />
            <PenguinLogo size={28} className={`${t.text} rounded-full hidden lg:block`} />
          </div>
        </button>
      </div>

      {/* Spacer for desktop to push content to the right */}
      <div className="hidden lg:block flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Network Picker */}
        <div className="relative flex items-center flex-shrink-0">
          <NetworkPicker />
        </div>
        {/* Wallet Connection Status */}
        <div className="relative flex items-center flex-shrink-0">
          <SafeConnectButton />
        </div>
      </div>
    </header>
  )
}
