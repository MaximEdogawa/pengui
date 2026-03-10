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
use std::collections::hash_map::DefaultHasher;
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::time::Duration;

const NETWORK_NAME: &str = "splash";
const MAX_OFFER_SIZE: usize = 300 * 1024;

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
    /// TCP listen port for Splash network connections
    #[arg(short = 't', long, default_value = "11511")]
    tcp_port: u16,

    /// WebSocket listen port for browser connections
    #[arg(short = 'w', long, default_value = "9090")]
    ws_port: u16,

    /// Known peer multiaddrs (can be specified multiple times)
    #[arg(short = 'k', long)]
    known_peer: Vec<String>,

    /// Use testnet (splash-testnet)
    #[arg(long)]
    testnet: bool,

    /// Maximum concurrent WebSocket (browser/app) connections. Incoming WS over this limit are disconnected.
    #[arg(long, default_value = "500")]
    max_ws_connections: u32,
}

#[derive(libp2p::swarm::NetworkBehaviour)]
struct RelayBehaviour {
    gossipsub: gossipsub::Behaviour,
    kademlia: kad::Behaviour<kad::store::MemoryStore>,
    identify: identify::Behaviour,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Default info shows one startup line only; warn/error for issues. Set RUST_LOG=debug for verbose.
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    // Log panic as error so production logs show why the service stopped, then run default handler.
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        error!("splash-relay panic (service stopping): {}", panic_info);
        default_hook(panic_info);
    }));

    let args = Args::parse();
    let network_name = if args.testnet {
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

    let tcp_addr: Multiaddr = format!("/ip4/0.0.0.0/tcp/{}", args.tcp_port).parse()?;
    swarm.listen_on(tcp_addr)?;

    let ws_addr: Multiaddr = format!("/ip4/0.0.0.0/tcp/{}/ws", args.ws_port).parse()?;
    swarm.listen_on(ws_addr)?;

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
        "splash-relay ready | network={} tcp={} ws={} max_ws={} peer_id={}",
        network_name, args.tcp_port, args.ws_port, max_ws_connections, local_peer_id
    );

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
                            offers_relayed += 1;
                            if let Err(e) = swarm
                                .behaviour_mut()
                                .gossipsub
                                .publish(topic.clone(), message.data.clone())
                            {
                                debug!("re-publish failed: {:?}", e);
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
