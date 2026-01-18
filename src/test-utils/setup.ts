import '@testing-library/jest-dom'
import { Window } from 'happy-dom'
import { afterEach } from 'bun:test'

// Initialize DOM environment for Bun tests
if (typeof window === 'undefined') {
  const windowInstance = new Window()
  // @ts-expect-error - happy-dom Window needs to be assigned to global
  global.window = windowInstance as unknown as Window & typeof globalThis
  // @ts-expect-error - happy-dom document needs to be assigned to global
  global.document = windowInstance.document
  // @ts-expect-error - happy-dom navigator needs to be assigned to global
  global.navigator = windowInstance.navigator
  global.localStorage = windowInstance.localStorage
  global.sessionStorage = windowInstance.sessionStorage
  
  // Set up URL environment for Next.js Image component
  // Use Object.defineProperty to properly set location
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: () => {},
      replace: () => {},
      reload: () => {},
    },
    writable: true,
    configurable: true,
  })
}

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as typeof ResizeObserver

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []
  
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as typeof IntersectionObserver

// Clean up DOM after each test to prevent test pollution
// Manually clear document.body to ensure tests don't interfere with each other
afterEach(() => {
  if (typeof document !== 'undefined' && document.body) {
    // Remove all children from body to prevent test pollution
    document.body.replaceChildren()
  }
})
