import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // Transpile the package - this tells Next.js to compile it
  transpilePackages: ['@maximedogawa/chia-wallet-connect-react'],
  // Configure Turbopack (default in Next.js 16)
  turbopack: {
    // Set root to silence warning about multiple lockfiles
    root: __dirname,
  },
  // Note: The package uses standard <img> tags, not Next.js Image component
  // So image configuration is not needed here. Images load directly from URLs.
}

export default nextConfig
