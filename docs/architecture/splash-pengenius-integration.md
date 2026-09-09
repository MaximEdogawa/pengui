# Splash Network: Implementation (Option A)

This doc describes how pengui implements the Splash network using **libp2p in the browser** (Option A) and the in-repo relay.

## Current implementation

### 1. splash-wasm (browser) – `crates/splash-wasm`

- **Stack**: **libp2p in Rust compiled to WASM**, with **WebSocket + WebRTC** transports so the browser can join a libp2p swarm and connect to a relay.
- **Protocols** (same as Splash): Kademlia `/{network}/kad/1`, Identify `/{network}/id/1`, Gossipsub `/{network}/offers/1` with `network` = `splash` or `splash-testnet`.
- **API** (JS wrapper): `init(relayUrl, network)`, `connect()`, `setOnOffersCallback`, `setOnStatusCallback`, `getConnectionStatus`, etc. The wrapper converts `ws://` / `wss://` URLs to libp2p multiaddrs and uses an internal `SplashNode` (start, connect_to_peer, set_offer_callback).
- **Build**: From repo root run `bun run build:wasm` (requires [Rust](https://rustup.rs) and [wasm-pack](https://rustwasm.github.io/wasm-pack/)). Output is written to `public/wasm/` (splash_wasm.js, splash_wasm_bg.wasm).

### 2. splash-relay (Rust binary) – `crates/splash-relay`

- **Role**: Bridge between the **Splash network** (TCP/libp2p) and **browsers** (libp2p over WebSocket).
- **Stack**: libp2p with TCP + WebSocket transport, Gossipsub, Kademlia, Identify.
- **Network**: Same protocol IDs as Splash (`/splash/kad/1`, `/splash/id/1`, `/splash/offers/1`; testnet: `splash-testnet`).
- **Bootstrap**: DNS TXT from `_dnsaddr.splash.dexie.space` or `_dnsaddr.splash-testnet.dexie.space`.
- **Listen**: TCP (default 11511), WebSocket (default 9090) for browser connections.
- **Deploy**: Docker image built from `deployment/splash-relay/Dockerfile`, deployed as two [ONCE](https://github.com/basecamp/once) apps (mainnet: `relay.pengui.space`, testnet: `relay-testnet.pengui.space`) — see `deployment/README.md`.

### 3. Pengui frontend

- **Stream terminal**: Uses `useSplashWasm()` → `initAndConnect(relayUrl, network)` with relay URL from `getDexieSplashRelayUrl(network)` (env: `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL`, `_MAINNET_WS_URL`, `_TESTNET_WS_URL`). Offers are pushed to a local buffer and displayed; `/list`, `/stats`, `/filter` work on that buffer.
- **Trading / Offers**: Stream tab and resizable terminal pane render `SplashTerminal`.

## Scripts (package.json)

| Script       | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `build:wasm` | Build splash-wasm and write to `public/wasm/`. Requires Rust and wasm-pack. |
| `build:all`  | Run `build:wasm` then `build` (full app build including WASM).              |
| `build`      | Next.js build only. Run `build:wasm` first if you changed the WASM crate.   |

## References

- Splash network: [dexie-space/splash](https://github.com/dexie-space/splash) (Kademlia, Identify, Gossipsub).
- Pengenius (reference): libp2p WASM + relay pattern; pengui’s splash-wasm and splash-relay follow the same protocol IDs and flow.
