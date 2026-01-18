import React from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@maximedogawa/chia-wallet-connect-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { NetworkProvider } from '../src/shared/providers/NetworkProvider'
import { ThemeProvider } from 'next-themes'

// Storybook-specific ReactQueryProvider without devtools
function StorybookReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <StorybookReactQueryProvider>
            <NetworkProvider>
              <div className="p-4">
                {children}
              </div>
            </NetworkProvider>
          </StorybookReactQueryProvider>
        </PersistGate>
      </Provider>
    </ThemeProvider>
  )
}
