import type { Viewport } from "next";
import Script from "next/script";
import AppProviders from "./AppProviders";
import "./globals.css";
import "@maximedogawa/chia-wallet-connect-react/styles";
import "./wallet-connect.css";

/**
 * Pinch-zoom is deliberately left enabled.
 *
 * This used to set `minimumScale: 1`, `maximumScale: 1` and `userScalable: false`,
 * which fails WCAG 2.1 SC 1.4.4 (Resize Text) and is a real barrier for low-vision
 * users. The comment justifying it said the lock stopped pinch "breaking layout" — but
 * the breakage was the app shell pinning the layout viewport (`position: fixed` on
 * html/body plus a `w-screen h-screen` shell), which left zoomed content nowhere to pan
 * to. That is fixed in globals.css and DashboardLayout, so the lock is no longer needed.
 *
 * `viewportFit: "cover"` draws into the notch and home-indicator areas; the `*-safe`
 * utilities in globals.css keep content out of them.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-extralight" suppressHydrationWarning>
      <head>
        <title>Pengui | Premium Financial Intelligence</title>
        <meta
          name="description"
          content="Pengui - Premium Financial Intelligence. Decentralized lending platform on Chia Network."
        />
        <meta name="theme-color" content="#1e40af" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pengui" />
      </head>
      {/*
        No `100vw` and no `overflow-x-hidden`: `100vw` includes the classic scrollbar
        width, so it overflows, and the hidden overflow then made that invisible. Sizing
        comes from globals.css instead, and horizontal overflow is now a visible bug —
        asserted against by the mobile overflow suite.
      */}
      <body className="w-full font-sans">
        {/* beforeInteractive scripts must live in this file (Next.js requirement). */}
        <Script
          id="disable-lit-dev-mode"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.litDisableBundleWarning = true;
              }
            `,
          }}
        />
        {/*
          A `prevent-webkit-gesture-zoom` script used to sit here, cancelling
          `gesturestart` / `gesturechange` with capture. Those events are WebKit-only —
          Safari and iOS, which is exactly Sage on iPhone — so it was a second pinch-zoom
          blocker behind the viewport lock. Removed for the same accessibility reason.
        */}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
