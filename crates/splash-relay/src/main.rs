//! Splash relay: libp2p node that joins the Splash network and exposes WebSocket for browsers.
//! Same protocol IDs as Splash; DNS bootstrap from _dnsaddr.splash.dexie.space (mainnet) or splash-testnet.

use anyhow::Result;
use clap::Parser;
use futures::StreamExt;
use libp2p::gossipsub::{self, MessageAcceptance};
use libp2p::multiaddr::Protocol;
use libp2p::swarm::{Config as SwarmConfig, SwarmEvent};
use libp2p::{identify, identity, kad, noise, tcp, yamux, Multiaddr, PeerId, StreamProtocol};
use log::{debug, error, info, warn};
use serde::Deserialize;
use std::collections::hash_map::DefaultHasher;
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;

const NETWORK_NAME: &str = "splash";
const MAX_OFFER_SIZE: usize = 300 * 1024;
const MAX_OFFER_CACHE_SIZE: usize = 10_000;

#[derive(Debug, Deserialize)]
struct MinimalSplashOffer {
    offer: String,
    #[allow(dead_code)]
    peer_id: Option<String>,
    #[allow(dead_code)]
    timestamp: Option<i64>,
}

/// Opaque Dexie offer JSON as returned from /v1/offers POST.
/// We intentionally avoid a strict Rust schema so we don't
/// accidentally drop fields if Dexie adds or changes them.
type EnrichedOffer = serde_json::Value;

/// The single public port: browser WebSocket traffic plus the `/up` health
/// check that hosting platforms (ONCE/kamal-proxy) require.
///
/// libp2p's WebSocket transport speaks only the WebSocket handshake, so a plain
/// `GET /up` against it fails. Rather than run a separate proxy alongside the
/// relay, this answers `/up` itself and passes every other connection straight
/// through to libp2p's listener on loopback. The request bytes are only peeked,
/// never consumed, so libp2p sees the handshake exactly as the client sent it.
async fn serve_public_port(listener: TcpListener, internal_ws_port: oneshot::Receiver<u16>) -> Result<()> {
    let internal_ws_port = internal_ws_port.await?;
    info!(
        "public listener ready: /up health check + WebSocket -> 127.0.0.1:{}",
        internal_ws_port
    );

    loop {
        let (mut inbound, peer) = match listener.accept().await {
            Ok(conn) => conn,
            Err(e) => {
                warn!("Accept failed on public port: {}", e);
                continue;
            }
        };

        tokio::spawn(async move {
            match is_health_check(&mut inbound).await {
                Ok(true) => {
                    let response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\
                                    Content-Length: 3\r\nConnection: close\r\n\r\nup\n";
                    let _ = inbound.write_all(response.as_bytes()).await;
                    let _ = inbound.shutdown().await;
                }
                Ok(false) => match TcpStream::connect(("127.0.0.1", internal_ws_port)).await {
                    Ok(mut outbound) => {
                        let _ = tokio::io::copy_bidirectional(&mut inbound, &mut outbound).await;
                    }
                    Err(e) => warn!("Cannot reach WebSocket listener: {}", e),
                },
                Err(e) => debug!("Dropping connection from {}: {}", peer, e),
            }
        });
    }
}

/// Peeks at the request line to tell a `/up` health check from a WebSocket
/// handshake. Peeking leaves the bytes in the socket for libp2p to read.
async fn is_health_check(stream: &mut TcpStream) -> Result<bool> {
    let mut buf = [0u8; 1024];
    let deadline = tokio::time::Instant::now() + Duration::from_secs(5);

    loop {
        let n = tokio::time::timeout_at(deadline, stream.peek(&mut buf)).await??;
        if n == 0 {
            anyhow::bail!("closed before sending a request");
        }

        // Decide only once the whole request line has arrived.
        if let Some(eol) = buf[..n].windows(2).position(|w| w == b"\r\n") {
            let line = String::from_utf8_lossy(&buf[..eol]);
            return Ok(line.starts_with("GET /up ") || line == "GET /up");
        }

        if n == buf.len() {
            return Ok(false);
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
}

async fn fetch_enriched_offer(
    dexie_api_base: &str,
    offer_str: &str,
) -> Result<Option<EnrichedOffer>> {
    // Dexie offers API: POST /v1/offers with JSON body { "offer": "<offer string>" } to
    // both register and retrieve the enriched offer.
    let url = format!("{}/v1/offers", dexie_api_base);
    let client = reqwest::Client::new();
    let body = serde_json::json!({ "offer": offer_str });

    // Up to 3 attempts with simple backoff.
    for attempt in 1..=3 {
        match client.post(&url).json(&body).send().await {
            Ok(resp) => {
                if !resp.status().is_success() {
                    debug!(
                        "Dexie POST /v1/offers failed (attempt {attempt}/3): status={} url={} body_offer_prefix={}",
                        resp.status(),
                        url,
                        &offer_str.chars().take(16).collect::<String>()
                    );
                    continue;
                }
                let raw: serde_json::Value = resp.json().await?;
                // Expect Dexie-like shape { success: bool, offer: {...} } but be tolerant.
                if let Some(offer_val) = raw
                    .get("offer")
                    .cloned()
                    .or_else(|| raw.get("data").cloned())
                {
                    // Log full Dexie offer JSON so asset tickers/amounts are visible in debug logs.
                    debug!(
                        "Dexie POST enrichment offer JSON: {}",
                        offer_val
                    );
                    debug!(
                        "Dexie enrichment success for offer (attempt {attempt}/3): {}",
                        offer_str
                    );
                    return Ok(Some(offer_val));
                } else {
                    debug!(
                        "Dexie enrichment missing 'offer' field (attempt {attempt}/3) url={}",
                        url
                    );
                }
            }
            Err(e) => {
                debug!(
                    "Dexie GET error (attempt {attempt}/3) url={} err={:?}",
                    url, e
                );
            }
        }
        // Small delay before next retry.
        tokio::time::sleep(Duration::from_millis(200)).await;
    }

    debug!(
        "Dexie POST enrichment failed after 3 attempts for offer: {}",
        offer_str
    );
    Ok(None)
}

/// Returns true if this connection is an inbound WebSocket (browser/app peer).
fn is_inbound_ws(endpoint: &libp2p::core::ConnectedPoint) -> bool {
    if let libp2p::core::ConnectedPoint::Listener { local_addr, .. } = endpoint {
        local_addr.iter().any(|p| matches!(p, Protocol::Ws(_)))
    } else {
        false
    }
}

#[derive(Parser, Debug)]
#[command(name = "splash-relay")]
#[command(about = "libp2p relay for the Splash network (WebSocket for browsers, TCP for network)")]
struct Args {
    /// Public port: browser WebSocket traffic and the `/up` health check. This
    /// is the only port that has to be reachable from outside.
    #[arg(short = 'w', long, env = "RELAY_WS_PORT", default_value = "9090")]
    ws_port: u16,

    /// TCP listen port for inbound Splash network peering. Set to 0 to disable
    /// the listener; outbound dialing to bootstrap peers still works.
    #[arg(short = 't', long, env = "RELAY_TCP_PORT", default_value = "11511")]
    tcp_port: u16,

    /// Known peer multiaddrs (can be specified multiple times, or space-separated via env)
    #[arg(short = 'k', long, env = "RELAY_KNOWN_PEERS", value_delimiter = ' ')]
    known_peer: Vec<String>,

    /// Use testnet (splash-testnet). Also settable with RELAY_TESTNET=1.
    #[arg(long)]
    testnet: bool,

    /// Maximum concurrent WebSocket (browser/app) connections. Incoming WS over this limit are disconnected.
    #[arg(long, env = "RELAY_MAX_WS_CONNECTIONS", default_value = "500")]
    max_ws_connections: u32,
}

impl Args {
    /// `--testnet` is a bare flag, so its env equivalent is read explicitly
    /// rather than relying on clap's boolean-from-env parsing.
    fn testnet(&self) -> bool {
        self.testnet
            || matches!(
                std::env::var("RELAY_TESTNET").ok().as_deref(),
                Some("1") | Some("true") | Some("TRUE") | Some("yes")
            )
    }
}

#[derive(libp2p::swarm::NetworkBehaviour)]
struct RelayBehaviour {
    gossipsub: gossipsub::Behaviour,
    kademlia: kad::Behaviour<kad::store::MemoryStore>,
    identify: identify::Behaviour,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Early stderr so we see output even if logging or DNS fails (e.g. in Docker)
    eprintln!("splash-relay starting...");

    // Default info shows one startup line only; warn/error for issues. Set RUST_LOG=debug for verbose.
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    // Log panic as error so production logs show why the service stopped, then run default handler.
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        error!("splash-relay panic (service stopping): {}", panic_info);
        default_hook(panic_info);
    }));

    if let Err(e) = run().await {
        error!("splash-relay failed: {}", e);
        eprintln!("splash-relay failed: {}", e);
        std::process::exit(1);
    }
    Ok(())
}

async fn run() -> Result<()> {
    let args = Args::parse();
    let testnet = args.testnet();
    let network_name = if testnet {
        "splash-testnet"
    } else {
        NETWORK_NAME
    };

    let local_key = identity::Keypair::generate_ed25519();
    let local_peer_id = PeerId::from(local_key.public());

    let mut bootstrap_peers = args.known_peer.clone();
    if bootstrap_peers.is_empty() {
        debug!("Resolving bootstrap peers from DNS...");
        match resolve_peers_from_dns(network_name).await {
            Ok(peers) => {
                debug!("Discovered {} peers from DNS", peers.len());
                bootstrap_peers = peers;
            }
            Err(e) => {
                error!("Failed to resolve DNS peers (no bootstrap list): {}", e);
            }
        }
    }

    let mut swarm = libp2p::SwarmBuilder::with_existing_identity(local_key.clone())
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_websocket(
            noise::Config::new,
            libp2p::yamux::Config::default,
        )
        .await?
        .with_behaviour(|key: &identity::Keypair| {
            let unique_offer_fn = |message: &gossipsub::Message| {
                let mut s = DefaultHasher::new();
                message.data.hash(&mut s);
                gossipsub::MessageId::from(s.finish().to_string())
            };

            let gossipsub_config = gossipsub::ConfigBuilder::default()
                .heartbeat_interval(Duration::from_secs(5))
                .message_id_fn(unique_offer_fn)
                .max_transmit_size(MAX_OFFER_SIZE)
                .validate_messages()
                .validation_mode(gossipsub::ValidationMode::Permissive)
                .build()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            let dummy_key = identity::Keypair::generate_ed25519();
            let gossipsub = gossipsub::Behaviour::new(
                gossipsub::MessageAuthenticity::Signed(dummy_key),
                gossipsub_config,
            )?;

            let kad_protocol = StreamProtocol::try_from_owned(format!("/{}/kad/1", network_name))
                .expect("protocol name is valid");
            let mut kad_config = kad::Config::new(kad_protocol);
            kad_config.set_query_timeout(Duration::from_secs(60));

            let store = kad::store::MemoryStore::new(key.public().to_peer_id());
            let kademlia = kad::Behaviour::with_config(key.public().to_peer_id(), store, kad_config);

            let identify = identify::Behaviour::new(
                identify::Config::new(
                    format!("/{}/id/1", network_name),
                    key.public().clone(),
                )
                .with_agent_version(format!("splash-relay/{}", env!("CARGO_PKG_VERSION"))),
            );

            Ok(RelayBehaviour {
                gossipsub,
                kademlia,
                identify,
            })
        })?
        .with_swarm_config(|c: SwarmConfig| {
            c.with_idle_connection_timeout(Duration::from_secs(120))
                .with_dial_concurrency_factor(std::num::NonZeroU8::new(8).unwrap())
        })
        .build();

    // libp2p's WebSocket listener stays on loopback behind serve_public_port,
    // which adds the `/up` health check libp2p can't answer by itself. Port 0
    // lets the OS choose; the actual port arrives via NewListenAddr below.
    let ws_addr: Multiaddr = "/ip4/127.0.0.1/tcp/0/ws".parse()?;
    swarm.listen_on(ws_addr)?;

    // Inbound peering is optional: behind a hostname-routed proxy there is no
    // way to publish this port, and outbound dialing works without a listener.
    if args.tcp_port != 0 {
        let tcp_addr: Multiaddr = format!("/ip4/0.0.0.0/tcp/{}", args.tcp_port).parse()?;
        swarm.listen_on(tcp_addr)?;
    } else {
        info!("Inbound P2P TCP listener disabled (--tcp-port 0); outbound dialing still active");
    }

    // Bind before entering the event loop so a port clash fails immediately and
    // visibly, instead of leaving a relay that is up but unreachable.
    let public_listener = TcpListener::bind(("0.0.0.0", args.ws_port)).await?;
    let (internal_ws_port_tx, internal_ws_port_rx) = oneshot::channel();
    let mut internal_ws_port_tx = Some(internal_ws_port_tx);
    let public_port = args.ws_port;
    tokio::spawn(async move {
        if let Err(e) = serve_public_port(public_listener, internal_ws_port_rx).await {
            error!("Public listener on port {} stopped: {}", public_port, e);
            std::process::exit(1);
        }
    });

    let topic = gossipsub::IdentTopic::new(format!("/{}/offers/1", network_name));
    swarm.behaviour_mut().gossipsub.subscribe(&topic)?;

    for peer_str in &bootstrap_peers {
        if let Ok(addr) = peer_str.parse::<Multiaddr>() {
            if let Some(Protocol::P2p(peer_id)) = addr.iter().last() {
                swarm.behaviour_mut().kademlia.add_address(&peer_id, addr.clone());
                if let Err(e) = swarm.dial(addr) {
                    error!("Failed to dial bootstrap peer {}: {}", peer_id, e);
                }
            }
        }
    }

    if !bootstrap_peers.is_empty() {
        if let Err(e) = swarm.behaviour_mut().kademlia.bootstrap() {
            error!("Kademlia bootstrap error: {:?}", e);
        }
    }

    let max_ws_connections = args.max_ws_connections;
    let mut peer_discovery_interval = tokio::time::interval(Duration::from_secs(30));
    let mut stats_interval = tokio::time::interval(Duration::from_secs(30));
    let mut reconnect_interval = tokio::time::interval(Duration::from_secs(120));
    let mut connected_peers: usize = 0;
    let mut ws_connections: usize = 0;
    let mut offers_relayed: usize = 0;
    let mut peer_agents: HashMap<PeerId, String> = HashMap::new();
    let mut rejected_ws_peers: HashSet<PeerId> = HashSet::new();
    let bootstrap_addrs: Vec<Multiaddr> = bootstrap_peers
        .iter()
        .filter_map(|s| s.parse().ok())
        .collect();

    info!(
        "splash-relay ready | network={} public_port={} inbound_tcp={} max_ws={} peer_id={}",
        network_name,
        args.ws_port,
        if args.tcp_port == 0 {
            "disabled".to_string()
        } else {
            args.tcp_port.to_string()
        },
        max_ws_connections,
        local_peer_id
    );

    // Dexie API base URL (can be configured via env; defaults match frontend getDexieApiUrl).
    let dexie_api_base = if testnet {
        std::env::var("DEXIE_TESTNET_API_BASE")
            .unwrap_or_else(|_| "https://api-testnet.dexie.space".to_string())
    } else {
        std::env::var("DEXIE_MAINNET_API_BASE")
            .unwrap_or_else(|_| "https://api.dexie.space".to_string())
    };

    // Cache of enriched Dexie offer JSON values keyed by raw offer string.
    let mut offer_cache: HashMap<String, EnrichedOffer> = HashMap::new();
    // Track which offers we've already published in this relay process so we don't
    // re-broadcast the same offer multiple times if the network gossips it again.
    let mut published_offers: HashSet<String> = HashSet::new();

    loop {
        tokio::select! {
            _ = peer_discovery_interval.tick() => {
                swarm.behaviour_mut().kademlia.get_closest_peers(PeerId::random());
            }
            _ = stats_interval.tick() => {
                debug!("Stats: {} peers ({} WS), {} offers", connected_peers, ws_connections, offers_relayed);
                if connected_peers == 0 {
                    if bootstrap_addrs.is_empty() {
                        error!("No peers connected and no bootstrap peers configured; relay cannot join network");
                    } else {
                        warn!("No peers connected; check network/DNS and bootstrap peers");
                    }
                }
            }
            _ = reconnect_interval.tick() => {
                if connected_peers < 3 {
                    debug!("Reconnecting to bootstrap peers (have {})", connected_peers);
                    for addr in &bootstrap_addrs {
                        let _ = swarm.dial(addr.clone());
                    }
                }
            }
            event = swarm.select_next_some() => {
                match event {
                    SwarmEvent::IncomingConnection { .. } => {}
                    SwarmEvent::IncomingConnectionError { local_addr, error, .. } => {
                        let is_ws = local_addr.iter().any(|p| matches!(p, Protocol::Ws(_)));
                        error!("Incoming connection error ({}): {:?}", if is_ws { "WS" } else { "TCP" }, error);
                    }
                    SwarmEvent::NewListenAddr { address, .. } => {
                        debug!("Listening on {}", address.clone().with(Protocol::P2p(local_peer_id)));
                        // Hand the OS-assigned loopback WebSocket port to the
                        // public listener, which is waiting to start accepting.
                        if address.iter().any(|p| matches!(p, Protocol::Ws(_))) {
                            if let (Some(tx), Some(port)) = (
                                internal_ws_port_tx.take(),
                                address.iter().find_map(|p| match p {
                                    Protocol::Tcp(port) => Some(port),
                                    _ => None,
                                }),
                            ) {
                                let _ = tx.send(port);
                            }
                        }
                    }
                    SwarmEvent::ConnectionEstablished { peer_id, endpoint, .. } => {
                        connected_peers += 1;
                        if is_inbound_ws(&endpoint) {
                            if ws_connections >= max_ws_connections as usize {
                                warn!(
                                    "WS connection limit reached ({}), rejecting peer",
                                    max_ws_connections
                                );
                                rejected_ws_peers.insert(peer_id);
                                let _ = swarm.disconnect_peer_id(peer_id);
                                connected_peers = connected_peers.saturating_sub(1);
                            } else {
                                ws_connections += 1;
                                if connected_peers == 1 {
                                    info!("First peer connected: {} (WS)", peer_id);
                                }
                                debug!("WS peer connected (total WS: {})", ws_connections);
                            }
                        } else {
                            if connected_peers == 1 {
                                info!("First peer connected: {} (TCP)", peer_id);
                            }
                            debug!("TCP peer connected (total: {})", connected_peers);
                        }
                    }
                    SwarmEvent::ConnectionClosed { peer_id, endpoint, .. } => {
                        if is_inbound_ws(&endpoint) && !rejected_ws_peers.remove(&peer_id) {
                            ws_connections = ws_connections.saturating_sub(1);
                        }
                        connected_peers = connected_peers.saturating_sub(1);
                        debug!("Peer disconnected (peers: {}, WS: {})", connected_peers, ws_connections);
                    }
                    SwarmEvent::OutgoingConnectionError { .. } => {}
                    SwarmEvent::Behaviour(RelayBehaviourEvent::Gossipsub(
                        gossipsub::Event::Message { propagation_source, message_id, message }
                    )) => {
                        let offer_len = message.data.len();
                        if offer_len <= MAX_OFFER_SIZE {
                            let _ = swarm.behaviour_mut().gossipsub.report_message_validation_result(
                                &message_id,
                                &propagation_source,
                                MessageAcceptance::Accept,
                            );

                            // Try to decode enriched offers first (already-enriched JSON from peers),
                            // then fall back to minimal Splash offer payload and enrich it via Dexie with caching.
                            let mut offer_key: Option<String> = None;
                            let maybe_enriched = if let Ok(json_from_peer) =
                                serde_json::from_slice::<serde_json::Value>(&message.data)
                            {
                                // Only accept enriched offers that actually have asset details.
                                let offered_len = json_from_peer
                                    .get("offered")
                                    .and_then(|v| v.as_array())
                                    .map(|a| a.len())
                                    .unwrap_or(0);
                                let requested_len = json_from_peer
                                    .get("requested")
                                    .and_then(|v| v.as_array())
                                    .map(|a| a.len())
                                    .unwrap_or(0);

                                if offered_len > 0 && requested_len > 0 {
                                    let key = json_from_peer
                                        .get("id")
                                        .and_then(|v| v.as_str())
                                        .map(|s| s.to_string())
                                        .or_else(|| {
                                            json_from_peer
                                                .get("offer")
                                                .and_then(|v| v.as_str())
                                                .map(|s| s.to_string())
                                        })
                                        .unwrap_or_default();

                                    if !key.is_empty() {
                                        offer_key = Some(key.clone());
                                    }

                                    debug!(
                                        "Received enriched offer JSON from peer {}: key={} offered_len={} requested_len={}",
                                        propagation_source,
                                        key,
                                        offered_len,
                                        requested_len,
                                    );

                                    if let Some(k) = &offer_key {
                                        // If we've already published this enriched offer once in this process,
                                        // skip re-broadcast entirely.
                                        if published_offers.contains(k) {
                                            debug!("Skipping already-published enriched offer {}", k);
                                            None
                                        } else {
                                            if offer_cache.len() >= MAX_OFFER_CACHE_SIZE {
                                                if let Some(old_key) = offer_cache.keys().next().cloned() {
                                                    offer_cache.remove(&old_key);
                                                }
                                            }
                                            offer_cache.insert(k.clone(), json_from_peer.clone());
                                            Some(json_from_peer)
                                        }
                                    } else {
                                        Some(json_from_peer)
                                    }
                                } else {
                                    debug!(
                                        "Ignoring enriched offer JSON from {} with empty assets",
                                        propagation_source
                                    );
                                    None
                                }
                            } else if let Ok(text) = std::str::from_utf8(&message.data) {
                                // Raw (minimal) Splash offer payload; only log the offer key, not the full string.
                                if let Ok(minimal) = serde_json::from_str::<MinimalSplashOffer>(text) {
                                    let key = minimal.offer.clone();
                                    offer_key = Some(key.clone());

                                    // Log every offer we decode at debug level.
                                    debug!(
                                        "Parsed MinimalSplashOffer from {}: offer={}",
                                        propagation_source, key
                                    );

                                    // If we've already published this offer once in this process,
                                    // skip enrichment and re-broadcast entirely (duplicate offer).
                                    if published_offers.contains(&key) {
                                        debug!("Skipping already-published offer {}", key);
                                        None
                                    } else if let Some(cached) = offer_cache.get(&key) {
                                        debug!("Using cached enriched offer for {}", key);
                                        Some(cached.clone())
                                    } else {
                                        match fetch_enriched_offer(&dexie_api_base, &minimal.offer).await {
                                            Ok(Some(enriched)) => {
                                                if offer_cache.len() >= MAX_OFFER_CACHE_SIZE {
                                                    if let Some(old_key) = offer_cache.keys().next().cloned() {
                                                        offer_cache.remove(&old_key);
                                                    }
                                                }
                                                debug!(
                                                    "Dexie POST enrichment success (cached) | len_offered={} len_requested={}",
                                                    enriched
                                                        .get("offered")
                                                        .and_then(|v| v.as_array())
                                                        .map(|a| a.len())
                                                        .unwrap_or(0),
                                                    enriched
                                                        .get("requested")
                                                        .and_then(|v| v.as_array())
                                                        .map(|a| a.len())
                                                        .unwrap_or(0),
                                                );
                                                offer_cache.insert(key.clone(), enriched.clone());
                                                Some(enriched)
                                            }
                                            Ok(None) => {
                                                debug!(
                                                    "Dexie POST enrichment returned no offer JSON for key={}",
                                                    key
                                                );
                                                None
                                            }
                                            Err(e) => {
                                                debug!("Dexie POST enrichment error for key {}: {:?}", key, e);
                                                None
                                            }
                                        }
                                    }
                                } else {
                                    // Not a MinimalSplashOffer JSON; treat the whole text as an offer string and try enrichment
                                    // without logging the raw offer.
                                    let key = text.trim().to_string();
                                    offer_key = Some(key.clone());

                                    if published_offers.contains(&key) {
                                        debug!("Skipping already-published raw offer {}", key);
                                        None
                                    } else if let Some(cached) = offer_cache.get(&key) {
                                        debug!("Using cached enriched offer for raw offer {}", key);
                                        Some(cached.clone())
                                    } else {
                                        match fetch_enriched_offer(&dexie_api_base, &key).await {
                                            Ok(Some(enriched)) => {
                                                if offer_cache.len() >= MAX_OFFER_CACHE_SIZE {
                                                    if let Some(old_key) = offer_cache.keys().next().cloned() {
                                                        offer_cache.remove(&old_key);
                                                    }
                                                }
                                                debug!(
                                                    "Dexie POST enrichment success (cached, raw) | len_offered={} len_requested={}",
                                                    enriched
                                                        .get("offered")
                                                        .and_then(|v| v.as_array())
                                                        .map(|a| a.len())
                                                        .unwrap_or(0),
                                                    enriched
                                                        .get("requested")
                                                        .and_then(|v| v.as_array())
                                                        .map(|a| a.len())
                                                        .unwrap_or(0),
                                                );
                                                offer_cache.insert(key.clone(), enriched.clone());
                                                Some(enriched)
                                            }
                                            Ok(None) => {
                                                debug!(
                                                    "No enriched offer returned from Dexie (GET+PATCH) for raw offer={}",
                                                    key
                                                );
                                                None
                                            }
                                            Err(e) => {
                                                debug!("Dexie enrichment error for raw offer {}: {:?}", key, e);
                                                None
                                            }
                                        }
                                    }
                                }
                            } else {
                                debug!(
                                    "Received non-UTF8 offer payload ({} bytes); nothing to broadcast",
                                    offer_len
                                );
                                None
                            };

                            if let Some(enriched) = maybe_enriched {
                                // Validate enriched JSON has non-empty offered/requested arrays before broadcasting.
                                let offered = enriched
                                    .get("offered")
                                    .and_then(|v| v.as_array())
                                    .cloned()
                                    .unwrap_or_default();
                                let requested = enriched
                                    .get("requested")
                                    .and_then(|v| v.as_array())
                                    .cloned()
                                    .unwrap_or_default();

                                // Only broadcast open offers (Dexie status = 0).
                                let status_val = enriched
                                    .get("status")
                                    .and_then(|v| v.as_i64())
                                    .unwrap_or(0);
                                if status_val != 0 {
                                    debug!(
                                        "Enriched offer has non-open status ({}); not broadcasting. key={:?}",
                                        status_val,
                                        offer_key
                                    );
                                    continue;
                                }

                                if offered.is_empty() || requested.is_empty() {
                                    debug!(
                                        "Enriched offer has empty offered/requested; not broadcasting. key={:?}",
                                        offer_key
                                    );
                                    continue;
                                }

                                // Log the full enriched JSON we are about to broadcast so that
                                // the asset tickers, amounts, and all Dexie fields are visible.
                                debug!(
                                    "Broadcasting enriched offer JSON from {}: {}",
                                    propagation_source,
                                    enriched
                                );
                                offers_relayed += 1;
                                if let Some(k) = offer_key {
                                    published_offers.insert(k);
                                }
                                if let Err(e) = swarm
                                    .behaviour_mut()
                                    .gossipsub
                                    .publish(topic.clone(), serde_json::to_vec(&enriched).unwrap_or_default())
                                {
                                    debug!("re-publish failed for enriched offer: {:?}", e);
                                }
                            } else if let Some(key) = offer_key {
                                // We only broadcast enriched offers; log that this one was dropped.
                                debug!(
                                    "Not broadcasting offer without enrichment after Dexie POST attempts: offer={}",
                                    key
                                );
                            }
                        } else {
                            warn!("Rejecting oversized offer: {} bytes", offer_len);
                            let _ = swarm.behaviour_mut().gossipsub.report_message_validation_result(
                                &message_id,
                                &propagation_source,
                                MessageAcceptance::Reject,
                            );
                        }
                    }
                    SwarmEvent::Behaviour(RelayBehaviourEvent::Gossipsub(
                        gossipsub::Event::Subscribed { .. }
                    )) => {}
                    SwarmEvent::Behaviour(RelayBehaviourEvent::Identify(
                        identify::Event::Received { peer_id, info, .. }
                    )) => {
                        peer_agents.insert(peer_id, info.agent_version.clone());
                        for addr in info.listen_addrs {
                            let is_non_global = addr.iter().any(|p| match p {
                                Protocol::Ip4(ip) => ip.is_loopback() || ip.is_private(),
                                Protocol::Ip6(ip) => ip.is_loopback(),
                                _ => false,
                            });
                            if !is_non_global {
                                swarm.behaviour_mut().kademlia.add_address(&peer_id, addr);
                            }
                        }
                    }
                    SwarmEvent::Behaviour(RelayBehaviourEvent::Kademlia(
                        kad::Event::RoutingUpdated { .. }
                    )) => {}
                    _ => {}
                }
            }
        }
    }
    // Unreachable: main loop never exits unless process is killed or panics.
    #[allow(unreachable_code)]
    {
        error!("main loop exited unexpectedly");
        anyhow::bail!("main loop exited unexpectedly");
    }
}

async fn resolve_peers_from_dns(network_name: &str) -> Result<Vec<String>> {
    use hickory_resolver::TokioAsyncResolver;

    let (config, mut opts) = hickory_resolver::system_conf::read_system_conf()?;
    opts.edns0 = true;
    opts.try_tcp_on_error = true;

    let resolver = TokioAsyncResolver::tokio(config, opts);
    let domain = format!("_dnsaddr.{}.dexie.space.", network_name);

    let records = resolver.txt_lookup(&domain).await?;

    let peers: Vec<String> = records
        .iter()
        .flat_map(|record| record.txt_data())
        .filter_map(|txt| std::str::from_utf8(txt).ok())
        .map(|addr_str| addr_str.trim_start_matches("dnsaddr=").to_string())
        .collect();

    Ok(peers)
}
