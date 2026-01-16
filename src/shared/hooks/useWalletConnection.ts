// Hook to check wallet connection state
// Wraps the external library hook for convenience
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'

export function useWalletConnection() {
  const { isConnected } = useWalletConnectionState()

  return { isConnected }
}
