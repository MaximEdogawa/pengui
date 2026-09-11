import { defineConfig, devices } from "@playwright/experimental-ct-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

/**
 * Playwright Component Testing configuration.
 *
 * Tests live in tests/ct/ and use the .ct.spec.tsx extension.
 * Components are mounted in a Vite sandbox (not Next.js) so they must be
 * pure React — no next/dynamic, next/navigation, useRouter, etc.
 *
 * @see https://playwright.dev/docs/test-components
 */
export default defineConfig({
  testDir: "./tests/ct",
  snapshotDir: "./tests/ct/__snapshots__",
  timeout: 10_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { outputFolder: "playwright-ct-report" }], ["list"]],

  use: {
    ctPort: 3100,
    ctTemplateDir: "./tests/ct/template",
    ctViteConfig: {
      server: {
        host: "127.0.0.1",
      },
      preview: {
        host: "127.0.0.1",
      },
      // The sandbox is a plain browser: Next's `process.env.*` reads are not
      // inlined here, so give the modules under test an empty env instead of a
      // `process is not defined` crash. Stories set what they need explicitly.
      define: {
        "process.env": JSON.stringify({ NODE_ENV: "test" }),
      },
      resolve: {
        alias: {
          // next/image needs the Next image loader/runtime; render a plain <img>.
          "next/image": path.resolve(__dirname, "./src/test-utils/mocks/next-image.tsx"),
          "@": path.resolve(__dirname, "./src"),
          "@/widgets": path.resolve(__dirname, "./src/widgets"),
          "@/features": path.resolve(__dirname, "./src/features"),
          "@/entities": path.resolve(__dirname, "./src/entities"),
          "@/shared": path.resolve(__dirname, "./src/shared"),
        },
      },
      css: {
        postcss: {
          plugins: [tailwindcss(), autoprefixer()],
        },
      },
      optimizeDeps: {
        include: ["lucide-react", "next-themes", "zustand", "clsx", "tailwind-merge"],
      },
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
