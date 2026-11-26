//! `src/lib/geoip.js`: where an IP address is, asked of ipapi.co when the admin looks, and remembered for 6 hours.

use serde_json::{Value, json};
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::api::truthy;

const TTL: Duration = Duration::from_secs(6 * 60 * 60);

static CACHE: LazyLock<Mutex<HashMap<String, (Value, Instant)>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

/// `isPrivateOrLocal`
fn private_or_local(ip: &str) -> bool {
    if ip.is_empty() || ip == "unknown" || ip == "::1" || ip == "127.0.0.1" || ip.starts_with("::ffff:127.") {
        return true;
    }
    if ip.starts_with("10.") || ip.starts_with("192.168.") {
        return true;
    }
    ip.strip_prefix("172.")
        .and_then(|rest| rest.split_once('.'))
        .and_then(|(second, _)| second.parse::<u8>().ok())
        .is_some_and(|second| (16..=31).contains(&second))
}

fn place(ip: &str, city: &str, country: &str, code: &str, label: &str, local: bool) -> Value {
    json!({ "ip": ip, "city": city, "country": country, "countryCode": code, "label": label, "local": local })
}

pub async fn lookup(http: &reqwest::Client, ip: &str) -> Value {
    let ip = ip.trim();
    if private_or_local(ip) {
        return place(ip, "", "", "", "Local / private", true);
    }
    if let Some((value, until)) = CACHE.lock().unwrap_or_else(|e| e.into_inner()).get(ip) {
        if *until > Instant::now() {
            return value.clone();
        }
    }
    let mut value = place(ip, "", "", "", "Unknown", false);
    // Anything that is not an address cannot be looked up, and must not shape the URL.
    if ip.parse::<IpAddr>().is_ok() {
        let sent = http
            .get(format!("https://ipapi.co/{ip}/json/"))
            .header("user-agent", "Aiyu-Admin-GeoIP")
            .timeout(Duration::from_secs(3))
            .send()
            .await
            .and_then(|r| r.error_for_status());
        // A network error or timeout leaves the "Unknown" placeholder.
        let body = match sent {
            Ok(response) => response.bytes().await.ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok()),
            Err(_) => None,
        };
        if let Some(data) = body.filter(|d| !truthy(&d["error"])) {
            let text = |keys: [&str; 2]| keys.iter().find_map(|k| data[*k].as_str().filter(|v| !v.is_empty())).unwrap_or("");
            let (city, country) = (text(["city", "city"]), text(["country_name", "country"]));
            let code = text(["country_code", "country"]).trim().to_uppercase();
            let label = [city, country].iter().filter(|s| !s.is_empty()).copied().collect::<Vec<_>>().join(", ");
            let label = if label.is_empty() { "Unknown" } else { &label };
            value = place(ip, city, country, &code, label, false);
        }
    }
    let mut cache = CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if cache.len() >= 1000 {
        cache.retain(|_, (_, until)| *until > Instant::now());
    }
    cache.insert(ip.to_string(), (value.clone(), Instant::now() + TTL));
    value
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_addresses_are_not_looked_up() {
        for ip in ["", "unknown", "::1", "127.0.0.1", "10.1.2.3", "192.168.0.9", "172.16.0.1", "172.31.255.1"] {
            assert!(private_or_local(ip), "{ip}");
        }
        for ip in ["8.8.8.8", "172.32.0.1", "172.15.0.1", "2001:db8::1"] {
            assert!(!private_or_local(ip), "{ip}");
        }
    }
}
