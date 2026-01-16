import { Menu, Search, Bell } from 'lucide-react'
import { ConnectButton } from '@maximedogawa/chia-wallet-connect-react'
import NetworkPicker from '../../NetworkPicker'
import type { ThemeClasses } from '@/shared/lib/theme'

interface HeaderProps {
  t: ThemeClasses
  onMenuClick: () => void
}

export function Header({ t, onMenuClick }: HeaderProps) {
  return (
    <header
      className={`h-12 backdrop-blur-3xl ${t.card} border-b ${t.border} flex items-center justify-between pl-2 sm:pl-3 lg:pl-4 pr-2 sm:pr-3 lg:pr-4 gap-1.5 sm:gap-2 transition-all duration-300 w-full max-w-full flex-shrink-0 border-r-0 mr-0 pr-0 overflow-visible relative z-[9999]`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className={`p-1.5 rounded-lg ${t.cardHover} transition-colors ${t.textSecondary} ${t.textHover} flex-shrink-0`}
        >
          <Menu className="w-5 h-5 lg:w-4 lg:h-4" />
        </button>

        {/* Search Bar - Responsive design */}
        <div className="relative flex-1 max-w-full min-w-0">
          <Search
            className={`w-5 h-5 lg:w-4 lg:h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textSecondary} pointer-events-none z-10`}
          />
          <input
            type="text"
            placeholder="Search..."
            className={`w-full pl-9 pr-3 py-1.5 text-base lg:text-sm rounded-lg backdrop-blur-xl ${t.input} ${t.text} placeholder:${t.textSecondary} focus:outline-none focus:ring-2 ${t.focusRing} transition-all`}
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          className={`p-1.5 rounded-lg ${t.cardHover} transition-colors ${t.textSecondary} ${t.textHover} relative flex-shrink-0`}
        >
          <Bell className="w-5 h-5 lg:w-4 lg:h-4" />
          <span
            className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-gradient-to-br ${t.accent} rounded-full`}
          ></span>
        </button>
        {/* Network Picker */}
        <div className="relative flex items-center flex-shrink-0">
          <NetworkPicker />
        </div>
        {/* Wallet Connection Status */}
        <div className="relative flex items-center flex-shrink-0">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
