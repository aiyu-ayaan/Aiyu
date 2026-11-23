//! Streaming reverse proxy to the Next.js server for every route not yet ported to Rust.
//! Bodies stream both ways, so a 75 MB backup download never sits in Rust memory.

use axum::{
    body::Body,
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use futures_util::TryStreamExt;
use std::net::SocketAddr;

use crate::AppState;

#[derive(Clone)]
pub struct Upstream {
    base: String,
    client: reqwest::Client,
}

impl Upstream {
    pub fn new(base: &str) -> Self {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none()) // redirects belong to the browser
            .no_proxy()
            .build()
            .expect("reqwest client");
        Self { base: base.trim_end_matches('/').to_string(), client }
    }
}

// RFC 9110 hop-by-hop headers are connection-scoped and must not be forwarded.
const HOP_BY_HOP: [HeaderName; 7] = [
    header::CONNECTION,
    HeaderName::from_static("keep-alive"),
    header::PROXY_AUTHENTICATE,
    header::PROXY_AUTHORIZATION,
    header::TE,
    header::TRANSFER_ENCODING,
    header::UPGRADE,
];

fn strip_hop_by_hop(h: &mut HeaderMap) {
    for name in HOP_BY_HOP.iter() {
        h.remove(name);
    }
}

pub async fn forward(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    // Present when served with `into_make_service_with_connect_info` (absent in unit tests).
    let peer = parts.extensions.get::<ConnectInfo<SocketAddr>>().copied();
    let path_and_query = parts.uri.path_and_query().map(|p| p.as_str()).unwrap_or("/");
    let url = format!("{}{}", state.upstream.base, path_and_query);

    let mut headers = parts.headers;
    strip_hop_by_hop(&mut headers);
    // Next resolves the client IP from x-real-ip, then the last x-forwarded-for hop (src/lib/clientIp.js).
    if let Some(ConnectInfo(addr)) = peer {
        let ip = addr.ip().to_string();
        if !headers.contains_key("x-real-ip") {
            if let Ok(v) = HeaderValue::from_str(&ip) {
                headers.insert("x-real-ip", v);
            }
        }
        let xff = match headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
            Some(prev) => format!("{prev}, {ip}"),
            None => ip,
        };
        if let Ok(v) = HeaderValue::from_str(&xff) {
            headers.insert("x-forwarded-for", v);
        }
    }
    // Keep the browser's Host so Next builds public URLs and redirects for the real origin.
    if let Some(host) = headers.get(header::HOST).cloned() {
        headers.insert("x-forwarded-host", host);
    }

    let upstream_req = state
        .upstream
        .client
        .request(parts.method, &url)
        .headers(headers)
        .body(reqwest::Body::wrap_stream(body.into_data_stream()));

    let upstream_res = match upstream_req.send().await {
        Ok(r) => r,
        Err(err) => {
            tracing::warn!(%url, error = %err, "upstream request failed");
            return (StatusCode::BAD_GATEWAY, "upstream unavailable").into_response();
        }
    };

    let status = upstream_res.status();
    let mut res_headers = upstream_res.headers().clone();
    strip_hop_by_hop(&mut res_headers);
    let stream = upstream_res.bytes_stream().map_err(std::io::Error::other);

    let mut res = Response::new(Body::from_stream(stream));
    *res.status_mut() = status;
    *res.headers_mut() = res_headers;
    res
}
