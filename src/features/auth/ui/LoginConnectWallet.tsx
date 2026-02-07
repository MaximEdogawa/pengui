'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import {
  WalletConnect,
  store,
  setPairingUri,
  connectSession as connectSessionAction,
  setConnectedWallet,
  setSelectedFingerprint,
  useWalletConnectionState,
} from '@maximedogawa/chia-wallet-connect-react'
import { getStoredNetwork, hasNetworkPreference, setStoredNetwork } from '@/shared/lib/utils/networkStorage'
import { getRequiredNamespaces } from '@/shared/lib/walletConnect/constants/wallet-connect'
import toast from 'react-hot-toast'
import type { SessionTypes } from '@walletconnect/types'
import { ConnectWalletModal } from './ConnectWalletModal'

/**
 * LoginConnectWallet
 *
 * Renders a stylish "Connect Wallet" button on the login page.
 * Pre-fetches the WalletConnect pairing URI on mount so that
 * clicking the button instantly opens a custom modal with QR + copy URI.
 * Same experience on desktop and mobile — no native WC modal.
 */
export function LoginConnectWallet() {
  const [uri, setUri] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { isConnected } = useWalletConnectionState()
  const mountedRef = useRef(true)
  const initRef = useRef(false)

  const getConfig = useCallback(() => {
    const penguiIcon =
      typeof window !== 'undefined'
        ? `${window.location.origin}/pengui-logo.png`
        : '/pengui-logo.png'
    return {
      penguiIcon,
      metadata: {
        name: 'Pengui',
        description: 'Pengui - Decentralized lending platform on Chia Network',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://penguinpool.space',
        icons: [penguiIcon],
      },
    }
  }, [])

  const processSession = useCallback(
    async (session: SessionTypes.Struct, wc: InstanceType<typeof WalletConnect>) => {
      const { penguiIcon } = getConfig()

      store.dispatch(setPairingUri(null))
      setUri(null)

      await wc.detectEvents()
      await wc.updateSessions()
      store.dispatch(connectSessionAction(session))

      const fingerprint = Number(session.namespaces.chia.accounts[0].split(':')[2])
      store.dispatch(
        setSelectedFingerprint({ topic: session.topic, selectedFingerprint: fingerprint }),
      )

      wc.topic = session.topic
      wc.session = session
      wc.selectedFingerprint = fingerprint

      let address: string | null = null
      try {
        address = await wc.verifyConnectionWithSageMethod()
        if (!address) address = await wc.getAddress()
      } catch {
        try {
          address = await wc.getAddress()
        } catch {
          /* continue */
        }
      }

      store.dispatch(
        setConnectedWallet({
          wallet: 'WalletConnect',
          address,
          image: penguiIcon,
          name: 'WalletConnect',
        }),
      )

      toast.success('Wallet connected!')
      setIsModalOpen(false)
    },
    [getConfig],
  )

  const initConnection = useCallback(async () => {
    if (!mountedRef.current) return

    setIsInitializing(true)
    setError(null)
    setUri(null)

    try {
      if (!hasNetworkPreference()) setStoredNetwork('mainnet')

      const { penguiIcon, metadata } = getConfig()
      const wc = new WalletConnect(penguiIcon, metadata)
      const signClient = await wc.signClient()

      if (!signClient || !mountedRef.current) {
        setIsInitializing(false)
        return
      }

      const network = getStoredNetwork()
      const requiredNamespaces = getRequiredNamespaces(network)
      const { uri: pairingUri, approval } = await signClient.connect({
        optionalNamespaces: requiredNamespaces,
      })

      if (!mountedRef.current) return

      if (pairingUri) {
        setUri(pairingUri)
        store.dispatch(setPairingUri(pairingUri))
      }

      setIsInitializing(false)

      if (approval) {
        try {
          const session = await approval()
          if (!mountedRef.current) return
          await processSession(session, wc)
        } catch {
          if (mountedRef.current) initConnection()
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to initialise connection')
        setIsInitializing(false)
      }
    }
  }, [getConfig, processSession])

  useEffect(() => {
    mountedRef.current = true
    if (!isConnected && !initRef.current) {
      initRef.current = true
      initConnection()
    } else if (isConnected) {
      setIsInitializing(false)
    }
    return () => {
      mountedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isConnected) setIsModalOpen(false)
  }, [isConnected])

  const copyUri = async () => {
    if (!uri) return
    try {
      await navigator.clipboard.writeText(uri)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = uri
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetry = () => {
    initRef.current = false
    initConnection()
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-center py-6 w-full">
        <div className="flex items-center gap-2 text-sm text-cyan-300/70">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connected — redirecting…</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ─── Connect Wallet Button ─── */}
      <button
        onClick={() => {
          if (error) handleRetry()
          setIsModalOpen(true)
        }}
        disabled={isInitializing && !uri}
        className="group relative w-full max-w-xs mx-auto overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.98]"
      >
        {/* animated gradient border */}
        <span
          className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_var(--angle),rgb(34_211_238)_0%,rgb(56_189_248)_25%,rgb(14_165_233)_50%,rgb(2_132_199)_75%,rgb(34_211_238)_100%)] p-[1.5px] opacity-60 group-hover:opacity-90 transition-opacity duration-300 animate-[spin_4s_linear_infinite]"
          style={{ '--angle': '0deg' } as React.CSSProperties}
        >
          <span className="block h-full w-full rounded-2xl bg-slate-950" />
        </span>

        {/* button surface */}
        <span className="relative flex items-center justify-center gap-2.5 px-6 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 group-hover:from-slate-900 group-hover:via-slate-800 group-hover:to-slate-900 transition-all duration-300">
          {isInitializing && !uri ? (
            <Loader2 className="w-[18px] h-[18px] text-cyan-400/60 animate-spin" />
          ) : (
            <Wallet className="w-[18px] h-[18px] text-cyan-400 group-hover:text-cyan-300 transition-colors duration-200" />
          )}
          <span className="text-sm sm:text-[15px] font-semibold tracking-wide bg-gradient-to-r from-cyan-200 via-sky-100 to-cyan-200 bg-clip-text text-transparent group-hover:from-white group-hover:via-cyan-100 group-hover:to-white transition-all duration-200">
            Connect Wallet
          </span>
        </span>
      </button>

      {/* ─── QR Modal ─── */}
      {isModalOpen && (
        <ConnectWalletModal
          uri={uri}
          isInitializing={isInitializing}
          error={error}
          copied={copied}
          onClose={() => setIsModalOpen(false)}
          onCopy={copyUri}
          onRetry={handleRetry}
        />
      )}
    </>
  )
}
