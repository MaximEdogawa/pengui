/**
 * Test utility to render components with all necessary providers
 * Mimics the app's provider structure for testing
 */

import React, { type ReactElement } from 'react'
import { render, type RenderOptions, cleanup } from '@testing-library/react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@maximedogawa/chia-wallet-connect-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NetworkProvider } from '@/shared/providers/NetworkProvider'
import { ThemeProvider } from 'next-themes'

// Create a test QueryClient with default options
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

export function AllTheProviders({
  children,
  queryClient = createTestQueryClient(),
}: AllTheProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <NetworkProvider>{children}</NetworkProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </ThemeProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, ...renderOptions }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'

// Override render method
export { renderWithProviders as render, cleanup }
