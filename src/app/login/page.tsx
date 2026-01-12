'use client'

import PenguinLogo from '@/shared/ui/PenguinLogo'
import { ConnectButton } from '@maximedogawa/chia-wallet-connect-react'

export default function LoginPage() {
  return (
    <div
      className="h-screen flex items-center justify-center px-3 py-8 sm:px-4 sm:py-12 md:px-6 md:py-16 lg:px-20 xl:px-80 backdrop-blur-3xl bg-cover bg-center bg-no-repeat relative overflow-hidden w-full"
      style={{
        backgroundImage: "url('/signin-glass.jpg')",
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        borderRight: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-pink-500/10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="px-4 sm:px-6 md:px-8 lg:px-10 flex py-6 sm:py-8 md:py-10 flex-col items-center gap-4 sm:gap-5 w-full backdrop-blur-2xl rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-gray-900/10 dark:via-gray-900/5 dark:to-transparent border border-white/20 dark:border-gray-700/20 shadow-2xl shadow-black/20 max-w-md relative z-10 ">
        {/* Logo and Title Section */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
          <div className="relative group">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-xl sm:rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-500/25 via-purple-500/25 to-pink-500/25 backdrop-blur-lg border-2 border-white/40 shadow-xl sm:shadow-2xl shadow-purple-500/20 group-hover:border-white/60 group-hover:shadow-purple-500/30 transition-all duration-300 overflow-hidden p-2.5 sm:p-3 md:p-2.5">
              <PenguinLogo fill priority className="drop-shadow-xl sm:drop-shadow-2xl" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-none tracking-tight">
              <span className="bg-[linear-gradient(to_right,white,rgb(191_219_254),rgb(221_214_254),rgb(251_207_232))] bg-clip-text text-transparent">
                Pengui
              </span>
            </h1>
            {/* Decorative accent line */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <div className="h-px w-8 sm:w-10 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
              <div className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-purple-400/50" />
              <div className="h-px w-12 sm:w-14 bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
              <div className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-pink-400/50" />
              <div className="h-px w-8 sm:w-10 bg-gradient-to-r from-transparent via-pink-400/40 to-transparent" />
            </div>
          </div>
        </div>

        {/* Wallet Connection Section */}
        <div className="flex flex-col items-center w-full gap-3 sm:gap-4">
          <div className="flex flex-col w-full">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl w-full">
              {/* Gradient border effect */}
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px] opacity-60 pointer-events-none">
                <div className="h-full w-full rounded-2xl sm:rounded-3xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95" />
              </div>

              {/* Main content container */}
              <div
                className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-gray-800/20 dark:via-gray-800/10 dark:to-transparent backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/20 dark:border-gray-700/30 p-4 sm:p-5 md:p-6 min-h-[60px] sm:min-h-[70px]"
                style={{ touchAction: 'manipulation' }}
              >
                <div
                  className="relative z-10 flex items-center justify-center w-full h-full"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-1">
          <p className="text-white/55 dark:text-gray-400 text-[9px] sm:text-[10px] md:text-[11px] leading-relaxed tracking-wide">
            Connect your wallet to get started
          </p>
        </div>
      </div>
    </div>
  )
}
