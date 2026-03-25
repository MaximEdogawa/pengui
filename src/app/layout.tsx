import type { Viewport } from "next";
import Script from "next/script";
import AppProviders from "./AppProviders";
import "./globals.css";
import "@maximedogawa/chia-wallet-connect-react/styles";
import "./wallet-connect.css";

/** Locks page scale on mobile (and matches prior meta) so pinch does not break layout. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons/icon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/icon-32x32.png"
        />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/icon-192x192.png"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pengui" />
      </head>
      <body
        className="w-full overflow-x-hidden font-sans"
        style={{
          width: "100vw",
          maxWidth: "100vw",
          margin: 0,
          padding: 0,
          borderRight: "none",
        }}
      >
        {/*
          beforeInteractive scripts must live in this file (Next.js requirement).
          WebKit-only: blocks default pinch-zoom when viewport meta is ignored.
          Chart pinch uses touch events on the canvas; gesture events are separate.
        */}
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
        <Script
          id="prevent-webkit-gesture-zoom"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var p=function(e){e.preventDefault();};
  document.addEventListener('gesturestart',p,{passive:false,capture:true});
  document.addEventListener('gesturechange',p,{passive:false,capture:true});
})();
            `.trim(),
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
