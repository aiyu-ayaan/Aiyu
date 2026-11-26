//! `GET /api/og-preview?url=`: the Open Graph title, description and image of a linked page.

use axum::{
    extract::{RawQuery, State},
    http::StatusCode,
    response::Response,
};
use regex::Regex;
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::{
    AppState,
    api::{PUBLIC_LONG, PUBLIC_SHORT, error, json_status, public_json, query_map},
    net,
};

/// CACHE_TTL.LONG
const TTL: Duration = Duration::from_secs(5 * 60);
/// Titles and meta tags sit in the head; a larger page is cut here.
const MAX_PAGE: usize = 1024 * 1024;
const BROWSER: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

static CACHE: LazyLock<Mutex<HashMap<String, (Value, Instant)>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

fn captured(html: &str, pattern: &str) -> Option<String> {
    Regex::new(pattern).ok()?.captures(html)?.get(1).map(|m| m.as_str().to_string())
}

fn preview(html: &str, url: &str) -> Value {
    let meta = |kind: &str, name: &str| captured(html, &format!(r#"(?i)<meta {kind}="{name}" content="([^"]*)""#)).filter(|v| !v.is_empty());
    let title = meta("property", "og:title").or_else(|| captured(html, r"(?i)<title>([^<]*)</title>"));
    let description = meta("property", "og:description").or_else(|| meta("name", "description"));
    json!({
        "title": title.unwrap_or_default(),
        "description": description.unwrap_or_default(),
        "image": meta("property", "og:image").unwrap_or_default(),
        "siteName": meta("property", "og:site_name").unwrap_or_default(),
        "url": url,
    })
}

/// The page's preview, or the status to answer with when it cannot be fetched.
async fn fetch(url: &reqwest::Url) -> Result<Result<Value, StatusCode>, reqwest::Error> {
    let mut response = net::PUBLIC_HTTP.get(url.clone()).header("user-agent", BROWSER).send().await?;
    if !response.status().is_success() {
        return Ok(Err(response.status()));
    }
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await? {
        body.extend_from_slice(&chunk);
        if body.len() >= MAX_PAGE {
            break;
        }
    }
    Ok(Ok(preview(&String::from_utf8_lossy(&body), url.as_str())))
}

pub async fn og_preview(State(_state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let Some(raw) = query_map(&q).remove("url").filter(|u| !u.is_empty()) else { return error(StatusCode::BAD_REQUEST, "URL is required") };
    if !(raw.starts_with("http://") || raw.starts_with("https://")) {
        return error(StatusCode::BAD_REQUEST, "Invalid URL protocol");
    }
    let address = raw.trim().to_string();
    let key = format!("og:{address}");
    let cached = CACHE.lock().unwrap_or_else(|e| e.into_inner()).get(&address).filter(|(_, until)| *until > Instant::now()).map(|(v, _)| v.clone());
    let found = match cached {
        Some(value) => Ok(Ok(value)),
        None => match reqwest::Url::parse(&address).ok().filter(net::allowed) {
            Some(url) => fetch(&url).await.map(|r| {
                r.map(|mut value| {
                    // The reply names the address as it was asked for.
                    value["url"] = address.clone().into();
                    let mut cache = CACHE.lock().unwrap_or_else(|e| e.into_inner());
                    if cache.len() >= 200 {
                        cache.clear();
                    }
                    cache.insert(address.clone(), (value.clone(), Instant::now() + TTL));
                    value
                })
            }),
            None => return error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to parse URL"),
        },
    };
    match found {
        Ok(Ok(value)) => {
            let mut res = public_json(value, PUBLIC_LONG, "og");
            if let Ok(v) = key.parse() {
                res.headers_mut().insert("x-app-cache-key", v);
            }
            res
        }
        Ok(Err(status)) => {
            let mut res = json_status(status, json!({ "error": "Failed to fetch URL" }));
            for name in ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] {
                res.headers_mut().insert(name, axum::http::HeaderValue::from_static(PUBLIC_SHORT));
            }
            res
        }
        Err(err) => {
            tracing::warn!(error = %err, "og preview failed");
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to parse URL")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_meta_tags_with_fallbacks() {
        let html = r#"<TITLE>Plain</TITLE><meta name="description" content="d"><META property="og:image" content="/i.png">"#;
        assert_eq!(preview(html, "u"), json!({ "title": "Plain", "description": "d", "image": "/i.png", "siteName": "", "url": "u" }));
        assert_eq!(preview(r#"<meta property="og:title" content="OG"><title>t</title>"#, "u")["title"], "OG");
    }
}
