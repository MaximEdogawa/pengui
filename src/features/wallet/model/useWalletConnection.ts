// Phase 2: Use the real useWalletConnectionState hook from chia-wallet-connect-react
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'

export function useWalletConnection() {
  const { isConnected } = useWalletConnectionState()

  return { isConnected }
}
