'use client'

import { useWalletConnection } from '@/features/wallet'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * WalletConnectionGuard - Route guard that handles redirects based on wallet connection state
 * - If connected and on login page → redirect to dashboard (but wait for modal to close)
 * - If not connected and not on login page → redirect to login (protects all routes)
 * Works on initial load and page refresh
 */
export default function WalletConnectionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isConnected } = useWalletConnection()
  const [isHydrated, setIsHydrated] = useState(false)
  const [wasConnected, setWasConnected] = useState(false)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const checkModalIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Wait for Redux store to rehydrate from persistence
  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 200)
    return () => clearTimeout(timer)
  }, [])

  // Check if wallet connect modal is open
  const isModalOpen = () => {
    if (typeof window === 'undefined') return false
    // Check for WalletConnect modal elements (WalletConnect modal uses various selectors)
    const modalSelectors = [
      '[data-wcm-modal]',
      '.wcm-modal',
      '[id*="walletconnect"]',
      '[class*="walletconnect"]',
      '[class*="wcm"]',
      // Check for modal overlay/backdrop
      '[class*="modal-overlay"]',
      '[class*="modal-backdrop"]',
    ]

    for (const selector of modalSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        // Check if element is visible (not hidden)
        const style = window.getComputedStyle(element)
        const isVisible =
          style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
        const ariaHidden = element.getAttribute('aria-hidden')
        if (isVisible && ariaHidden !== 'true') {
          return true
        }
      }
    }
    return false
  }

  // Handle redirects based on connection state
  useEffect(() => {
    if (!isHydrated) return

    const isLoginPage = pathname === '/login' || pathname === '/'

    // Track if connection state just changed (new connection)
    const isNewConnection = isConnected && !wasConnected
    if (isNewConnection) {
      setWasConnected(true)
    } else if (!isConnected && wasConnected) {
      setWasConnected(false)
    }

    // If connected → redirect to dashboard (but wait for modal to close if on login page)
    if (isConnected) {
      // If on login page, wait for modal to close before redirecting
      if (isLoginPage) {
        // Clear any existing timeout
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current)
        }
        if (checkModalIntervalRef.current) {
          clearInterval(checkModalIntervalRef.current)
        }

        // If this is a new connection, wait longer to allow modal flow to complete
        const initialDelay = isNewConnection ? 2000 : 500

        // Check if modal is open, and wait for it to close before redirecting
        const checkAndRedirect = () => {
          if (!isModalOpen()) {
            // Modal is closed, safe to redirect
            router.replace('/dashboard')
          } else {
            // Modal is still open, check again in 500ms
            redirectTimeoutRef.current = setTimeout(checkAndRedirect, 500)
          }
        }

        // Start checking after a delay to allow modal to open/close
        redirectTimeoutRef.current = setTimeout(checkAndRedirect, initialDelay)

        // Also set up an interval to check modal state (as backup)
        checkModalIntervalRef.current = setInterval(() => {
          if (!isModalOpen() && isConnected && isLoginPage) {
            if (redirectTimeoutRef.current) {
              clearTimeout(redirectTimeoutRef.current)
            }
            clearInterval(checkModalIntervalRef.current!)
            router.replace('/dashboard')
          }
        }, 500)
      } else {
        // Already on a different page and connected - no redirect needed
        // Just ensure we're not on login page
        if (pathname === '/login' || pathname === '/') {
          router.replace('/dashboard')
        }
      }
      return
    }

    // If not connected and not on login page → redirect to login (protect all routes)
    if (!isConnected && !isLoginPage) {
      // Use window.location for more forceful redirect if router doesn't work
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      } else {
        router.replace('/login')
      }
    }
  }, [isConnected, isHydrated, pathname, router, wasConnected])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
      if (checkModalIntervalRef.current) {
        clearInterval(checkModalIntervalRef.current)
      }
    }
  }, [])

  // Show loading state while checking connection (prevents flash of wrong page)
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
