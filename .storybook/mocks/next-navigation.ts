// Mock implementation of Next.js navigation hooks for Storybook

const mockRouter = {
  push: (path: string, options?: { scroll?: boolean }) => {
    console.log('[Storybook Mock] Router.push:', path, options)
  },
  replace: (path: string) => {
    console.log('[Storybook Mock] Router.replace:', path)
  },
  refresh: () => {
    console.log('[Storybook Mock] Router.refresh')
  },
  back: () => {
    console.log('[Storybook Mock] Router.back')
  },
  forward: () => {
    console.log('[Storybook Mock] Router.forward')
  },
  prefetch: (path: string) => {
    console.log('[Storybook Mock] Router.prefetch:', path)
  },
}

let mockPathname = '/dashboard'

export function useRouter() {
  return mockRouter
}

export function usePathname() {
  return mockPathname
}

export function useSearchParams() {
  return new URLSearchParams()
}

// Allow setting pathname for different stories
export function setMockPathname(pathname: string) {
  mockPathname = pathname
}
