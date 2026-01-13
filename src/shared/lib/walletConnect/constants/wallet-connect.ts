import { environment } from '@/shared/lib/config/environment'
import { SageMethods } from './sage-methods'
import { networkToChainId } from '@/shared/lib/utils/networkUtils'

export const WALLET_CONNECT_STORAGE_KEY = 'walletconnect'
export const CHIA_MAINNET_CHAIN_ID = 'chia:mainnet'
export const CHIA_TESTNET_CHAIN_ID = 'chia:testnet'


export const CHIA_METADATA = {
  name: environment.wallet.walletConnect.metadata.name,
  description: environment.wallet.walletConnect.metadata.description,
  url: environment.wallet.walletConnect.metadata.url,
  icons: [...environment.wallet.walletConnect.metadata.icons],
}

/**
 * Get chain ID for a given network
 * @param network - The network type ('mainnet' | 'testnet')
 * @returns The chain ID
 */
export function getChiaChainId(network: 'mainnet' | 'testnet'): string {
  return networkToChainId(network)
}

/**
 * Get REQUIRED_NAMESPACES for a given network
 * @param network - The network type ('mainnet' | 'testnet')
 * @returns The required namespaces configuration
 */
export function getRequiredNamespaces(network: 'mainnet' | 'testnet') {
  return {
    chia: {
      methods: [
        // CHIP-0002 Commands
        SageMethods.CHIP0002_CONNECT,
        SageMethods.CHIP0002_CHAIN_ID,
        SageMethods.CHIP0002_GET_PUBLIC_KEYS,
        SageMethods.CHIP0002_FILTER_UNLOCKED_COINS,
        SageMethods.CHIP0002_GET_ASSET_COINS,
        SageMethods.CHIP0002_GET_ASSET_BALANCE,
        SageMethods.CHIP0002_SIGN_COIN_SPENDS,
        SageMethods.CHIP0002_SIGN_MESSAGE,
        SageMethods.CHIP0002_SEND_TRANSACTION,
        // Chia-specific Commands
        SageMethods.CHIA_CREATE_OFFER,
        SageMethods.CHIA_TAKE_OFFER,
        SageMethods.CHIA_CANCEL_OFFER,
        SageMethods.CHIA_GET_NFTS,
        SageMethods.CHIA_SEND,
        SageMethods.CHIA_GET_ADDRESS,
        SageMethods.CHIA_SIGN_MESSAGE_BY_ADDRESS,
        SageMethods.CHIA_BULK_MINT_NFTS,
      ],
      chains: [getChiaChainId(network)],
      events: ['chainChanged', 'accountsChanged'],
    },
  }
}


/**
 * Get SIGN_CLIENT_CONFIG
 * Note: This doesn't depend on network, but kept for consistency
 */
export function getSignClientConfig() {
  return {
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    relayUrl: process.env.NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL || 'wss://relay.walletconnect.com',
    metadata: {
      name: environment.wallet.walletConnect.metadata.name,
      description: environment.wallet.walletConnect.metadata.description,
      url: environment.wallet.walletConnect.metadata.url,
      icons: [...environment.wallet.walletConnect.metadata.icons],
    },
  }
}
