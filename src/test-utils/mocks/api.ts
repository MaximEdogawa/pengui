/**
 * Mock implementations for API calls
 */

export interface MockApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function createMockApiResponse<T>(
  data: T,
  success: boolean = true
): MockApiResponse<T> {
  return {
    success,
    data,
  }
}

export function createMockApiError(error: string): MockApiResponse<never> {
  return {
    success: false,
    error,
  }
}

// Mock fetch for tests
// Returns setup and teardown functions to be used in test files
export function setupMockFetch() {
  const originalFetch = global.fetch

  const setup = () => {
    global.fetch = (() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
      }) as unknown as Promise<Response>
    }) as typeof fetch
  }

  const teardown = () => {
    global.fetch = originalFetch
  }

  return { setup, teardown }
}
