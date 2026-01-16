import { useState } from 'react'
import { useToast } from '@/shared/hooks/useToast'
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
  const { toast } = useToast()

  const switchNetwork = async (newNetwork: 'mainnet' | 'testnet') => {
    setIsSwitching(true)

    try {
      // Keep wallet connected - session remains valid across network switches
      // The wallet will handle requests based on its actual network
      // Wallet requests will use the wallet's network
      const success = await setNetwork(newNetwork)
      if (!success) {
        toast({
          variant: 'destructive',
          title: 'Network Switch Failed',
          description: 'Failed to switch network. Please try again.',
        })
        return
      }
      onSwitchComplete?.()
    } catch (error) {
      logger.error('Network switch failed:', error)
      // Handle any unexpected errors that might be thrown
      toast({
        variant: 'destructive',
        title: 'Network Switch Failed',
        description: 'Failed to switch network. Please try again.',
      })
    } finally {
      setIsSwitching(false)
    }
  }

  return {
    isSwitching,
    switchNetwork,
  }
}
