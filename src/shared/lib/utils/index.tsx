import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export formatting utilities for backward compatibility
export * from '../formatting/chia-units'
export * from '../formatting/date'
export * from '../formatting/amount'

// Re-export web3 utilities for backward compatibility
export * from '../web3/address'
export * from '../web3/network'
export * from '../web3/network-storage'

// Keep offer-specific utilities here for now
export * from './offerNetworkFilter'

// Keep generic utilities
export * from './clipboard'
export * from './useEffectGuard'
