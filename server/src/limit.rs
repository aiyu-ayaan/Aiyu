//! In-memory rate limits (`checkRateLimit` in src/middleware/auth.js) and the client IP they key on
//! (`getClientIP` in src/lib/clientIp.js, but headers only count when the peer is a trusted proxy).

use axum::{
    Json,
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, Method, StatusCode, request::Parts},
    middleware::Next,
    response::{IntoResponse, Response},
};
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

/// A header as Node reads it (latin1), or "".
pub fn header_str(headers: &HeaderMap, name: &str) -> String {
    headers.get(name).map(|v| v.as_bytes().iter().map(|&b| b as char).collect()).unwrap_or_default()
}

// ── the API rate limit of src/proxy.js ─────────────────────────────────────────────────────────────────
// Next applies it in front of every /api route, so a route served here must apply it too.

/// (rule prefix, max requests, window) for a request, or None when the proxy does not limit it.
fn api_rule(method: &Method, path: &str) -> Option<(&'static str, u32, Duration)> {
    const MIN: u64 = 60;
    let rules: [(&str, Method, u32, u64); 6] = [
        ("/api/auth/login", Method::POST, 5, 5 * MIN),
        ("/api/auth/github", Method::GET, 10, 5 * MIN),
        ("/api/contact/message", Method::POST, 15, 5 * MIN),
        ("/api/upload", Method::POST, 60, MIN),
        ("/api/global-search", Method::GET, 60, MIN),
        ("/api/codemode", Method::POST, 30, MIN),
    ];
    if path == "/api/health" || method == Method::OPTIONS {
        return None;
    }
    let under = |prefix: &str| path.strip_prefix(prefix).is_some_and(|rest| rest.is_empty() || rest.starts_with('/'));
    if let Some((prefix, _, max, secs)) = rules.into_iter().find(|(prefix, m, ..)| m == method && under(prefix)) {
        return Some((prefix, max, Duration::from_secs(secs)));
    }
    let mutating = [Method::POST, Method::PUT, Method::PATCH, Method::DELETE].contains(method);
    mutating.then(|| ("default", 120, Duration::from_secs(MIN)))
}

static WINDOWS: LazyLock<Mutex<HashMap<String, (u32, Instant)>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

/// Fixed window. Err holds the time left until the window resets.
fn fixed_window(key: String, max: u32, window: Duration) -> Result<(), Duration> {
    let now = Instant::now();
    let mut map = WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
    if map.len() >= 5000 {
        map.retain(|_, (_, reset)| now < *reset);
    }
    let entry = map.entry(key).or_insert((0, now + window));
    if now >= entry.1 {
        *entry = (0, now + window);
    }
    if entry.0 >= max {
        return Err(entry.1 - now);
    }
    entry.0 += 1;
    Ok(())
}

/// Route middleware for ported `/api` handlers.
pub async fn api(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let Some((prefix, max, window)) = api_rule(req.method(), req.uri().path()) else { return next.run(req).await };
    let (parts, body) = req.into_parts();
    let key = format!("{prefix}:{}", client_ip(&state, &parts));
    let Err(left) = fixed_window(key, max, window) else { return next.run(Request::from_parts(parts, body)).await };
    let retry = left.as_millis().div_ceil(1000).max(1);
    let reset = (chrono::Utc::now().timestamp_millis() as u128 + left.as_millis()).div_ceil(1000);
    (
        StatusCode::TOO_MANY_REQUESTS,
        [
            ("retry-after", retry.to_string()),
            ("x-ratelimit-limit", max.to_string()),
            ("x-ratelimit-remaining", "0".to_string()),
            ("x-ratelimit-reset", reset.to_string()),
        ],
        Json(serde_json::json!({ "success": false, "error": "Too many requests. Please try again later." })),
    )
        .into_response()
}

// ── per-route traffic control (src/lib/trafficControl.js) ──────────────────────────────────────────────

#[derive(Default)]
struct Bucket {
    requests: HashMap<String, VecDeque<Instant>>,
    active: usize,
}

static BUCKETS: LazyLock<Mutex<HashMap<&'static str, Bucket>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
const MAX_TRACKED_CLIENTS: usize = 5000;

pub struct Reservation {
    pub ok: bool,
    pub status: u16,
    pub retry_after: Duration,
    pub remaining: usize,
    pub active: usize,
}

/// Releases the concurrency slot when the request ends, whatever path it takes.
pub struct Slot(&'static str);

impl Drop for Slot {
    fn drop(&mut self) {
        if let Some(b) = BUCKETS.lock().unwrap_or_else(|e| e.into_inner()).get_mut(self.0) {
            b.active = b.active.saturating_sub(1);
        }
    }
}

/// `reserveRequestSlot(name, client, { maxRequests, windowMs, maxConcurrent })`.
pub fn reserve(name: &'static str, client: &str, max_requests: usize, window: Duration, max_concurrent: usize) -> (Reservation, Option<Slot>) {
    let now = Instant::now();
    let mut buckets = BUCKETS.lock().unwrap_or_else(|e| e.into_inner());
    let t = buckets.entry(name).or_default();
    t.requests.retain(|_, hits| {
        while hits.front().is_some_and(|h| now.duration_since(*h) >= window) {
            hits.pop_front();
        }
        !hits.is_empty()
    });
    if t.requests.len() > MAX_TRACKED_CLIENTS {
        let excess: Vec<String> = t.requests.keys().take(t.requests.len() - MAX_TRACKED_CLIENTS).cloned().collect();
        for k in excess {
            t.requests.remove(&k);
        }
    }
    let active = t.active;
    let hits = t.requests.get(client).map_or(0, VecDeque::len);
    let retry_after = t.requests.get(client).and_then(|h| h.front()).map_or(window, |first| window.saturating_sub(now.duration_since(*first)));
    if active >= max_concurrent {
        let remaining = max_requests.saturating_sub(hits);
        return (Reservation { ok: false, status: 503, retry_after: Duration::from_secs(1), remaining, active }, None);
    }
    if hits >= max_requests {
        return (Reservation { ok: false, status: 429, retry_after, remaining: 0, active }, None);
    }
    t.requests.entry(client.to_string()).or_default().push_back(now);
    t.active += 1;
    let r = Reservation { ok: true, status: 200, retry_after: Duration::ZERO, remaining: max_requests.saturating_sub(hits + 1), active: t.active };
    (r, Some(Slot(name)))
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

    #[test]
    fn api_rules_match_the_next_proxy() {
        let max = |m: Method, p: &str| api_rule(&m, p).map(|(prefix, max, _)| (prefix, max));
        assert_eq!(max(Method::POST, "/api/auth/login"), Some(("/api/auth/login", 5)));
        assert_eq!(max(Method::GET, "/api/global-search"), Some(("/api/global-search", 60)));
        assert_eq!(max(Method::POST, "/api/auth/logout"), Some(("default", 120)));
        assert_eq!(max(Method::GET, "/api/auth/logout"), None);
        assert_eq!(max(Method::POST, "/api/uploads"), Some(("default", 120)));
        assert_eq!(max(Method::POST, "/api/health"), None);
    }

    #[test]
    fn fixed_window_blocks_until_reset() {
        let window = Duration::from_millis(40);
        assert!(fixed_window("test:fixed".into(), 1, window).is_ok());
        assert!(fixed_window("test:fixed".into(), 1, window).is_err());
        std::thread::sleep(window);
        assert!(fixed_window("test:fixed".into(), 1, window).is_ok());
    }

    #[test]
    fn slot_is_released_on_drop() {
        let take = || reserve("test:slots", "a", 10, Duration::from_secs(60), 1);
        let (first, slot) = take();
        assert!(first.ok);
        assert_eq!(take().0.status, 503);
        drop(slot);
        assert!(take().0.ok);
    }
}
