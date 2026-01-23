# WalletConnect Network Switching Analysis

## Overview

This document analyzes how the Chia WalletConnect package (`@maximedogawa/chia-wallet-connect-react`) handles network switching and how the app integrates with it.

## Related Documentation

- [WalletConnect Offer Request Fixes](./wallet-connect-offer-request-fixes.md) - Details fixes for offer request issues

## Current Implementation

### 1. **SignClient Reinitialization**

The app reinitializes the SignClient when the network changes:

**Location**: `src/features/wallet/model/useSignClient.ts`

```typescript
export function useSignClient() {
  const { network } = useNetwork()
  const instanceQuery = useQuery<WalletConnectInstance | undefined>({
    queryKey: ['walletConnect', 'instance', network], // Network in query key forces reinit
    queryFn: async () => {
      const config = getSignClientConfig()
      const signClient = await SignClient.init(config)
      // ...
    }
  })
}
```

**Key Points**:
- SignClient is reinitialized when `network` changes (via query key)
- Each network gets its own SignClient instance
- Event listeners are registered immediately after initialization

### 2. **Network Provider Implementation**

**Location**: `src/shared/providers/NetworkProvider.tsx`

The app handles network switching manually:

```typescript
const setNetwork = async (newNetwork: Network): Promise<boolean> => {
  // 1. Update app state
  applyNetworkChange(newNetwork) // Updates state, localStorage, clears cache
  
  // 2. Invalidate SignClient query (forces reinitialization)
  queryClient.invalidateQueries({ queryKey: ['walletConnect', 'instance'] })
  
  // 3. Test connection after switch
  // ...
}
```

**Key Points**:
- Network switch is app-driven, not wallet-driven
- Session remains valid across network switches
- SignClient is invalidated and reinitialized with new network
- App tests connection after switch with a balance request

### 3. **Auto-Sync to Wallet Network**

**Location**: `src/shared/providers/NetworkProvider.tsx`

On first connection, the app auto-syncs to the wallet's network:

```typescript
useEffect(() => {
  // Get chain ID from wallet session
  const walletChainId = walletConnectSession?.namespaces?.chia?.chains?.[0]
  const walletNetwork = chainIdToNetwork(walletChainId)
  
  // Auto-sync if no user preference exists
  if (!hasNetworkPreference() && walletNetwork !== currentNetwork) {
    applyNetworkChange(walletNetwork)
  }
}, [isConnected, walletConnectSession])
```

**Key Points**:
- Only happens on first connection
- Only if user hasn't set a preference
- Syncs app network to wallet's network

### 4. **Event Listeners**

**Location**: `src/features/wallet/model/useWalletConnectEventListeners.ts`

The app listens to WalletConnect events:

```typescript
const eventHandlers = {
  session_delete: () => { /* ... */ },
  session_expire: () => { /* ... */ },
  session_request: () => { /* ... */ },
  session_proposal: () => { /* ... */ },
  session_update: () => { /* ... */ }, // ⚠️ Only logs, doesn't handle network changes
  session_ping: () => { /* ... */ },
}
```

**Key Points**:
- `session_update` is logged but not used for network switching
- No listeners for `chainChanged` or `accountsChanged` events
- These events are declared in `requiredNamespaces` but not handled

### 5. **Required Namespaces**

**Location**: `src/shared/lib/walletConnect/constants/wallet-connect.ts`

```typescript
export function getRequiredNamespaces(network: 'mainnet' | 'testnet') {
  return {
    chia: {
      methods: [/* ... */],
      chains: [getChiaChainId(network)], // Network-specific chain ID
      events: ['chainChanged', 'accountsChanged'], // ⚠️ Declared but not handled
    },
  }
}
```

**Key Points**:
- `chainChanged` and `accountsChanged` are declared in required namespaces
- But the app doesn't listen to these events
- The app relies on manual network switching instead

## Issues and Gaps

### 1. **No Wallet-Driven Network Switching**

**Problem**: The app doesn't listen to `chainChanged` events from the wallet. If the user switches networks in their wallet, the app won't automatically update.

**Impact**: 
- App and wallet can be out of sync
- User might see errors when wallet is on different network
- Manual network switching in app doesn't change wallet network

### 2. **Session Persistence Assumption**

**Problem**: The app assumes the session remains valid across network switches, but this might not always be true.

**Current Code**:
```typescript
// Keep wallet connected - session remains valid across network switches
// The wallet will handle requests based on its actual network
```

**Risk**: If the wallet requires a new session for network changes, the app won't handle it.

### 3. **SignClient Reinitialization**

**Problem**: Reinitializing SignClient on every network switch might be inefficient and could cause issues.

**Current Behavior**:
- New SignClient instance created for each network
- Old instance might still have active listeners
- Could lead to memory leaks or duplicate event handlers

### 4. **No Bidirectional Sync**

**Problem**: Network switching is one-way (app → app state), not bidirectional (wallet ↔ app).

**Missing**:
- App doesn't react to wallet network changes
- App doesn't request wallet to switch networks
- No synchronization mechanism

## Recommendations

### 1. **Add chainChanged Event Listener**

Listen to wallet network changes and sync app state:

```typescript
// In useWalletConnectEventListeners.ts
signClient.on('session_event', (event) => {
  if (event.params.event.name === 'chainChanged') {
    const newChainId = event.params.event.data
    const newNetwork = chainIdToNetwork(newChainId)
    // Sync app network to wallet network
    applyNetworkChange(newNetwork)
  }
})
```

### 2. **Handle session_update for Network Changes**

Use `session_update` events to detect network changes:

```typescript
session_update: (args: unknown) => {
  const event = args as { topic: string; params: { namespaces: any } }
  const chains = event.params.namespaces?.chia?.chains
  if (chains?.[0]) {
    const newChainId = chains[0]
    const newNetwork = chainIdToNetwork(newChainId)
    // Sync app network
  }
}
```

### 3. **Optimize SignClient Reinitialization**

Instead of reinitializing, consider:
- Reusing the same SignClient instance
- Updating chainId in requests dynamically
- Only reinitialize if absolutely necessary

### 4. **Add Network Switch Request**

If the wallet supports it, request network switch:

```typescript
// Request wallet to switch networks
await signClient.request({
  topic: session.topic,
  chainId: currentChainId,
  request: {
    method: 'wallet_switchChain',
    params: { chainId: newChainId },
  },
})
```

### 5. **Better Error Handling**

Handle cases where:
- Wallet rejects network switch
- Session becomes invalid after network switch
- Network mismatch between app and wallet

## Current Flow Diagram

```text
User switches network in app
    ↓
NetworkProvider.setNetwork()
    ↓
applyNetworkChange(newNetwork)
    ↓
- Update app state
- Update localStorage
- Clear query cache
- Invalidate SignClient query
    ↓
useSignClient() detects network change
    ↓
Reinitialize SignClient with new network
    ↓
Register event listeners
    ↓
Test connection with balance request
```

## Missing Flow (Wallet → App)

```text
User switches network in wallet
    ↓
Wallet emits chainChanged event
    ↓
❌ App doesn't listen to this event
    ↓
App and wallet are out of sync
```

## Conclusion

The current implementation handles app-driven network switching well, but lacks:
1. **Wallet-driven network switching** - App doesn't react to wallet network changes
2. **Bidirectional sync** - No way to sync wallet network to app or vice versa
3. **Event handling** - `chainChanged` and `accountsChanged` events are declared but not used

The app should add listeners for wallet network change events to keep app and wallet in sync.
