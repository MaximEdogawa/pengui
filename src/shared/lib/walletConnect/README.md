# Wallet Connect Queries Implementation

This directory contains the implementation of all wallet queries for Sage wallet using WalletConnect and TanStack Query.

## Structure

- `constants/` - Sage methods and wallet connect configuration
- `types/` - TypeScript types for commands and responses
- `repositories/` - Repository functions for making wallet requests

## Hooks

### Core Hooks

- **`useSignClient()`** - Hook to get the WalletConnect SignClient instance
  - Returns: `{ signClient, isInitializing, isInitialized, error }`

- **`useWalletSession()`** - Hook to get the current wallet session data
  - Returns: `{ session, chainId, fingerprint, topic, isConnected }`

### Query Hooks (TanStack Query)

- **`useWalletBalance(type?, assetId?)`** - Get wallet balance
- **`useWalletAddress()`** - Get wallet address
- **`useAssetCoins(type?, assetId?)`** - Get asset coins

### Mutation Hooks (TanStack Query)

- **`useSignCoinSpends()`** - Sign coin spends
- **`useSignMessage()`** - Sign a message
- **`useSendTransaction()`** - Send a transaction
- **`useGetBalance()`** - Get balance (mutation for manual refresh)
- **`useCreateOffer()`** - Create an offer
- **`useCancelOffer()`** - Cancel an offer
- **`useTakeOffer()`** - Take an offer
- **`useRefreshBalance()`** - Helper to refresh balance

## Usage Example

```tsx
import { useSignClient, useWalletBalance, useSendTransaction } from '@/hooks'

function WalletComponent() {
  const { signClient, isInitialized } = useSignClient()
  const { data: balance, isLoading } = useWalletBalance()
  const sendTransaction = useSendTransaction()

  const handleSend = async () => {
    try {
      await sendTransaction.mutateAsync({
        walletId: 1,
        amount: 1000000,
        fee: 0,
        address: 'xch1...',
      })
    } catch (error) {
      console.error('Transaction failed:', error)
    }
  }

  if (!isInitialized) return <div>Initializing...</div>

  return (
    <div>
      <p>Balance: {balance?.confirmed}</p>
      <button onClick={handleSend}>Send Transaction</button>
    </div>
  )
}
```

## All Implemented Wallet Queries

All wallet queries from penguin-pool are implemented:

1. ✅ `getWalletAddress` - Get wallet address
2. ✅ `getAssetBalance` - Get asset balance
3. ✅ `getAssetCoins` - Get asset coins
4. ✅ `testRpcConnection` - Test RPC connection
5. ✅ `signCoinSpends` - Sign coin spends
6. ✅ `signMessage` - Sign a message
7. ✅ `sendTransaction` - Send a transaction
8. ✅ `createOffer` - Create an offer
9. ✅ `takeOffer` - Take an offer
10. ✅ `cancelOffer` - Cancel an offer

## State Management

All queries use TanStack Query for state management, which provides:

- Automatic caching
- Background refetching
- Optimistic updates
- Error handling and retry logic
- Query invalidation after mutations

Coin values are automatically shared across components through TanStack Query's cache.
