//! Fetching addresses that came from a request: only public hosts, so the server cannot be used to reach
//! itself, the database or anything else on a private network.

use reqwest::dns::{Addrs, Name, Resolve, Resolving};
use std::{
    net::{IpAddr, Ipv4Addr, Ipv6Addr},
    sync::{Arc, LazyLock},
    time::Duration,
};

fn public_v4(ip: Ipv4Addr) -> bool {
    let [a, b, ..] = ip.octets();
    !(ip.is_private()
        || ip.is_loopback()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        || ip.is_multicast()
        || a == 0
        || (a == 100 && (64..128).contains(&b))
        || (a == 198 && (b == 18 || b == 19))
        || a >= 240)
}

fn public_v6(ip: Ipv6Addr) -> bool {
    if let Some(v4) = ip.to_ipv4_mapped() {
        return public_v4(v4);
    }
    let first = ip.segments()[0];
    // Only global unicast (2000::/3), without 6to4, which can wrap a private IPv4 address.
    (first & 0xe000) == 0x2000 && first != 0x2002
}

pub fn is_public(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => public_v4(ip),
        IpAddr::V6(ip) => public_v6(ip),
    }
}

/// Resolves names to their public addresses only; checked at connect time, so a name cannot move afterwards.
struct PublicOnly;

impl Resolve for PublicOnly {
    fn resolve(&self, name: Name) -> Resolving {
        Box::pin(async move {
            let found: Vec<_> = tokio::net::lookup_host((name.as_str(), 0)).await?.filter(|a| is_public(a.ip())).collect();
            if found.is_empty() {
                return Err("address is not public".into());
            }
            Ok(Box::new(found.into_iter()) as Addrs)
        })
    }
}

/// A literal IP in a URL skips name resolution, so it is checked here (first URL and every redirect).
pub fn allowed(url: &reqwest::Url) -> bool {
    matches!(url.scheme(), "http" | "https")
        && match url.host() {
            Some(url::Host::Ipv4(ip)) => is_public(ip.into()),
            Some(url::Host::Ipv6(ip)) => is_public(ip.into()),
            Some(url::Host::Domain(_)) => true,
            None => false,
        }
}

/// The client for user-supplied URLs. No proxy: a proxy would resolve the names itself.
pub static PUBLIC_HTTP: LazyLock<reqwest::Client> = LazyLock::new(|| {
    let redirects = reqwest::redirect::Policy::custom(|attempt| {
        if attempt.previous().len() >= 5 || !allowed(attempt.url()) { attempt.error("redirect refused") } else { attempt.follow() }
    });
    reqwest::Client::builder()
        .dns_resolver(Arc::new(PublicOnly))
        .redirect(redirects)
        .no_proxy()
        .timeout(Duration::from_secs(10))
        .build()
        .expect("static client settings")
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_and_special_addresses_are_refused() {
        for ip in ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "::", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2002:7f00:1::"] {
            assert!(!is_public(ip.parse().unwrap()), "{ip}");
        }
        for ip in ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"] {
            assert!(is_public(ip.parse().unwrap()), "{ip}");
        }
        assert!(!allowed(&"http://[::1]/".parse().unwrap()) && !allowed(&"http://2130706433/".parse().unwrap()));
        assert!(!allowed(&"file:///etc/passwd".parse().unwrap()) && allowed(&"https://example.org/".parse().unwrap()));
    }

    #[tokio::test]
    async fn names_that_point_inwards_do_not_connect() {
        assert!(PUBLIC_HTTP.get("http://localhost:1/").send().await.is_err_and(|e| format!("{e:?}").contains("not public")));
    }
}
