import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for optimized Docker deployment
  output: 'standalone',
  transpilePackages: ['@maximedogawa/chia-wallet-connect-react', 'lightweight-charts'],
  turbopack: {
    root: __dirname,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-toast',
      '@tanstack/react-query',
      'dexie',
      'clsx',
      'tailwind-merge',
    ],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
