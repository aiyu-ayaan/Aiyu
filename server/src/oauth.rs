//! GitHub sign-in for the single admin (src/app/api/auth/github and src/lib/githubOAuth.js). Anyone can complete
//! GitHub's side; only the numeric id in `GITHUB_ALLOWED_ID` gets a session.

use axum::{
    extract::{RawQuery, Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{TimeDelta, Utc};
use serde_json::{Value, json};
use std::time::Duration;

use crate::{
    AppState,
    api::{error, query_map, truthy},
    auth,
    limit::{self, header_str},
    site_api::js_string,
    web::site_url,
};

const STATE_COOKIE: &str = "gh_oauth_state";
const COOKIE_PATH: &str = "/api/auth/github";

fn env(name: &str) -> String {
    std::env::var(name).unwrap_or_default()
}

fn enabled() -> bool {
    env("GITHUB_AUTH_ENABLED") == "true"
}

fn configured() -> bool {
    ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_ALLOWED_ID"].iter().all(|n| !env(n).is_empty())
}

/// The registered callback address, from settings only (never from the request).
fn callback_url(explicit: &str, base: &str) -> Option<String> {
    let url = if explicit.trim().is_empty() {
        reqwest::Url::parse(base.trim_end_matches('/')).ok()?.join("/api/auth/github/callback").ok()?
    } else {
        reqwest::Url::parse(explicit.trim()).ok()?
    };
    matches!(url.scheme(), "http" | "https").then(|| url.to_string())
}

fn configured_callback() -> Option<String> {
    let base = [env("SITE_URL"), env("NEXT_PUBLIC_BASE_URL")].into_iter().find(|v| !v.is_empty()).unwrap_or_default();
    callback_url(&env("GITHUB_OAUTH_CALLBACK_URL"), &base)
}

/// `isAllowedGithubId`: refuses unless both are the same positive whole number.
fn allowed(candidate: &Value, configured: &str) -> bool {
    let number = |s: &str| s.trim().parse::<f64>().ok().filter(|n| n.fract() == 0.0 && *n > 0.0);
    number(configured).is_some_and(|want| number(&js_string(candidate)) == Some(want))
}

/// `getPublicOrigin`: the origin the browser used. A bare internal name (a proxy upstream) falls back to the site.
fn public_origin(headers: &HeaderMap, site: &str) -> String {
    let first = |name: &str| header_str(headers, name).split(',').next().unwrap_or("").trim().to_string();
    let proto = Some(first("x-forwarded-proto")).filter(|p| !p.is_empty()).unwrap_or_else(|| "http".into());
    let host = Some(first("x-forwarded-host")).filter(|h| !h.is_empty()).unwrap_or_else(|| first("host"));
    let name = host.trim_start_matches('[').split(']').next().unwrap_or("");
    let name = name.split(':').next().unwrap_or("").to_ascii_lowercase();
    // A literal IPv6 host arrives in brackets.
    let public = !host.is_empty() && (host.starts_with('[') || name == "localhost" || name.contains('.'));
    if public {
        return format!("{proto}://{host}");
    }
    reqwest::Url::parse(site).map(|u| u.origin().ascii_serialization()).unwrap_or_else(|_| site.to_string())
}

fn redirect(location: &str, cookies: &[String]) -> Response {
    let Ok(location) = HeaderValue::from_str(location) else { return StatusCode::INTERNAL_SERVER_ERROR.into_response() };
    let mut res = StatusCode::TEMPORARY_REDIRECT.into_response();
    res.headers_mut().insert(header::LOCATION, location);
    for cookie in cookies {
        if let Ok(v) = HeaderValue::from_str(cookie) {
            res.headers_mut().append(header::SET_COOKIE, v);
        }
    }
    res
}

/// The CSRF cookie. `SameSite=lax`: it must survive the redirect back from github.com.
fn state_cookie(value: &str, max_age: i64) -> String {
    let expires = (Utc::now() + TimeDelta::seconds(max_age)).format("%a, %d %b %Y %H:%M:%S GMT");
    let secure = if env("NODE_ENV") == "production" && max_age > 0 { " Secure;" } else { "" };
    format!("{STATE_COOKIE}={value}; Path={COOKIE_PATH}; Expires={expires}; Max-Age={max_age};{secure} HttpOnly; SameSite=lax")
}

fn not_found() -> Response {
    // With the feature off the route does not exist.
    error(StatusCode::NOT_FOUND, "Not found")
}

/// `GET /api/auth/github`: send the browser to GitHub with a one-time state.
pub async fn start(State(_state): State<AppState>, headers: HeaderMap) -> Response {
    if !enabled() {
        return not_found();
    }
    let Some(callback) = configured_callback().filter(|_| configured()) else {
        return redirect(&format!("{}/admin/login?error=config", public_origin(&headers, &site_url())), &[]);
    };
    let state = auth::uuid_v4();
    let mut url = reqwest::Url::parse("https://github.com/login/oauth/authorize").expect("constant URL");
    url.query_pairs_mut()
        .append_pair("client_id", &env("GITHUB_CLIENT_ID"))
        .append_pair("redirect_uri", &callback)
        .append_pair("state", &state)
        .append_pair("allow_signup", "false");
    redirect(url.as_str(), &[state_cookie(&state, 600)])
}

/// The access token for `code`, or None.
async fn exchange(state: &AppState, code: &str) -> Option<String> {
    let body = json!({
        "client_id": env("GITHUB_CLIENT_ID"), "client_secret": env("GITHUB_CLIENT_SECRET"), "code": code,
        "redirect_uri": configured_callback(),
    });
    let res = state
        .http
        .post("https://github.com/login/oauth/access_token")
        .header("content-type", "application/json")
        .header("accept", "application/json")
        .body(body.to_string())
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .ok()?;
    let data: Value = serde_json::from_slice(&res.error_for_status().ok()?.bytes().await.ok()?).ok()?;
    if truthy(&data["error"]) {
        return None;
    }
    data["access_token"].as_str().filter(|t| !t.is_empty()).map(str::to_string)
}

/// `{ id, login }` of the token's owner.
async fn user(state: &AppState, token: &str) -> Option<Value> {
    let res = state
        .http
        .get("https://api.github.com/user")
        .header("authorization", format!("Bearer {token}"))
        .header("accept", "application/vnd.github+json")
        .header("user-agent", "aiyu-portfolio-admin")
        .header("x-github-api-version", "2022-11-28")
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .ok()?;
    let data: Value = serde_json::from_slice(&res.error_for_status().ok()?.bytes().await.ok()?).ok()?;
    truthy(&data["id"]).then_some(data)
}

/// `GET /api/auth/github/callback`: every failed check returns to the login page without a session.
pub async fn callback(State(state): State<AppState>, RawQuery(q): RawQuery, req: Request) -> Response {
    if !enabled() {
        return not_found();
    }
    let (parts, _) = req.into_parts();
    let origin = public_origin(&parts.headers, &site_url());
    let cleared = state_cookie("", 0);
    let back = |why: &str| redirect(&format!("{origin}/admin/login?error={why}"), std::slice::from_ref(&cleared));
    let params = query_map(&q);
    let param = |k: &str| params.get(k).map(String::as_str).unwrap_or("");

    if !param("error").is_empty() {
        return back("denied");
    }
    if !configured() {
        return back("config");
    }
    let cookies = header_str(&parts.headers, "cookie");
    let sent = cookies.split(';').filter_map(|c| c.trim().split_once('=')).find(|(k, _)| *k == STATE_COOKIE).map_or("", |(_, v)| v);
    if param("state").is_empty() || sent.is_empty() || param("state") != sent {
        auth::audit(&state, &parts, "LOGIN_FAILED", "security", "GitHub OAuth state mismatch (possible CSRF)").await;
        return back("state");
    }
    if param("code").is_empty() {
        return back("invalid");
    }
    let Some(token) = exchange(&state, param("code")).await else { return back("exchange") };
    let Some(profile) = user(&state, &token).await else { return back("profile") };
    let login = profile["login"].as_str().unwrap_or("").to_string();
    // The lock: only the allowed account gets past here.
    if !allowed(&profile["id"], &env("GITHUB_ALLOWED_ID")) {
        tracing::warn!(id = %profile["id"], %login, "GitHub sign-in refused");
        let who = if login.is_empty() { "unknown" } else { &login };
        auth::audit(&state, &parts, "LOGIN_FAILED", "security", &format!("GitHub id {} (@{who}) not authorized", profile["id"])).await;
        return back("forbidden");
    }
    let session = match auth::create_session(&state, &parts, json!({ "email": "", "name": "Admin", "login": profile["login"] })).await {
        Ok(cookie) => cookie,
        Err(err) => {
            tracing::error!(error = %err, "session creation failed");
            return back("profile");
        }
    };
    tracing::info!(%login, ip = %limit::client_ip(&state, &parts), "GitHub sign-in");
    auth::audit(&state, &parts, "LOGIN_SUCCESS", "auth", &format!("Admin signed in via GitHub (@{login})")).await;
    redirect(&format!("{origin}/admin"), &[session, cleared])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_configured_id_is_allowed() {
        assert!(allowed(&json!(42), "42") && allowed(&json!("42"), " 42 "));
        for (candidate, want) in [(json!(41), "42"), (json!(42), ""), (json!(0), "0"), (json!(1.5), "1.5"), (json!(null), "42"), (json!(-1), "-1")] {
            assert!(!allowed(&candidate, want), "{candidate} {want}");
        }
    }

    #[test]
    fn callback_urls() {
        assert_eq!(callback_url("", "https://s.org/").as_deref(), Some("https://s.org/api/auth/github/callback"));
        assert_eq!(callback_url(" http://l:3000/cb ", "https://s.org").as_deref(), Some("http://l:3000/cb"));
        assert!(callback_url("ftp://x/cb", "").is_none() && callback_url("", "").is_none());
    }

    #[test]
    fn redirects_never_name_an_internal_host() {
        let headers = |pairs: &[(&'static str, &str)]| pairs.iter().map(|(k, v)| (header::HeaderName::from_static(k), v.parse().unwrap())).collect::<HeaderMap>();
        assert_eq!(public_origin(&headers(&[("host", "nextjs")]), "https://s.org/x"), "https://s.org");
        assert_eq!(public_origin(&headers(&[("host", "localhost:8080")]), "https://s.org"), "http://localhost:8080");
        assert_eq!(public_origin(&headers(&[("x-forwarded-host", "a.org, b"), ("x-forwarded-proto", "https")]), "https://s.org"), "https://a.org");
    }
}
