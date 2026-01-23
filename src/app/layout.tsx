'use client'

import { cn } from '@/shared/lib/utils/index'
import ReactQueryProvider from '@/shared/providers/ReactQueryProvider'
import { NetworkProvider } from '@/shared/providers/NetworkProvider'
import { DashboardLayout } from '@/widgets/dashboard-layout'
import { WalletConnectionGuard, ErrorBoundary } from '@/shared/ui'
import {
  WalletManager,
  persistor,
  restoreConnectionStateImmediate,
  store,
} from '@maximedogawa/chia-wallet-connect-react'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import './globals.css'
// Import wallet connect package styles directly
// Using the package export path which maps to dist/styles/globals.css
import { logger } from '@/shared/lib/logger'
import { getStoredNetwork, hasNetworkPreference, setStoredNetwork } from '@/shared/lib/utils/networkStorage'
import { networkToChainId } from '@/shared/lib/utils/networkUtils'
import '@maximedogawa/chia-wallet-connect-react/styles'
import './wallet-connect.css'


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Wallet metadata configuration (shared between WalletManager and restoreConnectionState)
const getWalletConnectConfig = () => {
  if (typeof window === 'undefined') {
    return {
      penguiIcon: '/pengui-logo.png',
      metadata: {
        name: 'Pengui',
        description: 'Penguin Pool - Decentralized lending platform on Chia Network',
        url: 'https://penguin.pool',
        icons: ['/pengui-logo.png'],
      },
    }
  }

  const penguiIcon = `${window.location.origin}/pengui-logo.png`
  return {
    penguiIcon,
    metadata: {
      name: 'Pengui',
      description: 'Penguin Pool - Decentralized lending platform on Chia Network',
      url: window.location.origin,
      icons: [penguiIcon],
    },
  }
}

export default function UILayout({ children }: { children: React.ReactNode }) {
  // Initialize network preference to mainnet on mount (before any WalletConnect operations)
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasNetworkPreference()) {
      setStoredNetwork('mainnet')
    }
  }, [])

  // Initialize WalletManager and database on mount
  // CRITICAL: Ensure network is set before WalletManager initialization
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Ensure network preference is set before WalletManager initialization
    if (!hasNetworkPreference()) {
      setStoredNetwork('mainnet')
    }

    try {
      const { penguiIcon, metadata } = getWalletConnectConfig()
      const walletManager = new WalletManager(penguiIcon, metadata)
      walletManager.detectEvents()

      // Initialize IndexedDB
      import('@/shared/lib/database/indexedDB').then(({ initializeDatabase }) => {
        initializeDatabase().catch(() => {
          logger.error('IndexedDB initialization failed. Offers may not persist.')
        })
      })
    } catch (error) {
      logger.error('❌ Failed to initialize WalletManager:', error)
      // Don't throw - let ErrorBoundary handle render errors
    }
  }, [])

  return (
    <html lang="en" className="font-extralight" suppressHydrationWarning>
      <head>
        <title>Pengui | Premium Financial Intelligence</title>
        <meta
          name="description"
          content="Pengui - Premium Financial Intelligence. Decentralized lending platform on Chia Network."
        />
        <meta name="theme-color" content="#1e40af" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pengui" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body
        className={cn(inter.variable, 'w-full overflow-x-hidden font-sans')}
        style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, borderRight: 'none' }}
      >
        <Script
          id="disable-lit-dev-mode"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.litDisableBundleWarning = true;
              }
            `,
          }}
        />

        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Provider store={store}>
            <PersistGate
              loading={null}
              persistor={persistor}
              onBeforeLift={async () => {
                // Ensure network preference is set to mainnet by default
                if (!hasNetworkPreference()) {
                  setStoredNetwork('mainnet')
                }
                
                const appNetwork = getStoredNetwork()
                const appChainId = networkToChainId(appNetwork)
                
                // Clear WalletConnect storage if it contains testnet references when app is on mainnet
                if (typeof window !== 'undefined' && appNetwork === 'mainnet') {
                  try {
                    const wcStorage = localStorage.getItem('walletconnect')
                    if (wcStorage && (wcStorage.includes('testnet') || wcStorage.includes('chia:testnet'))) {
                      localStorage.removeItem('walletconnect')
                    }
                  } catch {
                    // Silently handle storage errors
                  }
                }
                
                // Restore connection state after Redux Persist has rehydrated
                const { penguiIcon, metadata } = getWalletConnectConfig()
                const state = store.getState()
                const storedSession = state.walletConnect?.selectedSession
                
                // Check if stored session's chainId matches app's network
                if (storedSession?.namespaces?.chia) {
                  let storedChainId: string | null = storedSession.namespaces.chia.chains?.[0] || null
                  
                  if (!storedChainId && storedSession.namespaces.chia.accounts?.[0]) {
                    const accountParts = storedSession.namespaces.chia.accounts[0].split(':')
                    if (accountParts.length >= 3) {
                      storedChainId = `chia:${accountParts[1] === 'chia' ? accountParts[2] : accountParts[1]}`
                    }
                  }
                  
                  // Skip restoration if chainId doesn't match
                  if (storedChainId && storedChainId !== appChainId) {
                    return
                  }
                }
                
                try {
                  await restoreConnectionStateImmediate({
                    walletConnectIcon: penguiIcon,
                    walletConnectMetadata: metadata,
                  })
                  
                  const walletManager = new WalletManager(penguiIcon, metadata)
                  await walletManager.detectEvents()
                } catch (error) {
                  // Only re-throw non-chainId errors
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  if (!errorMessage.includes('chainId') && !errorMessage.includes('isValidRequest')) {
                    throw error
                  }
                }
              }}
            >
              <ErrorBoundary>
                <div className="wallet-connect-scope">
                  <ReactQueryProvider>
                    <NetworkProvider>
                      <WalletConnectionGuard>
                        <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
                      </WalletConnectionGuard>
                    </NetworkProvider>
                  </ReactQueryProvider>
                </div>
              </ErrorBoundary>
            </PersistGate>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}

function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login' || pathname === '/'

  if (isLoginPage) {
    return <>{children}</>
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
