# Wallet Connect Queries Implementation

This directory holds the WalletConnect RPC layer: the CHIP-0002 / `chia_*` method
names, request and response types, and the repository functions that talk to a
SignClient.

Nothing outside `src/shared/lib/wallet/walletconnect/` should import from here.
Features and UI go through the provider-agnostic `WalletProvider` interface in
`src/shared/lib/wallet` (see `pengui-wiki/architecture/sage-in-app-integration.md`),
which is what lets a second transport (the Sage in-app bridge) be added.

## Structure

- `constants/` - Sage methods and wallet connect configuration
- `types/` - TypeScript types for commands and responses
- `repositories/` - Repository functions for making wallet requests

## Hooks

### Core Hooks

- **`useWalletState()`** (`@/shared/hooks`) - Connection state of the active
  wallet provider
  - Returns: `{ kind, isConnected, isReady, fingerprint, address, network, walletName, capabilities }`

- **`useWalletProvider()`** (`@/shared/hooks`) - The active `WalletProvider`
  adapter for imperative calls

- **`useWalletConnectSignClient()`** (`@/shared/lib/wallet/walletconnect`) -
  Internal to the WalletConnect adapter
  - Returns: `{ signClient, isInitializing, isInitialized, error }`

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
import { useWalletBalance, useSendTransaction } from "@/features/wallet";
import { useWalletState } from "@/shared/hooks";

function WalletComponent() {
  const { isReady } = useWalletState();
  const { data: balance, isLoading } = useWalletBalance();
  const sendTransaction = useSendTransaction();

  const handleSend = async () => {
    try {
      await sendTransaction.mutateAsync({
        walletId: 1,
        amount: 1000000,
        fee: 0,
        address: "xch1...",
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  if (!isReady) return <div>Initializing...</div>;

  return (
    <div>
      <p>Balance: {balance?.confirmed}</p>
      <button onClick={handleSend}>Send Transaction</button>
    </div>
  );
}
```

## All Implemented Wallet Queries

All wallet queries from pengui are implemented:

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
