//! `POST /api/analytics/track`: port of the route and of `recordEvent` (src/lib/analytics.js, src/lib/geoip.js).
//! Always 204, also when recording fails, so tracking never disturbs a visitor.

use axum::{
    body::Bytes,
    extract::{ConnectInfo, State},
    http::{StatusCode, header, request::Parts},
    response::{IntoResponse, Response},
};
use chrono::Utc;
use regex::Regex;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::{AppState, api::truthy, db::new_id, limit, limit::header_str, session::session_cookie, site_api::js_string};

const EVENT_TYPES: [&str; 4] = ["pageview", "entity_view", "contact_submit", "outbound_click"];
const ENTITY_TYPES: [&str; 4] = ["blog", "project", "app", "gallery"];
/// What Next sees as its own host: `request.url` carries the server's address, not the public one.
const SELF_HOST: &str = "localhost";

fn re(pattern: &str) -> Regex {
    Regex::new(&format!("(?i){pattern}")).expect("analytics regex")
}

static BOT: LazyLock<Regex> = LazyLock::new(|| re("bot|crawl|spider|slurp|bing|duckduck|baidu|yandex|sogou|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|preview|fetch|monitor|lighthouse|headless|python-requests|curl|wget|axios|node-fetch|postman"));
static TABLET: LazyLock<Regex> = LazyLock::new(|| re("ipad|tablet|playbook|silk"));
static MOBILE: LazyLock<Regex> = LazyLock::new(|| re("mobi|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini"));
static SEARCH: LazyLock<Regex> = LazyLock::new(|| re(r"(^|\.)(google|bing|yahoo|duckduckgo|baidu|yandex|ecosia|brave|startpage|qwant)\."));
static SOCIAL: LazyLock<Regex> = LazyLock::new(|| re(r"(^|\.)(facebook|fb|instagram|t\.co|twitter|x\.com|linkedin|reddit|youtube|pinterest|tiktok|threads|mastodon|bsky|bluesky|whatsapp|telegram|t\.me|news\.ycombinator|medium|dev\.to)\b"));

fn device(ua: &str) -> &'static str {
    // `android(?!.*mobile)`: no lookahead in the regex crate, and the last "android" decides it.
    let lower = ua.to_ascii_lowercase();
    let android_tablet = lower.rfind("android").is_some_and(|i| !lower[i + "android".len()..].contains("mobile"));
    match () {
        _ if ua.is_empty() => "desktop",
        _ if BOT.is_match(ua) => "bot",
        _ if TABLET.is_match(ua) || android_tablet => "tablet",
        _ if MOBILE.is_match(ua) => "mobile",
        _ => "desktop",
    }
}

/// The referrer reduced to a bare host: no scheme, path or query.
fn referrer_host(referrer: &Value) -> String {
    if !truthy(referrer) {
        return String::new();
    }
    let Ok(url) = url::Url::parse(&js_string(referrer)) else { return String::new() };
    let host = url.host_str().unwrap_or("").to_lowercase();
    host.strip_prefix("www.").unwrap_or(&host).to_string()
}

fn referrer_type(host: &str) -> &'static str {
    match () {
        _ if host.is_empty() => "direct",
        _ if host == SELF_HOST => "internal",
        _ if SEARCH.is_match(host) => "search",
        _ if SOCIAL.is_match(host) => "social",
        _ => "external",
    }
}

/// `String(value).slice(0, max)`, counting UTF-16 units as JavaScript does.
fn clean(value: &Value, max: usize) -> String {
    if value.is_null() {
        return String::new();
    }
    String::from_utf16_lossy(&js_string(value).encode_utf16().take(max).collect::<Vec<_>>())
}

fn visitor_hash(salt: &str, ip: &str, ua: &str, day: &str) -> String {
    hex::encode(&Sha256::digest(format!("{salt}|{ip}|{ua}|{day}").as_bytes())[..16])
}

static SALT: LazyLock<String> = LazyLock::new(|| {
    ["ANALYTICS_SALT", "AUTH_SECRET"].iter().find_map(|k| std::env::var(k).ok().filter(|v| !v.is_empty())).unwrap_or_else(|| "aiyu-analytics".into())
});

/// `getClientIdentifier` as Next computed it behind this server: the first `x-forwarded-for` entry when a
/// trusted proxy sent one, else the socket peer. Not `limit::client_ip`: a different choice would change every
/// visitor hash and count returning visitors twice.
fn client_identifier(state: &AppState, parts: &Parts) -> String {
    let Some(peer) = parts.extensions.get::<ConnectInfo<SocketAddr>>().map(|c| c.0.ip()) else { return "global".into() };
    if state.config.trusted_proxies.iter().any(|n| n.contains(&peer)) {
        let forwarded = header_str(&parts.headers, "x-forwarded-for");
        let first = forwarded.split(',').next().unwrap_or("").trim();
        if !first.is_empty() {
            return first.to_string();
        }
    }
    peer.to_string()
}

// ── country from the IP, when no edge header carries it ────────────────────────────────────────────────

static COUNTRIES: LazyLock<Mutex<HashMap<IpAddr, (String, Instant)>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
const COUNTRY_TTL: Duration = Duration::from_secs(6 * 60 * 60);

fn is_private(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => v4.is_private() || v4 == std::net::Ipv4Addr::LOCALHOST,
        IpAddr::V6(v6) => v6.is_loopback() || v6.to_ipv4_mapped().is_some_and(|v4| v4.is_loopback()),
    }
}

/// ISO-3166 alpha-2 code, or "" when unknown. Only the code is ever stored.
async fn country_of(client: &reqwest::Client, ip: &str) -> String {
    let Ok(ip) = ip.parse::<IpAddr>() else { return String::new() };
    if is_private(ip) {
        return String::new();
    }
    if let Some((code, at)) = COUNTRIES.lock().unwrap_or_else(|e| e.into_inner()).get(&ip)
        && at.elapsed() < COUNTRY_TTL
    {
        return code.clone();
    }
    let lookup = async {
        let res = client.get(format!("https://ipapi.co/{ip}/json/")).header(header::USER_AGENT, "Aiyu-Admin-GeoIP")
            .timeout(Duration::from_secs(3)).send().await.ok()?.error_for_status().ok()?;
        let data: Value = serde_json::from_slice(&res.bytes().await.ok()?).ok()?;
        if truthy(&data["error"]) {
            return None;
        }
        let code = [&data["country_code"], &data["country"]].into_iter().find(|v| truthy(v)).map(js_string)?;
        Some(code.trim().to_uppercase())
    };
    let code = lookup.await.filter(|c| c.len() == 2 && c.bytes().all(|b| b.is_ascii_uppercase())).unwrap_or_default();
    let mut map = COUNTRIES.lock().unwrap_or_else(|e| e.into_inner());
    if map.len() >= 5000 {
        map.clear();
    }
    map.insert(ip, (code.clone(), Instant::now()));
    code
}

// ── recording ──────────────────────────────────────────────────────────────────────────────────────────

async fn record(state: &AppState, parts: &Parts, client: &str, payload: &Value) -> anyhow::Result<()> {
    let ua = header_str(&parts.headers, "user-agent");
    let pick = |v: &Value, allowed: &[&'static str]| v.as_str().and_then(|s| allowed.iter().find(|a| **a == s).copied());
    let kind = pick(&payload["type"], &EVENT_TYPES).unwrap_or("pageview");
    let entity_type = pick(&payload["entityType"], &ENTITY_TYPES);
    let entity = |key: &str, max| entity_type.map(|_| clean(&payload[key], max)).filter(|s| !s.is_empty());
    let (entity_id, entity_slug) = (entity("entityId", 128), entity("entitySlug", 256));
    let path = if truthy(&payload["path"]) { clean(&payload["path"], 1024) } else { "/".into() };
    let referrer = referrer_host(&payload["referrer"]);
    let meta = &payload["meta"];
    let meta = if meta.is_object() || meta.is_array() { meta.clone() } else { json!({}) };
    let now = Utc::now().naive_utc();
    let day = now.format("%Y-%m-%d").to_string();
    let hash = visitor_hash(&SALT, client, &ua, &day);

    let edge = ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country"].iter().map(|h| header_str(&parts.headers, h)).find(|v| !v.is_empty());
    let country = match edge {
        Some(c) => Some(clean(&Value::String(c), 8).to_uppercase()),
        None => Some(country_of(&state.http, client).await).filter(|c| !c.is_empty()),
    };

    // A visitor is unique for this day and type when no earlier event shares the hash.
    let seen: bool = sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "AnalyticsEvent" WHERE "visitorHash" = $1 AND type = $2 AND "createdAt" >= $3)"#)
        .bind(&hash)
        .bind(kind)
        .bind(now.date().and_time(chrono::NaiveTime::MIN))
        .fetch_one(&state.db)
        .await?;

    sqlx::query(
        r#"INSERT INTO "AnalyticsEvent" (id, type, path, "entityType", "entityId", "entitySlug", referrer, "referrerType",
            device, country, "visitorHash", "sessionId", "isBot", meta, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15)"#,
    )
    .bind(new_id())
    .bind(kind)
    .bind(path)
    .bind(entity_type)
    .bind(&entity_id)
    .bind(entity_slug)
    .bind(&referrer)
    .bind(referrer_type(&referrer))
    .bind(device(&ua))
    .bind(country)
    .bind(hash)
    .bind(clean(&payload["sessionId"], 64))
    .bind(BOT.is_match(&ua))
    .bind(meta.to_string())
    .bind(now)
    .execute(&state.db)
    .await?;

    // Daily rollup: the site-wide bucket of the type, plus the entity's own.
    let mut buckets = vec![("", "")];
    if let (Some(t), Some(id)) = (entity_type, &entity_id) {
        buckets.push((t, id));
    }
    for (entity_type, entity_id) in buckets {
        sqlx::query(
            r#"INSERT INTO "AnalyticsDaily" AS d (id, day, type, "entityType", "entityId", views, uniques, "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $7)
               ON CONFLICT (day, type, "entityType", "entityId")
               DO UPDATE SET views = d.views + 1, uniques = d.uniques + $6, "updatedAt" = $7"#,
        )
        .bind(new_id())
        .bind(&day)
        .bind(kind)
        .bind(entity_type)
        .bind(entity_id)
        .bind(i32::from(!seen))
        .bind(now)
        .execute(&state.db)
        .await?;
    }
    Ok(())
}

pub async fn track(State(state): State<AppState>, parts: Parts, body: Bytes) -> Response {
    // The admin's own browsing is not recorded. The signature is enough here: no database lookup per beacon.
    let admin = header_str(&parts.headers, "cookie");
    if session_cookie(&admin).and_then(|t| state.sessions.verify(t)).is_some() {
        return StatusCode::NO_CONTENT.into_response();
    }

    static LIMITS: LazyLock<(usize, Duration, usize)> = LazyLock::new(|| {
        let env = |name: &str, default: u64| std::env::var(name).ok().and_then(|v| v.trim().parse().ok()).unwrap_or(default);
        (env("ANALYTICS_RATE_LIMIT", 120) as usize, Duration::from_millis(env("PUBLIC_ROUTE_WINDOW_MS", 60_000)), env("PUBLIC_ROUTE_MAX_CONCURRENT", 80) as usize)
    });
    let client = client_identifier(&state, &parts);
    let (reservation, _slot) = limit::reserve("analytics-track", &client, LIMITS.0, LIMITS.1, LIMITS.2);
    if !reservation.ok {
        return StatusCode::from_u16(reservation.status).unwrap_or(StatusCode::SERVICE_UNAVAILABLE).into_response();
    }

    // Unreadable JSON counts as an empty event; other JSON values than objects and arrays record nothing.
    let payload = serde_json::from_slice::<Value>(&body).unwrap_or_else(|_| json!({}));
    if (payload.is_object() || payload.is_array())
        && let Err(err) = record(&state, &parts, &client, &payload).await
    {
        tracing::error!(error = %err, "analytics event not recorded");
    }
    StatusCode::NO_CONTENT.into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn devices_match_node() {
        assert_eq!(device(""), "desktop");
        assert_eq!(device("Mozilla/5.0 (X11; Linux x86_64) Chrome/140"), "desktop");
        assert_eq!(device("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari"), "mobile");
        assert_eq!(device("Mozilla/5.0 (Linux; Android 14; SM-X700) Safari"), "tablet");
        assert_eq!(device("Mozilla/5.0 (iPad; CPU OS 17_0) Mobile/15E148"), "tablet");
        assert_eq!(device("Googlebot/2.1 (Android; Mobile)"), "bot");
    }

    #[test]
    fn referrers_are_reduced_to_a_host_and_bucketed() {
        let host = |s: &str| referrer_host(&Value::String(s.into()));
        assert_eq!(host("https://WWW.Google.com/search?q=secret"), "google.com");
        assert_eq!(host("not a url"), "");
        assert_eq!(referrer_type(""), "direct");
        assert_eq!(referrer_type("localhost"), "internal");
        assert_eq!(referrer_type("google.co.in"), "search");
        assert_eq!(referrer_type("t.co"), "social");
        assert_eq!(referrer_type("example.com"), "external");
    }

    #[test]
    fn hash_and_truncation_match_node() {
        // node: createHash('sha256').update('aiyu-analytics|1.2.3.4|ua|2026-01-01').digest('hex').slice(0, 32)
        assert_eq!(visitor_hash("aiyu-analytics", "1.2.3.4", "ua", "2026-01-01"), "14b70bf9f30d0539a479d1c8e1426565");
        assert_eq!(clean(&json!("a😀b"), 2), "a\u{fffd}");
        assert_eq!(clean(&Value::Null, 8), "");
        assert_eq!(clean(&json!(12), 8), "12");
    }

    #[test]
    fn private_addresses_are_not_looked_up() {
        for ip in ["127.0.0.1", "::1", "10.0.0.1", "172.20.1.1", "192.168.1.1", "::ffff:127.0.0.1"] {
            assert!(is_private(ip.parse().unwrap()), "{ip}");
        }
        assert!(!is_private("8.8.8.8".parse().unwrap()));
    }
}
