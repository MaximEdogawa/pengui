import { useState } from 'react'
import { logger } from '@/shared/lib/logger'

interface UseNetworkSwitchProps {
  setNetwork: (network: 'mainnet' | 'testnet') => Promise<boolean>
  onSwitchComplete?: () => void
}

/**
 * Extract network switching logic to reduce NetworkPicker size
 */
export function useNetworkSwitch({ setNetwork, onSwitchComplete }: UseNetworkSwitchProps) {
  const [isSwitching, setIsSwitching] = useState(false)

  const switchNetwork = async (newNetwork: 'mainnet' | 'testnet') => {
    setIsSwitching(true)

    try {
      // Keep wallet connected - session remains valid across network switches
      // The wallet will handle requests based on its actual network
      // Wallet requests will use the wallet's network
      const success = await setNetwork(newNetwork)
      if (!success) {
        logger.error('Network switch failed: setNetwork returned false')
        return
      }
      onSwitchComplete?.()
    } catch (error) {
      logger.error('Network switch failed:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  return {
    isSwitching,
    switchNetwork,
  }
}
