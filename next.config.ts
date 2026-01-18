import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // Transpile the package - this tells Next.js to compile it
  transpilePackages: ['@maximedogawa/chia-wallet-connect-react', 'lightweight-charts'],
  // Configure Turbopack (default in Next.js 16)
  turbopack: {
    // Set root to silence warning about multiple lockfiles
    root: __dirname,
  },
  // Build optimizations for faster compilation
  compiler: {
    // Remove console logs in production (reduces bundle size and improves performance)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Experimental features for faster builds
  experimental: {
    // Optimize package imports - tree-shake unused exports from these packages
    // This reduces bundle size and speeds up compilation by only importing what's used
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-toast',
      '@tanstack/react-query',
      'dexie',
      'clsx',
      'tailwind-merge',
    ],
    // Enable faster server components compilation
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Note: The package uses standard <img> tags, not Next.js Image component
  // So image configuration is not needed here. Images load directly from URLs.
}

export default nextConfig
