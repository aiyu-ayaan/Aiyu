//! In-memory rate limits (`checkRateLimit` in src/middleware/auth.js) and the client IP they key on
//! (`getClientIP` in src/lib/clientIp.js, but headers only count when the peer is a trusted proxy).

use axum::{extract::ConnectInfo, http::request::Parts};
use std::{
    collections::{HashMap, VecDeque},
    net::SocketAddr,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::AppState;

static HITS: LazyLock<Mutex<HashMap<String, VecDeque<Instant>>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

/// Sliding window: true when `key` has made fewer than `max` requests in `window` (and records this one).
pub fn check(key: &str, max: usize, window: Duration) -> bool {
    let now = Instant::now();
    let mut map = HITS.lock().unwrap_or_else(|e| e.into_inner());
    let hits = map.entry(key.to_string()).or_default();
    while hits.front().is_some_and(|t| now.duration_since(*t) >= window) {
        hits.pop_front();
    }
    if hits.len() >= max {
        return false;
    }
    hits.push_back(now);
    if map.len() > 1000 {
        map.retain(|_, h| h.back().is_some_and(|t| now.duration_since(*t) < window));
    }
    true
}

/// The client's IP: the socket peer, or the proxy headers when the peer is a trusted proxy.
pub fn client_ip(state: &AppState, parts: &Parts) -> String {
    let peer = parts.extensions.get::<ConnectInfo<SocketAddr>>().map(|c| c.0.ip());
    let trusted = peer.is_some_and(|ip| state.config.trusted_proxies.iter().any(|n| n.contains(&ip)));
    if trusted {
        let h = |name: &str| parts.headers.get(name).and_then(|v| v.to_str().ok()).map(str::trim).filter(|v| !v.is_empty());
        if let Some(v) = h("cf-connecting-ip").or_else(|| h("x-real-ip")) {
            return v.to_string();
        }
        if let Some(last) = h("x-forwarded-for").and_then(|v| v.split(',').map(str::trim).filter(|s| !s.is_empty()).last()) {
            return last.to_string();
        }
        if let Some(v) = h("x-client-ip") {
            return v.to_string();
        }
    }
    peer.map(|ip| ip.to_string()).unwrap_or_else(|| "unknown".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn window_allows_max_then_blocks() {
        let key = "test:window";
        for _ in 0..3 {
            assert!(check(key, 3, Duration::from_secs(60)));
        }
        assert!(!check(key, 3, Duration::from_secs(60)));
        assert!(check("test:other", 3, Duration::from_secs(60)));
    }
}
