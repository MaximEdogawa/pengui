'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { Wallet, ChevronDown, LogOut, RefreshCw } from 'lucide-react'
import {
  WalletConnect,
  store,
  setPairingUri,
  connectSession as connectSessionAction,
  setConnectedWallet,
  setSelectedFingerprint,
  useWalletConnectionState,
} from '@maximedogawa/chia-wallet-connect-react'
import { useNetwork } from '@/shared/hooks/useNetwork'
import {
  getStoredNetwork,
  hasNetworkPreference,
  setStoredNetwork,
} from '@/shared/lib/utils/networkStorage'
import { networkToChainId } from '@/shared/lib/utils/networkUtils'
import { getRequiredNamespaces } from '@/shared/lib/walletConnect/constants/wallet-connect'
import { ConnectWalletModal } from './ConnectWalletModal'
import toast from 'react-hot-toast'
import type { SessionTypes } from '@walletconnect/types'

/**
 * SafeConnectButton
 *
 * NetworkPicker-styled wallet button for the dashboard header.
 * - Not connected: compact "Connect" pill → opens custom QR modal
 * - Connected: shows shortened address → dropdown with disconnect
 * Never uses the native WalletConnect modal.
 */
export function SafeConnectButton() {
  const queryClient = useQueryClient()
  const { network } = useNetwork()
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark =
    currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')

  const { isConnected, address, walletName } = useWalletConnectionState()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uri, setUri] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ── validation (mirrors the old SafeConnectButton) ─────

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      if (!hasNetworkPreference()) setStoredNetwork('mainnet')

      const currentNetwork = getStoredNetwork()
      const chainId = networkToChainId(currentNetwork)
      const ns = getRequiredNamespaces(currentNetwork)

      if (ns.chia.chains[0] !== chainId) return

      setIsReady(true)
    } catch {
      /* silently ignore */
    }
  }, [network])

  // ── click-outside to close dropdown ────────────────────

  useEffect(() => {
    if (!isDropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isDropdownOpen])

  // ── config helper ──────────────────────────────────────

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

  // ── session processing ─────────────────────────────────

  const processSession = useCallback(
    async (session: SessionTypes.Struct, wc: InstanceType<typeof WalletConnect>) => {
      store.dispatch(setPairingUri(null))
      setUri(null)

      await wc.detectEvents()
      await wc.updateSessions()
      store.dispatch(connectSessionAction(session))

      const fp = Number(session.namespaces.chia.accounts[0].split(':')[2])
      store.dispatch(setSelectedFingerprint({ topic: session.topic, selectedFingerprint: fp }))

      wc.topic = session.topic
      wc.session = session
      wc.selectedFingerprint = fp

      let addr: string | null = null
      try {
        addr = await wc.verifyConnectionWithSageMethod()
        if (!addr) addr = await wc.getAddress()
      } catch {
        try { addr = await wc.getAddress() } catch { /* ok */ }
      }

      store.dispatch(
        setConnectedWallet({ wallet: 'WalletConnect', address: addr, name: 'WalletConnect' }),
      )

      toast.success('Wallet connected!')
      setIsModalOpen(false)
      // So balance and other wallet queries use a SignClient that has the new session
      queryClient.invalidateQueries({ queryKey: ['walletConnect', 'instance'] })
      queryClient.invalidateQueries({ queryKey: ['walletConnect'] })
    },
    [queryClient],
  )

  // ── initiate connection (generates URI + waits for approval) ──

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

      if (!signClient || !mountedRef.current) { setIsInitializing(false); return }

      const net = getStoredNetwork()
      const ns = getRequiredNamespaces(net)
      const { uri: pairingUri, approval } = await signClient.connect({ optionalNamespaces: ns })

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
        setError(err instanceof Error ? err.message : 'Connection failed')
        setIsInitializing(false)
      }
    }
  }, [getConfig, processSession])

  // ── disconnect ─────────────────────────────────────────

  const handleDisconnect = useCallback(async () => {
    setIsDropdownOpen(false)
    try {
      const { penguiIcon, metadata } = getConfig()
      const wc = new WalletConnect(penguiIcon, metadata)

      const state = store.getState()
      const sessions = state.walletConnect?.sessions ?? []
      for (const s of sessions) {
        try { await wc.disconnectSession(s.topic) } catch { /* ok */ }
      }

      store.dispatch(setConnectedWallet(null))
      store.dispatch(connectSessionAction(null))
      toast.success('Wallet disconnected')
    } catch {
      toast.error('Failed to disconnect')
    }
  }, [getConfig])

  // ── reconnect (disconnect then redirect to login so user can connect again) ──

  const handleReconnect = useCallback(async () => {
    setIsDropdownOpen(false)
    try {
      const { penguiIcon, metadata } = getConfig()
      const wc = new WalletConnect(penguiIcon, metadata)

      const state = store.getState()
      const sessions = state.walletConnect?.sessions ?? []
      for (const s of sessions) {
        try { await wc.disconnectSession(s.topic) } catch { /* ok */ }
      }

      store.dispatch(setConnectedWallet(null))
      store.dispatch(connectSessionAction(null))
      toast.success('Redirecting to login. Reconnect your wallet there.')
    } catch {
      toast.error('Failed to disconnect')
    }
  }, [getConfig])

  // ── clipboard ──────────────────────────────────────────

  const copyUri = async () => {
    if (!uri) return
    try { await navigator.clipboard.writeText(uri) } catch {
      const ta = document.createElement('textarea')
      ta.value = uri; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── open modal for new connection ──────────────────────

  const openConnectModal = () => {
    setIsDropdownOpen(false)
    setIsModalOpen(true)
    if (!uri && !isInitializing) initConnection()
  }

  // ── close modal on connect ─────────────────────────────

  useEffect(() => {
    if (isConnected && isModalOpen) setIsModalOpen(false)
  }, [isConnected, isModalOpen])

  if (!isReady) return null

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null

  // ── render ─────────────────────────────────────────────

  return (
    <>
      <div className="relative" style={{ zIndex: 10000 }} ref={containerRef}>
        <button
          type="button"
          onClick={() => {
            if (isConnected) {
              setIsDropdownOpen((v) => !v)
            } else {
              openConnectModal()
            }
          }}
          className={`
            relative flex items-center gap-1.5 px-2 py-1 rounded-lg
            backdrop-blur-[40px] transition-all duration-200
            hover:scale-[1.02] active:scale-[0.98]
            ${isDropdownOpen ? 'ring-1 ring-cyan-400/30' : ''}
            ${
              isDark
                ? 'bg-white/10 border border-white/20 text-white shadow-lg shadow-black/20'
                : 'bg-white/60 border border-white/70 text-slate-800 shadow-lg shadow-black/10'
            }
          `}
          aria-label="Manage wallet"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {isConnected ? (
            <>
              <Wallet className="w-3 h-3" />
              <span className="text-[10px] font-medium tracking-tight max-w-[80px] truncate">
                {shortAddress ?? walletName ?? 'Connected'}
              </span>
              <ChevronDown
                className={`w-2.5 h-2.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </>
          ) : (
            <>
              <Wallet className="w-3 h-3" />
              <span className="text-[10px] font-medium tracking-tight">Connect</span>
            </>
          )}
        </button>

        {/* ── Dropdown (connected state) ── */}
        {isDropdownOpen && isConnected && (
          <div
            className={`
              absolute top-full mt-1.5 right-0 rounded-xl
              backdrop-blur-xl overflow-hidden shadow-2xl
              border min-w-[160px] z-[10001] transition-all duration-200
              ${
                isDark
                  ? 'bg-slate-900/95 border-white/25 shadow-black/50'
                  : 'bg-white/95 border-slate-200/90 shadow-black/25'
              }
            `}
            style={{
              boxShadow: isDark
                ? '0 20px 40px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)'
                : '0 20px 40px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div className="py-0.5">
              {/* Wallet info */}
              <div className={`px-2.5 py-1.5 border-b ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <div className="flex items-center gap-1.5">
                  <Wallet className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`} />
                  <span className={`text-[10px] font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                    {shortAddress ?? 'Connected'}
                  </span>
                </div>
              </div>

              {/* Reconnect — disconnect and go to login to connect again */}
              <button
                type="button"
                onClick={handleReconnect}
                className={`
                  w-full px-2.5 py-1.5 text-left flex items-center gap-1.5 transition-all duration-150
                  ${isDark ? 'text-cyan-400/90 hover:bg-cyan-500/10 hover:text-cyan-400' : 'text-cyan-600 hover:bg-cyan-500/10 hover:text-cyan-700'}
                `}
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-[10px] font-medium tracking-tight">Reconnect</span>
              </button>
              {/* Disconnect */}
              <button
                type="button"
                onClick={handleDisconnect}
                className={`
                  w-full px-2.5 py-1.5 text-left flex items-center gap-1.5 transition-all duration-150
                  ${isDark ? 'text-red-400/80 hover:bg-red-500/10 hover:text-red-400' : 'text-red-500/80 hover:bg-red-500/10 hover:text-red-600'}
                `}
              >
                <LogOut className="w-3 h-3" />
                <span className="text-[10px] font-medium tracking-tight">Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Custom QR Modal ── */}
      {isModalOpen && (
        <ConnectWalletModal
          uri={uri}
          isInitializing={isInitializing}
          error={error}
          copied={copied}
          onClose={() => setIsModalOpen(false)}
          onCopy={copyUri}
          onRetry={() => initConnection()}
        />
      )}
    </>
  )
}
