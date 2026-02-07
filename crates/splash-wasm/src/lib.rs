//! libp2p WASM client for Splash: connect to a relay via WebSocket, receive offers via Gossipsub.
//! Compatible with splash-relay (same protocol IDs: /splash/kad/1, /splash/id/1, /splash/offers/1).

use futures::{FutureExt, StreamExt};
use gloo_timers::future::TimeoutFuture;
use libp2p::gossipsub::{self, MessageAcceptance};
use libp2p::multiaddr::Protocol;
use libp2p::swarm::{Config as SwarmConfig, NetworkBehaviour};
use libp2p::{
    identify, identity, kad, noise, swarm::SwarmEvent, yamux, Multiaddr, PeerId, StreamProtocol,
    Transport,
};
use libp2p_webrtc_websys as webrtc;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashSet;
use std::hash::{Hash, Hasher};
use std::rc::Rc;
use std::time::Duration;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::console;

const MAX_OFFER_SIZE: usize = 300 * 1024;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Offer {
    pub offer: String,
    pub peer_id: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SplashPeer {
    pub id: String,
    pub multiaddr: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StartOptions {
    #[serde(default)]
    pub bootstrap_peers: Vec<SplashPeer>,
    #[serde(default)]
    pub network: String,
}

#[derive(NetworkBehaviour)]
struct SplashBehaviour {
    gossipsub: gossipsub::Behaviour,
    kademlia: kad::Behaviour<kad::store::MemoryStore>,
    identify: identify::Behaviour,
}

#[wasm_bindgen]
pub struct SplashNode {
    peer_id: String,
    keypair: identity::Keypair,
    offer_callback: Rc<RefCell<Option<js_sys::Function>>>,
    peer_callback: Rc<RefCell<Option<js_sys::Function>>>,
    error_callback: Rc<RefCell<Option<js_sys::Function>>>,
    log_callback: Rc<RefCell<Option<js_sys::Function>>>,
    offer_sender: Rc<RefCell<Option<futures::channel::mpsc::UnboundedSender<String>>>>,
    connect_sender: Rc<RefCell<Option<futures::channel::mpsc::UnboundedSender<Multiaddr>>>>,
    is_started: Rc<RefCell<bool>>,
}

#[wasm_bindgen]
impl SplashNode {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<SplashNode, JsValue> {
        console_error_panic_hook::set_once();
        let keypair = identity::Keypair::generate_ed25519();
        let local_peer_id = PeerId::from(keypair.public());
        log(&format!("[Splash] Initialized with Peer ID: {}", local_peer_id));
        Ok(SplashNode {
            peer_id: local_peer_id.to_string(),
            keypair,
            offer_callback: Rc::new(RefCell::new(None)),
            peer_callback: Rc::new(RefCell::new(None)),
            error_callback: Rc::new(RefCell::new(None)),
            log_callback: Rc::new(RefCell::new(None)),
            offer_sender: Rc::new(RefCell::new(None)),
            connect_sender: Rc::new(RefCell::new(None)),
            is_started: Rc::new(RefCell::new(false)),
        })
    }

    #[wasm_bindgen(getter)]
    pub fn peer_id(&self) -> String {
        self.peer_id.clone()
    }

    #[wasm_bindgen]
    pub fn set_offer_callback(&self, callback: js_sys::Function) {
        *self.offer_callback.borrow_mut() = Some(callback);
    }

    #[wasm_bindgen]
    pub fn set_peer_callback(&self, callback: js_sys::Function) {
        *self.peer_callback.borrow_mut() = Some(callback);
    }

    #[wasm_bindgen]
    pub fn set_error_callback(&self, callback: js_sys::Function) {
        *self.error_callback.borrow_mut() = Some(callback);
    }

    #[wasm_bindgen]
    pub fn set_log_callback(&self, callback: js_sys::Function) {
        *self.log_callback.borrow_mut() = Some(callback);
    }

    #[wasm_bindgen]
    pub fn broadcast_offer(&self, offer: String) -> Result<(), JsValue> {
        if !*self.is_started.borrow() {
            return Err(JsValue::from_str("Node not started. Call start() first."));
        }
        if offer.len() > MAX_OFFER_SIZE {
            return Err(JsValue::from_str(&format!(
                "Offer too large, max {} bytes",
                MAX_OFFER_SIZE
            )));
        }
        let sender = self.offer_sender.borrow();
        if let Some(tx) = sender.as_ref() {
            tx.unbounded_send(offer)
                .map_err(|e| JsValue::from_str(&format!("Failed to send offer: {}", e)))?;
            Ok(())
        } else {
            Err(JsValue::from_str("Offer channel not initialized"))
        }
    }

    #[wasm_bindgen]
    pub fn connect_to_peer(&self, multiaddr: String) -> Result<(), JsValue> {
        if !*self.is_started.borrow() {
            return Err(JsValue::from_str("Node not started. Call start() first."));
        }
        let addr: Multiaddr = multiaddr
            .parse()
            .map_err(|e| JsValue::from_str(&format!("Invalid multiaddr: {}", e)))?;
        let sender = self.connect_sender.borrow();
        if let Some(tx) = sender.as_ref() {
            tx.unbounded_send(addr)
                .map_err(|e| JsValue::from_str(&format!("Failed to send connect: {}", e)))?;
            Ok(())
        } else {
            Err(JsValue::from_str("Connect channel not initialized"))
        }
    }

    #[wasm_bindgen]
    pub async fn start(&self, options_js: JsValue) -> Result<(), JsValue> {
        if *self.is_started.borrow() {
            return Err(JsValue::from_str("Node already started"));
        }
        let options: StartOptions = serde_wasm_bindgen::from_value(options_js).unwrap_or(
            StartOptions {
                bootstrap_peers: vec![],
                network: "splash".to_string(),
            },
        );
        let network_name = if options.network.is_empty() {
            "splash"
        } else {
            options.network.as_str()
        };
        let bootstrap_peers = options.bootstrap_peers;

        log(&format!(
            "[Splash] Starting network={} with {} bootstrap peers",
            network_name,
            bootstrap_peers.len()
        ));

        let (offer_tx, mut offer_rx) = futures::channel::mpsc::unbounded::<String>();
        let (connect_tx, mut connect_rx) = futures::channel::mpsc::unbounded::<Multiaddr>();

        *self.offer_sender.borrow_mut() = Some(offer_tx);
        *self.connect_sender.borrow_mut() = Some(connect_tx);
        *self.is_started.borrow_mut() = true;

        let local_key = self.keypair.clone();

        let mut swarm = libp2p::SwarmBuilder::with_existing_identity(local_key.clone())
            .with_wasm_bindgen()
            .with_other_transport(|key| webrtc::Transport::new(webrtc::Config::new(key)))
            .map_err(|e| JsValue::from_str(&format!("WebRTC transport error: {}", e)))?
            .with_other_transport(|key| {
                Ok(libp2p::websocket_websys::Transport::default()
                    .upgrade(libp2p::core::upgrade::Version::V1)
                    .authenticate(noise::Config::new(key).expect("noise config"))
                    .multiplex(yamux::Config::default())
                    .boxed())
            })
            .map_err(|e| JsValue::from_str(&format!("WebSocket transport error: {}", e)))?
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
                let kad_protocol =
                    StreamProtocol::try_from_owned(format!("/{}/kad/1", network_name))
                        .expect("protocol name is valid");
                let mut kad_config = kad::Config::new(kad_protocol);
                kad_config.set_query_timeout(Duration::from_secs(60));
                let store = kad::store::MemoryStore::new(key.public().to_peer_id());
                let kademlia =
                    kad::Behaviour::with_config(key.public().to_peer_id(), store, kad_config);
                let identify = identify::Behaviour::new(
                    identify::Config::new(
                        format!("/{}/id/1", network_name),
                        key.public().clone(),
                    )
                    .with_agent_version(format!("splash-wasm/{}", env!("CARGO_PKG_VERSION"))),
                );
                Ok(SplashBehaviour {
                    gossipsub,
                    kademlia,
                    identify,
                })
            })
            .map_err(|e| JsValue::from_str(&format!("Behaviour error: {}", e)))?
            .with_swarm_config(|c: SwarmConfig| {
                c.with_idle_connection_timeout(Duration::from_secs(60))
            })
            .build();

        let webrtc_addr: Multiaddr = "/webrtc".parse().expect("valid webrtc multiaddr");
        let _ = swarm.listen_on(webrtc_addr);

        let topic = gossipsub::IdentTopic::new(format!("/{}/offers/1", network_name));
        swarm
            .behaviour_mut()
            .gossipsub
            .subscribe(&topic)
            .map_err(|e| JsValue::from_str(&format!("Subscribe error: {:?}", e)))?;
        log(&format!("[Splash] Subscribed to /{}/offers/1", network_name));

        for peer in &bootstrap_peers {
            if let Ok(addr) = peer.multiaddr.parse::<Multiaddr>() {
                if let Some(Protocol::P2p(peer_id)) = addr.iter().last() {
                    swarm.behaviour_mut().kademlia.add_address(&peer_id, addr.clone());
                    if let Err(e) = swarm.dial(addr) {
                        log(&format!("[Splash] Failed to dial {}: {:?}", peer.id, e));
                    }
                }
            }
        }
        if !bootstrap_peers.is_empty() {
            let _ = swarm.behaviour_mut().kademlia.bootstrap();
        }

        let offer_callback = self.offer_callback.clone();
        let peer_callback = self.peer_callback.clone();
        let error_callback = self.error_callback.clone();

        wasm_bindgen_futures::spawn_local(async move {
            let mut browser_peers: HashSet<PeerId> = HashSet::new();
            let mut pending_webrtc_dials: HashSet<PeerId> = HashSet::new();

            loop {
                futures::select! {
                    offer = offer_rx.next() => {
                        if let Some(offer_data) = offer {
                            if let Err(e) = swarm.behaviour_mut().gossipsub.publish(topic.clone(), offer_data.as_bytes()) {
                                log(&format!("[Splash] Publish error: {:?}", e));
                            }
                        }
                    }
                    addr = connect_rx.next() => {
                        if let Some(multiaddr) = addr {
                            log(&format!("[Splash] Connecting to: {}", multiaddr));
                            if let Some(Protocol::P2p(peer_id)) = multiaddr.iter().last() {
                                swarm.behaviour_mut().kademlia.add_address(&peer_id, multiaddr.clone());
                            }
                            if let Err(e) = swarm.dial(multiaddr) {
                                log(&format!("[Splash] Dial error: {:?}", e));
                            }
                        }
                    }
                    event = swarm.select_next_some() => {
                        match event {
                            SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                                log(&format!("[Splash] Connected to {}", peer_id));
                                pending_webrtc_dials.remove(&peer_id);
                                if let Some(cb) = peer_callback.borrow().as_ref() {
                                    let _ = cb.call1(&JsValue::NULL, &JsValue::from_str(&peer_id.to_string()));
                                }
                            }
                            SwarmEvent::ConnectionClosed { peer_id, .. } => {
                                log(&format!("[Splash] Disconnected from {}", peer_id));
                            }
                            SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => {
                                if let Some(pid) = peer_id {
                                    pending_webrtc_dials.remove(&pid);
                                }
                                let err_msg = format!("{:?}", error);
                                log(&format!("[Splash] Connection error to {:?}: {}", peer_id, err_msg));
                                if let Some(cb) = error_callback.borrow().as_ref() {
                                    let _ = cb.call1(&JsValue::NULL, &JsValue::from_str(&err_msg));
                                }
                            }
                            SwarmEvent::Behaviour(SplashBehaviourEvent::Gossipsub(
                                gossipsub::Event::Message { propagation_source, message_id, message }
                            )) => {
                                let offer_str = String::from_utf8_lossy(&message.data).to_string();
                                log(&format!("[Splash] Gossipsub message received ({} bytes from {})", offer_str.len(), propagation_source));
                                if offer_str.len() <= MAX_OFFER_SIZE {
                                    let _ = swarm.behaviour_mut().gossipsub.report_message_validation_result(
                                        &message_id,
                                        &propagation_source,
                                        MessageAcceptance::Accept,
                                    );
                                    match offer_callback.borrow().as_ref() {
                                        Some(cb) => {
                                            let offer = Offer {
                                                offer: offer_str,
                                                peer_id: propagation_source.to_string(),
                                                timestamp: js_sys::Date::now(),
                                            };
                                            match serde_wasm_bindgen::to_value(&offer) {
                                                Ok(js_offer) => {
                                                    let _ = cb.call1(&JsValue::NULL, &js_offer);
                                                    log("[Splash] Offer callback invoked");
                                                }
                                                Err(e) => {
                                                    log(&format!("[Splash] to_value error: {:?}", e));
                                                }
                                            }
                                        }
                                        None => {
                                            log("[Splash] WARNING: no offer callback set, dropping message");
                                        }
                                    }
                                } else {
                                    let _ = swarm.behaviour_mut().gossipsub.report_message_validation_result(
                                        &message_id,
                                        &propagation_source,
                                        MessageAcceptance::Reject,
                                    );
                                }
                            }
                            SwarmEvent::Behaviour(SplashBehaviourEvent::Identify(
                                identify::Event::Received { peer_id, info, .. }
                            )) => {
                                if info.agent_version.starts_with("splash-wasm/") {
                                    browser_peers.insert(peer_id);
                                    for addr in &info.listen_addrs {
                                        if addr.iter().any(|p| matches!(p, Protocol::WebRTCDirect)) {
                                            if !swarm.is_connected(&peer_id) && !pending_webrtc_dials.contains(&peer_id) {
                                                pending_webrtc_dials.insert(peer_id);
                                                swarm.behaviour_mut().kademlia.add_address(&peer_id, (*addr).clone());
                                                let _ = swarm.dial((*addr).clone());
                                                break;
                                            }
                                        }
                                    }
                                }
                                for addr in info.listen_addrs {
                                    let is_webrtc = addr.iter().any(|p| matches!(p, Protocol::WebRTCDirect));
                                    let is_non_global = addr.iter().any(|p| match p {
                                        Protocol::Ip4(ip) => ip.is_loopback() || ip.is_private(),
                                        Protocol::Ip6(ip) => ip.is_loopback(),
                                        _ => false,
                                    });
                                    if is_webrtc || !is_non_global {
                                        swarm.behaviour_mut().kademlia.add_address(&peer_id, addr);
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                    _ = TimeoutFuture::new(10_000).fuse() => {
                        swarm.behaviour_mut().kademlia.get_closest_peers(PeerId::random());
                    }
                }
            }
        });

        log("[Splash] Node started");
        Ok(())
    }

    #[wasm_bindgen]
    pub fn is_started(&self) -> bool {
        *self.is_started.borrow()
    }
}

fn log(msg: &str) {
    console::log_1(&JsValue::from_str(msg));
}

/// Convert ws:// or wss:// URL to libp2p multiaddr.
pub fn url_to_multiaddr(url: &str) -> Result<Multiaddr, JsValue> {
    let url = url.trim();
    let (protocol, rest) = url
        .split_once("://")
        .ok_or_else(|| JsValue::from_str("URL must start with ws:// or wss://"))?;
    let is_wss = protocol.eq_ignore_ascii_case("wss");
    let default_port = if is_wss { 443 } else { 80 };
    let host_part = rest.split('/').next().unwrap_or(rest).trim();
    let (host, port) = if let Some((h, port_str)) = host_part.split_once(':') {
        let port: u16 = port_str
            .trim()
            .parse()
            .map_err(|_| JsValue::from_str("Invalid port"))?;
        (h.trim(), port)
    } else {
        (host_part, default_port)
    };
    if host.is_empty() {
        return Err(JsValue::from_str("Empty host"));
    }
    let (addr_type, host_val) = if host.parse::<std::net::Ipv4Addr>().is_ok() {
        ("ip4", host)
    } else if host.starts_with('[') {
        return Err(JsValue::from_str("IPv6 not supported in URL parser"));
    } else {
        ("dns4", host)
    };
    let ws_proto = if is_wss { "wss" } else { "ws" };
    let ma_str = format!("/{}/{}/tcp/{}/{}", addr_type, host_val, port, ws_proto);
    ma_str
        .parse()
        .map_err(|e| JsValue::from_str(&format!("Invalid multiaddr: {}", e)))
}

#[wasm_bindgen(js_name = init)]
pub fn init(relay_url: &str, network: &str) -> Result<(), JsValue> {
    WrapperState::init(
        relay_url.to_string(),
        if network.is_empty() {
            "splash"
        } else {
            network
        }
        .to_string(),
    )
}

#[wasm_bindgen(js_name = setOnOffersCallback)]
pub fn set_on_offers_callback(callback: js_sys::Function) -> Result<(), JsValue> {
    WrapperState::set_on_offers_callback(callback)
}

#[wasm_bindgen(js_name = setOnStatusCallback)]
pub fn set_on_status_callback(callback: js_sys::Function) -> Result<(), JsValue> {
    WrapperState::set_on_status_callback(callback)
}

#[wasm_bindgen(js_name = connect)]
pub fn connect() -> Result<(), JsValue> {
    WrapperState::connect()
}

#[wasm_bindgen(js_name = disconnect)]
pub fn disconnect() -> Result<(), JsValue> {
    WrapperState::disconnect()
}

#[wasm_bindgen(js_name = getConnectionStatus)]
pub fn get_connection_status() -> Result<String, JsValue> {
    WrapperState::get_connection_status()
}

#[wasm_bindgen(js_name = setFilterAsset)]
pub fn set_filter_asset(_pair: &str) -> Result<(), JsValue> {
    Ok(())
}

#[wasm_bindgen(js_name = setFilterPrice)]
pub fn set_filter_price(_min: f64, _max: f64) -> Result<(), JsValue> {
    Ok(())
}

#[wasm_bindgen(js_name = setFilterAmount)]
pub fn set_filter_amount(_min: f64) -> Result<(), JsValue> {
    Ok(())
}

#[wasm_bindgen(js_name = clearFilters)]
pub fn clear_filters() -> Result<(), JsValue> {
    Ok(())
}

#[wasm_bindgen(js_name = getOffers)]
pub fn get_offers(_skip: usize, _limit: usize) -> Result<JsValue, JsValue> {
    Ok(js_sys::Array::new().into())
}

#[wasm_bindgen(js_name = broadcastOffer)]
pub fn broadcast_offer_wrapper(offer: &str) -> Result<(), JsValue> {
    WrapperState::broadcast(offer.to_string())
}

#[wasm_bindgen(js_name = getStats)]
pub fn get_stats() -> Result<JsValue, JsValue> {
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("received"),
        &JsValue::from(0f64),
    );
    let _ = js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("filtered"),
        &JsValue::from(0f64),
    );
    let _ = js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("bufferLen"),
        &JsValue::from(0f64),
    );
    Ok(obj.into())
}

struct WrapperState {
    relay_url: String,
    network: String,
    status: String,
    on_offers: Option<js_sys::Function>,
    on_status: Option<js_sys::Function>,
    offer_sender: Option<futures::channel::mpsc::UnboundedSender<String>>,
}

thread_local! {
    static WRAPPER: RefCell<Option<WrapperState>> = RefCell::new(None);
}

impl WrapperState {
    fn init(relay_url: String, network: String) -> Result<(), JsValue> {
        WRAPPER.with(|cell| {
            *cell.borrow_mut() = Some(WrapperState {
                relay_url,
                network,
                status: "disconnected".to_string(),
                on_offers: None,
                on_status: None,
                offer_sender: None,
            });
        });
        Ok(())
    }

    fn set_on_offers_callback(callback: js_sys::Function) -> Result<(), JsValue> {
        WRAPPER.with(|cell| {
            if let Some(ref mut s) = *cell.borrow_mut() {
                s.on_offers = Some(callback);
            }
        });
        Ok(())
    }

    fn set_on_status_callback(callback: js_sys::Function) -> Result<(), JsValue> {
        WRAPPER.with(|cell| {
            if let Some(ref mut s) = *cell.borrow_mut() {
                s.on_status = Some(callback);
            }
        });
        Ok(())
    }

    fn set_status(status: &str) {
        WRAPPER.with(|cell| {
            if let Some(ref mut s) = *cell.borrow_mut() {
                s.status = status.to_string();
                if let Some(ref cb) = s.on_status {
                    let obj = js_sys::Object::new();
                    let _ = js_sys::Reflect::set(
                        &obj,
                        &JsValue::from_str("status"),
                        &JsValue::from_str(status),
                    );
                    let _ = cb.call1(&JsValue::NULL, &obj.into());
                }
            }
        });
    }

    fn get_connection_status() -> Result<String, JsValue> {
        WRAPPER.with(|cell| {
            cell.borrow()
                .as_ref()
                .map(|s| s.status.clone())
                .ok_or_else(|| JsValue::from_str("Not initialized"))
        })
    }

    fn connect() -> Result<(), JsValue> {
        let (relay_url, network) = WRAPPER.with(|cell| {
            let state = cell.borrow();
            let s = state
                .as_ref()
                .ok_or_else(|| JsValue::from_str("Call init() first"))?;
            Ok::<_, JsValue>((s.relay_url.clone(), s.network.clone()))
        })?;
        let multiaddr = url_to_multiaddr(&relay_url)?;
        let multiaddr_str = multiaddr.to_string();

        WrapperState::set_status("connecting");

        if let Some(ref on_status) = WRAPPER.with(|cell| {
            cell.borrow().as_ref().and_then(|s| s.on_status.clone())
        }) {
            let obj = js_sys::Object::new();
            let _ = js_sys::Reflect::set(
                &obj,
                &JsValue::from_str("status"),
                &JsValue::from_str("connecting"),
            );
            let _ = on_status.call1(&JsValue::NULL, &obj.into());
        }

        let on_offers = WRAPPER.with(|cell| {
            cell.borrow().as_ref().and_then(|s| s.on_offers.clone())
        });
        let on_status = WRAPPER.with(|cell| {
            cell.borrow().as_ref().and_then(|s| s.on_status.clone())
        });

        wasm_bindgen_futures::spawn_local(async move {
            let node = match SplashNode::new() {
                Ok(n) => n,
                Err(e) => {
                    WrapperState::set_status("error");
                    log(&format!("[Splash] Failed to create node: {:?}", e));
                    return;
                }
            };

            if let Some(ref cb) = on_offers {
                let cb = cb.clone();
                let offer_cb = Closure::wrap(Box::new(move |offer_js: JsValue| {
                    let arr = js_sys::Array::new();
                    arr.push(&offer_js);
                    let _ = cb.call1(&JsValue::NULL, &arr);
                }) as Box<dyn Fn(JsValue)>);
                let f = offer_cb
                    .as_ref()
                    .clone()
                    .dyn_into::<js_sys::Function>()
                    .unwrap();
                node.set_offer_callback(f);
                offer_cb.forget();
            }
            if let Some(ref cb) = on_status {
                let cb_connected = cb.clone();
                let peer_cb = Closure::wrap(Box::new(move || {
                    WrapperState::set_status("connected");
                    let obj = js_sys::Object::new();
                    let _ = js_sys::Reflect::set(
                        &obj,
                        &JsValue::from_str("status"),
                        &JsValue::from_str("connected"),
                    );
                    let _ = cb_connected.call1(&JsValue::NULL, &obj.into());
                }) as Box<dyn Fn()>);
                let f = peer_cb
                    .as_ref()
                    .clone()
                    .dyn_into::<js_sys::Function>()
                    .unwrap();
                node.set_peer_callback(f);
                peer_cb.forget();

                let cb_err = cb.clone();
                let err_cb = Closure::wrap(Box::new(move |msg: JsValue| {
                    WrapperState::set_status("error");
                    let obj = js_sys::Object::new();
                    let _ = js_sys::Reflect::set(
                        &obj,
                        &JsValue::from_str("status"),
                        &JsValue::from_str("error"),
                    );
                    let _ = js_sys::Reflect::set(&obj, &JsValue::from_str("message"), &msg);
                    let _ = cb_err.call1(&JsValue::NULL, &obj.into());
                }) as Box<dyn Fn(JsValue)>);
                let f_err = err_cb
                    .as_ref()
                    .clone()
                    .dyn_into::<js_sys::Function>()
                    .unwrap();
                node.set_error_callback(f_err);
                err_cb.forget();
            }

            let opts = StartOptions {
                bootstrap_peers: vec![],
                network: network.clone(),
            };
            if let Err(e) = node
                .start(serde_wasm_bindgen::to_value(&opts).unwrap())
                .await
            {
                WrapperState::set_status("error");
                log(&format!("[Splash] start error: {:?}", e));
                return;
            }

            // After start() the offer channel is live; store the sender in
            // WrapperState so the JS-facing broadcastOffer() can use it.
            if let Some(ref tx) = *node.offer_sender.borrow() {
                let tx_clone = tx.clone();
                WRAPPER.with(|cell| {
                    if let Some(ref mut s) = *cell.borrow_mut() {
                        s.offer_sender = Some(tx_clone);
                    }
                });
                log("[Splash] Offer sender stored in WrapperState for broadcasting");
            }

            if let Err(e) = node.connect_to_peer(multiaddr_str) {
                WrapperState::set_status("error");
                log(&format!("[Splash] connect_to_peer error: {:?}", e));
                return;
            }

            // If still connecting after 20s, report timeout so UI doesn't hang
            let on_status_timeout = on_status.clone();
            wasm_bindgen_futures::spawn_local(async move {
                TimeoutFuture::new(20_000).await;
                if let Ok(current) = WrapperState::get_connection_status() {
                    if current == "connecting" {
                        WrapperState::set_status("error");
                        log("[Splash] Connection timed out (20s)");
                        if let Some(ref cb) = on_status_timeout {
                            let obj = js_sys::Object::new();
                            let _ = js_sys::Reflect::set(
                                &obj,
                                &JsValue::from_str("status"),
                                &JsValue::from_str("error"),
                            );
                            let _ = js_sys::Reflect::set(
                                &obj,
                                &JsValue::from_str("message"),
                                &JsValue::from_str("Connection timed out. Check relay is running and reachable."),
                            );
                            let _ = cb.call1(&JsValue::NULL, &obj.into());
                        }
                    }
                }
            });
        });

        Ok(())
    }

    fn disconnect() -> Result<(), JsValue> {
        WRAPPER.with(|cell| {
            if let Some(ref mut s) = *cell.borrow_mut() {
                s.offer_sender = None;
            }
        });
        WrapperState::set_status("disconnected");
        Ok(())
    }

    fn broadcast(offer: String) -> Result<(), JsValue> {
        WRAPPER.with(|cell| {
            let state = cell.borrow();
            let s = state
                .as_ref()
                .ok_or_else(|| JsValue::from_str("Not initialized. Call init() first."))?;
            match &s.offer_sender {
                Some(tx) => {
                    tx.unbounded_send(offer)
                        .map_err(|e| JsValue::from_str(&format!("Broadcast failed: {}", e)))?;
                    Ok(())
                }
                None => Err(JsValue::from_str(
                    "Not connected. Call connect() and wait for 'connected' status.",
                )),
            }
        })
    }
}
