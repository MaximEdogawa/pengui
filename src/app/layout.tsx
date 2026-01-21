'use client'

import { cn } from '@/shared/lib/utils/index'
import ReactQueryProvider from '@/shared/providers/ReactQueryProvider'
import { NetworkProvider } from '@/shared/providers/NetworkProvider'
import { DashboardLayout } from '@/widgets/dashboard-layout'
import { WalletConnectionGuard } from '@/shared/ui'
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
  // CRITICAL: Initialize network preference to mainnet on mount (before any WalletConnect operations)
  // This ensures WalletConnect always uses mainnet unless user explicitly changes to testnet
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasNetworkPreference()) {
      setStoredNetwork('mainnet')
      logger.info('🔧 Network preference initialized to mainnet (default)')
    }
  }, [])

  // Initialize WalletManager and database on mount
  useEffect(() => {
    const { penguiIcon, metadata } = getWalletConnectConfig()
    const walletManager = new WalletManager(penguiIcon, metadata)
    walletManager.detectEvents()

    // Initialize IndexedDB
    if (typeof window !== 'undefined') {
      import('@/shared/lib/database/indexedDB').then(({ initializeDatabase }) => {
        initializeDatabase().catch(() => {
          logger.error('IndexedDB initialization failed. Offers may not persist.')
        })
      })
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
                // CRITICAL: Ensure network preference is set to mainnet by default before any WalletConnect operations
                // This ensures WalletConnect always uses mainnet unless user explicitly changes to testnet
                if (!hasNetworkPreference()) {
                  setStoredNetwork('mainnet')
                }
                
                // Get the app's network preference from localStorage (should be mainnet by default)
                const appNetwork = getStoredNetwork()
                const appChainId = networkToChainId(appNetwork)
                
                // CRITICAL: Clear any WalletConnect sessions stored in localStorage that use testnet
                // This prevents the WalletConnect package from using old testnet sessions
                // We need to be aggressive here because the package might default to testnet
                if (typeof window !== 'undefined' && appNetwork === 'mainnet') {
                  try {
                    const wcStorageKey = 'walletconnect'
                    const wcStorage = localStorage.getItem(wcStorageKey)
                    if (wcStorage) {
                      // Check if storage contains "testnet" string anywhere (most reliable check)
                      if (wcStorage.includes('testnet') || wcStorage.includes('chia:testnet')) {
                        logger.info('🧹 Clearing WalletConnect storage: found testnet references but app is on mainnet')
                        localStorage.removeItem(wcStorageKey)
                      }
                    }
                  } catch (e) {
                    logger.warn('⚠️ Error checking WalletConnect storage:', e)
                  }
                }
                
                // Restore connection state after Redux Persist has rehydrated
                // This ensures the connection is re-established after page refresh
                const { penguiIcon, metadata } = getWalletConnectConfig()
                
                // Check if there's a stored session and if its chainId matches the app's network
                // This prevents restoration errors when the stored session is for a different network
                const state = store.getState()
                const storedSession = state.walletConnect?.selectedSession
                
                if (storedSession?.namespaces?.chia) {
                  // Try to get chainId from chains array first (most reliable)
                  let storedChainId: string | null = storedSession.namespaces.chia.chains?.[0] || null
                  
                  // If chains array is empty, try to extract from accounts
                  if (!storedChainId && storedSession.namespaces.chia.accounts?.[0]) {
                    const accountParts = storedSession.namespaces.chia.accounts[0].split(':')
                    if (accountParts.length >= 3) {
                      // Account format: "chia:chainId:fingerprint" or "chia:mainnet:fingerprint"
                      storedChainId = `chia:${accountParts[1] === 'chia' ? accountParts[2] : accountParts[1]}`
                    }
                  }
                  
                  // If we found a stored chainId and it doesn't match app's network, skip restoration
                  if (storedChainId && storedChainId !== appChainId) {
                    logger.info(
                      `⏭️ Skipping connection restoration: stored session is ${storedChainId} but app is configured for ${appChainId}. ` +
                      `User will need to reconnect with the correct network.`
                    )
                    return // Skip restoration to avoid chainId mismatch errors
                  }
                }
                
                try {
                  await restoreConnectionStateImmediate({
                    walletConnectIcon: penguiIcon,
                    walletConnectMetadata: metadata,
                  })
                  
                  // Ensure events are detected after restoration
                  const walletManager = new WalletManager(penguiIcon, metadata)
                  await walletManager.detectEvents()
                } catch (error) {
                  // If restoration fails, log it but don't break the app
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  if (errorMessage.includes('chainId') || errorMessage.includes('isValidRequest')) {
                    logger.warn(
                      `⚠️ Connection restoration failed. App network: ${appNetwork} (${appChainId}). ` +
                      `This will be resolved when NetworkProvider initializes. Error: ${errorMessage}`
                    )
                  } else {
                    // Re-throw non-chainId errors
                    throw error
                  }
                }
              }}
            >
              <div className="wallet-connect-scope">
                <ReactQueryProvider>
                  <NetworkProvider>
                    <WalletConnectionGuard>
                      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
                    </WalletConnectionGuard>
                  </NetworkProvider>
                </ReactQueryProvider>
              </div>
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
