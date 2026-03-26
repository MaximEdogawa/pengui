# Tibet Swap integration

Integrates [TibetSwap v2](https://v2.tibetswap.io) for AMM swap, add liquidity, and remove liquidity.

## Current implementation (API fallback)

- **Tibet API client**: GET tokens, pairs, pair, router, quote; POST `/offer/{pair_id}` with action `SWAP` | `ADD_LIQUIDITY` | `REMOVE_LIQUIDITY`.
- **Flow**: User creates offer in the browser via wallet (`createOffer`); the signed offer is sent to Tibet’s API, which builds the full spend bundle and broadcasts.
- **UI**: Trading page → “Swap” tab with sub-tabs: Swap, Add liquidity, Remove liquidity. Swap opens a confirmation modal; add/remove use inline forms.

## Optional future work

- **Client-side “pengui Tibet puzzle”**: Build and combine the full spend bundle in the browser (Warp bridge style). Would require: Tibet AMM puzzle (from [Yakuhito/tibet](https://github.com/Yakuhito/tibet)) in a browser-usable form, CLVM in TS (e.g. [node-clvm-lib](https://github.com/Chia-Network/node-clvm-lib)), and a way to push the signed spend bundle (full node RPC or wallet capability).
- **Coinset.org**: Use for on-chain pool/LP state if needed (e.g. remove liquidity positions). Not required while Tibet API provides sufficient data.
- **Dexie upload**: Optionally post swap/liquidity offers to Dexie for discovery; currently only Splash broadcast is used after a successful Tibet swap.
