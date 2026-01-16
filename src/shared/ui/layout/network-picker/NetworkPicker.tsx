'use client'

import { useNetwork } from '@/shared/hooks/useNetwork'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { useState, useRef } from 'react'
import { NETWORK_OPTIONS } from './constants'
import { useNetworkSwitch } from './useNetworkSwitch'
import { useClickOutside } from './useClickOutside'

export default function NetworkPicker() {
  const { network, setNetwork, isMainnet } = useNetwork()
  const { theme: currentTheme, systemTheme } = useTheme()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Extract network switching logic
  const { isSwitching, switchNetwork } = useNetworkSwitch({
    setNetwork,
    onSwitchComplete: () => setIsOpen(false),
  })

  // Extract click outside handler
  useClickOutside({
    isOpen,
    onClose: () => setIsOpen(false),
    containerRef,
    buttonRef,
    dropdownRef,
  })

  const handleNetworkSelect = async (newNetwork: 'mainnet' | 'testnet') => {
    if (newNetwork === network || isSwitching) {
      setIsOpen(false)
      return
    }

    // Switch network directly
    await switchNetwork(newNetwork)
  }

  return (
    <>
      <div className="relative" style={{ zIndex: 10000 }} ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSwitching}
          className={`
            relative flex items-center gap-1.5 px-2 py-1 rounded-lg
            backdrop-blur-[40px] transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              isDark
                ? 'bg-white/10 border border-white/20 text-white shadow-lg shadow-black/20'
                : 'bg-white/60 border border-white/70 text-slate-800 shadow-lg shadow-black/10'
            }
            hover:scale-[1.02] active:scale-[0.98]
            ${isOpen ? 'ring-1 ring-cyan-400/30' : ''}
          `}
          aria-label="Select network"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {isSwitching ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px] font-medium">Switching...</span>
            </>
          ) : (
            <>
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isMainnet ? NETWORK_OPTIONS[0].color : NETWORK_OPTIONS[1].color
                }`}
              />
              <span className="text-[10px] font-medium tracking-tight">
                {isMainnet ? 'Mainnet' : 'Testnet'}
              </span>
              <ChevronDown
                className={`w-2.5 h-2.5 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>

        {isOpen && !isSwitching && (
          <div
            ref={dropdownRef}
            className={`
              absolute top-full mt-1.5 rounded-xl
              backdrop-blur-[40px] overflow-hidden
              shadow-2xl
              border transition-all duration-200
              min-w-[140px]
              z-[10001]
              ${
                isLoginPage
                  ? 'left-1/2 -translate-x-1/2'
                  : 'right-0'
              }
              ${
                isDark
                  ? 'bg-white/10 border-white/20 shadow-black/40'
                  : 'bg-white/70 border-white/80 shadow-black/20'
              }
              animate-in fade-in slide-in-from-top-2
            `}
            style={{
              boxShadow: isDark
                ? '0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                : '0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="py-0.5">
              {NETWORK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleNetworkSelect(option.value)}
                  className={`
                    w-full px-2.5 py-1.5 text-left
                    flex items-center justify-between gap-2
                    transition-all duration-150
                    ${
                      isDark
                        ? network === option.value
                          ? 'bg-cyan-500/20 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        : network === option.value
                          ? 'bg-cyan-500/20 text-slate-900'
                          : 'text-slate-700 hover:bg-white/50 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${option.color}`} />
                    <span className="text-[10px] font-medium tracking-tight">
                      {option.label}
                    </span>
                  </div>
                  {network === option.value && (
                    <Check className="w-3 h-3 text-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
