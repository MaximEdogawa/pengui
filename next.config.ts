import type { NextConfig } from "next";
import { execSync } from "child_process";
import packageJson from "./package.json";

function getCommitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return process.env.NEXT_PUBLIC_COMMIT_SHA || "unknown";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["@maximedogawa/chia-wallet-connect-react", "lightweight-charts"],
  turbopack: {
    root: __dirname,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-slot",
      "@radix-ui/react-separator",
      "@tanstack/react-query",
      "dexie",
      "clsx",
      "tailwind-merge",
      "recharts",
      "zustand",
    ],
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|avif|ico|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
