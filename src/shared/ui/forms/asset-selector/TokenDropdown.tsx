'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Token {
  assetId: string
  ticker: string
  symbol?: string
  name?: string
}

interface TokenDropdownProps {
  tokens: Token[]
  isOpen: boolean
  onSelect: (token: Token) => void
  onClose: () => void
  searchValue: string
}

export default function TokenDropdown({
  tokens,
  isOpen,
  onSelect,
  onClose,
  searchValue,
}: TokenDropdownProps) {
  const { isDark } = useThemeClasses()
  const [mounted, setMounted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset selected index when tokens change
  useEffect(() => {
    setSelectedIndex(0)
  }, [tokens])

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % tokens.length)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + tokens.length) % tokens.length)
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        if (tokens[selectedIndex]) {
          onSelect(tokens[selectedIndex])
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll when dropdown is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, tokens, selectedIndex, onSelect])

  if (!mounted || !isOpen || tokens.length === 0) {
    return null
  }

  const dropdownContent = (
    <>
      {/* Backdrop - Highest layer, covers everything */}
      <div
        className={`absolute inset-0 z-[9998] flex items-center justify-center p-4 ${
          isDark ? 'bg-black/50' : 'bg-black/30'
        } backdrop-blur-sm`}
        onClick={onClose}
      />
      {/* Dropdown - Above everything including modals, centered and smaller with glass effect */}
      <div
        className={`absolute z-[9999] rounded-lg shadow-xl overflow-y-auto max-w-3xl w-full max-h-[60vh] backdrop-blur-[40px] border transition-all duration-300 ${
          isDark ? 'bg-white/10 border-white/20' : 'bg-white/60 border-white/70'
        }`}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Label showing search input value - only show if not empty */}
        {searchValue && (
          <div
            className={`px-3 py-2 border-b ${
              isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Search: <span className={isDark ? 'text-white' : 'text-gray-900'}>{searchValue}</span>
            </label>
          </div>
        )}
        {/* Token List */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: searchValue ? 'calc(60vh - 60px)' : 'calc(60vh - 20px)' }}
        >
          {tokens.map((token, index) => {
            const isSelected = index === selectedIndex
            return (
              <div
                key={token.assetId || 'xch'}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={() => {
                  onSelect(token)
                  onClose()
                }}
                className={`px-3 py-2 cursor-pointer text-xs transition-colors border-b ${
                  isSelected
                    ? isDark
                      ? 'bg-gray-700/80 text-white border-gray-600'
                      : 'bg-gray-200 text-gray-900 border-gray-300'
                    : isDark
                      ? 'text-white border-gray-700 hover:bg-gray-700/50 active:bg-gray-600'
                      : 'text-gray-900 border-gray-200 hover:bg-gray-100 active:bg-gray-200'
                } last:border-b-0`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div
                    className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {token.ticker}
                  </div>
                  {token.assetId && (
                    <div
                      className={`text-xs font-mono flex-shrink-0 ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {token.assetId.slice(0, 8)}...
                    </div>
                  )}
                </div>
                {token.name && token.name !== token.ticker && (
                  <div
                    className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {token.name}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  return createPortal(dropdownContent, document.body)
}
