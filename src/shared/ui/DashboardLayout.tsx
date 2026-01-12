'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { ConnectButton } from '@maximedogawa/chia-wallet-connect-react'
import {
  Bell,
  FileCheck,
  FileText,
  Handshake,
  Home,
  Menu,
  Moon,
  PiggyBank,
  Search,
  Sun,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PenguinLogo from './PenguinLogo'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const { theme: currentTheme, systemTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle scroll detection for modern scrollbar
  useEffect(() => {
    const mainElement = document.querySelector('main')
    if (!mainElement) return

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 1000) // Hide scrollbar 1 second after scrolling stops
    }

    mainElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      mainElement.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [mounted])

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
    { id: 'offers', icon: Handshake, label: 'Offers', path: '/offers' },
    { id: 'trading', icon: TrendingUp, label: 'Trading', path: '/trading' },
    { id: 'loans', icon: FileText, label: 'Loans', path: '/loans' },
    {
      id: 'option-contracts',
      icon: FileCheck,
      label: 'Option Contracts',
      path: '/option-contracts',
    },
    { id: 'piggy-bank', icon: PiggyBank, label: 'Piggy Bank', path: '/piggy-bank' },
    { id: 'wallet', icon: Wallet, label: 'Wallet', path: '/wallet' },
  ]

  const getActiveItem = () => {
    return menuItems.find((item) => pathname === item.path)?.id || 'dashboard'
  }

  const activeItem = getActiveItem()

  const handleNavigation = (path: string) => {
    router.push(path)
    setSidebarOpen(false)
  }

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`flex h-screen w-full ${t.bg} overflow-hidden transition-colors duration-300`}
      style={{
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        borderRight: 'none',
        right: 0,
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
      }}
    >
      {/* Subtle static background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          width: '100vw',
          maxWidth: '100vw',
          right: 0,
          margin: 0,
          padding: 0,
          borderRight: 'none',
        }}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${t.gradientBg}`}
          style={{
            width: '100vw',
            maxWidth: '100vw',
            right: 0,
            margin: 0,
            padding: 0,
            borderRight: 'none',
          }}
        ></div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 ${
          sidebarCollapsed ? 'lg:w-12' : 'lg:w-56'
        } w-16 transition-all duration-300 ease-in-out backdrop-blur-3xl ${t.sidebar} flex flex-col overflow-hidden flex-shrink-0 mobile-landscape-sidebar`}
      >
        {/* Logo - Fixed at top */}
        <div
          className={`h-12 flex-shrink-0 flex items-center border-b ${t.border} transition-all duration-300 ${
            sidebarCollapsed
              ? 'lg:justify-center lg:px-0'
              : 'justify-center lg:justify-start px-2 lg:px-3'
          }`}
        >
          {sidebarCollapsed ? (
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 lg:w-9 lg:h-9 rounded-full overflow-hidden flex items-center justify-center">
                <PenguinLogo size={32} className={`${t.text} rounded-full lg:!w-7 lg:!h-7`} />
              </div>
            </div>
          ) : (
            <div className="flex items-center lg:items-center gap-2.5">
              <div className="w-12 h-12 lg:w-10 lg:h-10 rounded-full overflow-hidden flex items-center justify-center">
                <PenguinLogo size={32} className={`${t.text} rounded-full lg:!w-7 lg:!h-7`} />
              </div>
              <span className="hidden lg:inline font-semibold text-lg lg:text-base transition-all duration-300 whitespace-nowrap">
                Pengui
              </span>
            </div>
          )}
        </div>

        {/* Menu Items - Scrollable on mobile landscape */}
        <nav
          className={`flex-1 space-y-0.5 transition-all duration-300 overflow-y-auto overflow-x-hidden scrollbar-modern mobile-landscape-scrollable ${
            sidebarCollapsed ? 'lg:p-1.5' : 'p-1 lg:p-2'
          }`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex items-center ${
                  sidebarCollapsed
                    ? 'lg:w-8 lg:h-8 lg:mx-auto lg:justify-center lg:items-center lg:px-0 lg:py-0 lg:gap-0'
                    : 'w-full justify-center lg:justify-start lg:px-3'
                } px-0 py-3 lg:py-2 lg:gap-2.5 ${
                  sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
                } transition-all duration-200 group relative overflow-hidden ${
                  isActive ? `${t.text}` : `${t.textSecondary} ${t.cardHover}`
                }`}
                title={item.label}
              >
                {/* Glass highlight background for active item */}
                {isActive && (
                  <>
                    <div
                      className={`absolute inset-0 backdrop-blur-xl bg-white/10 ${
                        sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
                      } border border-white/10`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-b from-white/5 to-transparent ${
                        sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
                      }`}
                    />
                  </>
                )}
                <Icon
                  className={`w-6 h-6 lg:w-3.5 lg:h-3.5 flex-shrink-0 transition-all duration-200 ${
                    sidebarCollapsed
                      ? 'lg:absolute lg:inset-0 lg:m-auto'
                      : 'relative mx-auto lg:mx-0'
                  } ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                />
                {!sidebarCollapsed && (
                  <span className="hidden lg:inline relative font-normal text-sm lg:text-xs transition-all duration-300 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Profile - Fixed at bottom */}
        <div
          className={`flex-shrink-0 border-t ${t.border} transition-all duration-300 mb-4 mobile-landscape-profile ${
            sidebarCollapsed ? 'lg:p-1.5' : 'p-1 lg:p-2'
          }`}
        >
          <div
            onClick={() => {
              router.push('/profile')
              setSidebarOpen(false)
            }}
            className={`flex items-center ${
              sidebarCollapsed
                ? 'lg:w-10 lg:h-10 lg:mx-auto lg:justify-center lg:items-center lg:px-0 lg:py-0 lg:gap-0'
                : 'justify-center lg:justify-start lg:px-2.5'
            } px-0 py-2 lg:gap-2.5 ${
              sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
            } transition-all cursor-pointer group relative overflow-hidden ${t.cardHover}`}
            title={sidebarCollapsed ? 'User' : 'Profile'}
          >
            {/* Glass effect overlay - enhanced */}
            <div
              className={`absolute inset-0 backdrop-blur-xl bg-white/10 ${
                sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
              } border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
            />
            <div
              className={`absolute inset-0 bg-gradient-to-b from-white/5 to-transparent ${
                sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
              } opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
            />
            {sidebarCollapsed ? (
              <div className="flex items-center justify-center">
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-xl`}
                >
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-3 lg:gap-3 flex-1 min-w-0 relative">
                <div
                  className={`w-10 h-10 lg:w-6 lg:h-6 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-xl`}
                >
                  <User className="w-6 h-6 lg:w-3.5 lg:h-3.5 text-white" />
                </div>
                <div className="hidden lg:block transition-all duration-300 whitespace-nowrap">
                  <p className={`text-sm lg:text-xs font-normal ${t.text}`}>User</p>
                  <p className={`text-xs lg:text-[10px] ${t.textSecondary}`}>Premium</p>
                </div>
                {/* Theme Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTheme()
                  }}
                  className={`relative inline-flex h-5 w-9 lg:h-4 lg:w-7 items-center rounded-full backdrop-blur-3xl transition-all duration-300 focus:outline-none focus:ring-2 ${t.focusRing} overflow-hidden flex-shrink-0 ml-2 lg:ml-3 ${
                    isDark
                      ? 'bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 shadow-lg shadow-amber-500/20'
                      : 'bg-gradient-to-r from-white/20 via-white/30 to-white/20 border border-white/30 shadow-lg shadow-slate-900/20'
                  }`}
                  title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                  aria-label="Toggle theme"
                >
                  {/* Glass reflection effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-full pointer-events-none" />
                  <span
                    className={`relative inline-block h-3 w-3 lg:h-2.5 lg:w-2.5 transform rounded-full backdrop-blur-3xl transition-all duration-300 shadow-lg ${
                      isDark
                        ? 'translate-x-[20px] lg:translate-x-[16px] bg-gradient-to-br from-white/30 via-white/20 to-white/10 border border-white/40'
                        : 'translate-x-0.5 bg-gradient-to-br from-white/50 via-white/40 to-white/30 border border-white/60'
                    } flex items-center justify-center`}
                  >
                    {/* Inner glass highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-full opacity-60" />
                    {isDark ? (
                      <Sun
                        className="relative h-2.5 w-2.5 lg:h-2 lg:w-2 text-amber-300 drop-shadow-sm"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Moon
                        className="relative h-2.5 w-2.5 lg:h-2 lg:w-2 text-slate-700 drop-shadow-sm"
                        strokeWidth={2.5}
                      />
                    )}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative z-10 w-full"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          marginRight: 0,
          paddingRight: 0,
          borderRight: 'none',
          position: 'relative',
        }}
      >
        {/* Top Bar - Fixed, not scrollable, overlays scrollbar - Top layer */}
        <header
          className={`h-12 backdrop-blur-3xl ${t.card} border-b ${t.border} flex items-center justify-between pl-2 sm:pl-3 lg:pl-4 pr-2 sm:pr-3 lg:pr-4 gap-1.5 sm:gap-2 transition-all duration-300 w-full flex-shrink-0`}
          style={{
            borderRight: 'none',
            marginRight: 0,
            paddingRight: 0,
            overflow: 'hidden',
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
            zIndex: 9999,
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <button
              onClick={() => {
                // On mobile: toggle sidebar open/closed
                // On desktop: toggle sidebar collapsed/expanded
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setSidebarCollapsed(!sidebarCollapsed)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
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
            {/* Wallet Connection Status */}
            <div className="relative flex items-center flex-shrink-0">
              <ConnectButton />
            </div>
          </div>
        </header>

        {/* Content Area - Only this area is scrollable, scrollbar appears under header */}
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden pt-1 lg:pt-2 pb-2 lg:pb-4 pl-2 lg:pl-3 pr-3 w-full scrollbar-modern ${isScrolling ? 'scrollbar-visible' : ''}`}
          style={{
            borderRight: 'none',
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
            zIndex: 1,
            minHeight: 0,
            scrollbarGutter: 'auto',
          }}
        >
          <div className="w-full max-w-full h-full flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  )
}
