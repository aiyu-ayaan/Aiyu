//! The proxy forwards to an echo upstream that returns the headers it received.

use aiyu_server::{AppState, config::{Config, parse_trusted}, router};
use axum::{
    Json, Router,
    body::Body,
    extract::ConnectInfo,
    http::{HeaderMap, Request, StatusCode},
    routing::any,
};
use http_body_util::BodyExt;
use std::net::SocketAddr;
use tower::ServiceExt;

async fn echo_upstream() -> String {
    let app = Router::new().fallback(any(|h: HeaderMap| async move {
        let map: serde_json::Map<String, serde_json::Value> =
            h.iter().map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").into())).collect();
        Json(map)
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    format!("http://{addr}")
}

async fn app(trusted: &str) -> Router {
    router(AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        next_upstream: echo_upstream().await,
        next_dir: "/nonexistent".into(),
        jwt_secret: "s".into(),
        trusted_proxies: parse_trusted(trusted).unwrap(),
        uploads_dir: "/nonexistent".into(),
        database_url: "postgres://localhost/none".into(),
        web_dir: "/nonexistent".into(),
    }).await.unwrap())
}

async fn forwarded_headers(app: Router, peer: &str, headers: &[(&str, &str)]) -> serde_json::Value {
    let mut req = Request::builder().uri("/anything?q=1").header("host", "example.com");
    for (k, v) in headers {
        req = req.header(*k, *v);
    }
    let mut req = req.body(Body::empty()).unwrap();
    req.extensions_mut().insert(ConnectInfo::<SocketAddr>(peer.parse().unwrap()));
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap()
}

#[tokio::test]
async fn untrusted_peer_cannot_choose_its_ip() {
    let h = forwarded_headers(
        app("").await,
        "203.0.113.7:5555",
        &[("cf-connecting-ip", "1.1.1.1"), ("x-real-ip", "2.2.2.2"), ("x-forwarded-for", "3.3.3.3"), ("x-client-ip", "4.4.4.4")],
    )
    .await;
    assert_eq!(h["x-real-ip"], "203.0.113.7");
    assert_eq!(h["x-forwarded-for"], "203.0.113.7");
    assert!(h.get("cf-connecting-ip").is_none());
    assert!(h.get("x-client-ip").is_none());
}

#[tokio::test]
async fn trusted_proxy_headers_pass_through() {
    let h = forwarded_headers(
        app("10.0.0.0/8, 127.0.0.1").await,
        "10.1.2.3:5555",
        &[("x-real-ip", "198.51.100.9"), ("x-forwarded-for", "198.51.100.9")],
    )
    .await;
    assert_eq!(h["x-real-ip"], "198.51.100.9");
    assert_eq!(h["x-forwarded-for"], "198.51.100.9, 10.1.2.3");
    assert_eq!(h["x-forwarded-host"], "example.com");
}

#[tokio::test]
async fn upstream_down_is_bad_gateway() {
    let app = router(AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        next_upstream: "http://127.0.0.1:1".into(),
        next_dir: "/nonexistent".into(),
        jwt_secret: "s".into(),
        trusted_proxies: vec![],
        uploads_dir: "/nonexistent".into(),
        database_url: "postgres://localhost/none".into(),
        web_dir: "/nonexistent".into(),
    }).await.unwrap());
    let res = app.oneshot(Request::builder().uri("/").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_GATEWAY);
}

#[test]
fn rejects_bad_trusted_entries() {
    assert!(parse_trusted("not-an-ip").is_err());
    assert_eq!(parse_trusted(" 127.0.0.1 , ::1 ,").unwrap().len(), 2);
}

#[tokio::test]
async fn next_rsc_requests_to_vite_pages_get_an_empty_non_rsc_reply() {
    let mut req = Request::builder().uri("/blogs").header("rsc", "1").header("next-router-prefetch", "1").body(Body::empty()).unwrap();
    req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
    let res = app("").await.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(res.headers()["content-type"], "text/plain");
    assert!(res.into_body().collect().await.unwrap().to_bytes().is_empty());
}

#[tokio::test]
async fn non_get_methods_on_rust_page_patterns_reach_next() {
    // `/{legal_app}/{legal_doc}` and the page routes are GET-only in Rust; uploads and admin saves must still
    // reach Next instead of getting a 405.
    for (method, uri) in [("POST", "/api/upload"), ("PUT", "/api/admin/storage"), ("PATCH", "/api/about"), ("POST", "/blogs")] {
        let mut req = Request::builder().method(method).uri(uri).header("host", "example.com").body(Body::empty()).unwrap();
        req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
        let res = app("").await.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK, "{method} {uri}");
    }
}

#[tokio::test]
async fn internal_routes_are_not_reachable_from_outside() {
    for method in ["GET", "POST"] {
        let mut req = Request::builder().method(method).uri("/api/internal/hooks").body(Body::empty()).unwrap();
        req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
        let res = app("").await.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND, "{method}");
    }
}

#[tokio::test]
async fn ported_writes_refuse_anonymous_callers() {
    for (method, uri) in [
        ("PUT", "/api/about"), ("PUT", "/api/home"), ("PUT", "/api/header"), ("POST", "/api/config"), ("PATCH", "/api/themes/active"),
        ("PUT", "/api/ai/layout"), ("POST", "/api/socials"), ("DELETE", "/api/socials/x"), ("POST", "/api/themes"), ("PUT", "/api/themes/x"),
        ("POST", "/api/projects"), ("PATCH", "/api/projects/reorder"), ("DELETE", "/api/projects/x"), ("POST", "/api/deployments"),
        ("PUT", "/api/deployments/x"), ("POST", "/api/gallery"), ("DELETE", "/api/gallery?id=x"),
        ("POST", "/api/blogs"), ("PUT", "/api/blogs/x"), ("DELETE", "/api/blogs/x"), ("GET", "/api/contact/message"),
        ("DELETE", "/api/contact/message?id=x"), ("POST", "/api/legal/apps"), ("PUT", "/api/legal/apps/x"), ("DELETE", "/api/legal/apps/x"),
        ("POST", "/api/legal/apps/x/documents"), ("PUT", "/api/legal/documents/x"), ("DELETE", "/api/legal/documents/x"),
        ("POST", "/api/ai/skills/categories"), ("PUT", "/api/ai/skills/categories/x"), ("POST", "/api/ai/skills/items"),
        ("DELETE", "/api/ai/skills/items/x"), ("POST", "/api/ai/recommendations"), ("PUT", "/api/ai/credits/x"),
        ("POST", "/api/ai/prompts"), ("DELETE", "/api/ai/prompts/x"), ("POST", "/api/ai/seed"),
        ("GET", "/api/admin/ads"), ("PUT", "/api/admin/ads"), ("GET", "/api/admin/social"), ("PUT", "/api/admin/social"),
        ("GET", "/api/admin/seo/config"), ("PUT", "/api/admin/seo/config"), ("GET", "/api/admin/notifications"),
        ("PUT", "/api/admin/notifications"), ("GET", "/api/admin/blogs/token"), ("POST", "/api/admin/blogs/token"),
        ("DELETE", "/api/admin/blogs/token"), ("GET", "/api/admin/mcp/token"), ("POST", "/api/admin/mcp/token"),
        ("DELETE", "/api/admin/mcp/token"), ("GET", "/api/admin/crons/timezone"), ("POST", "/api/admin/crons/timezone"),
        ("GET", "/api/admin/health/targets"), ("POST", "/api/admin/health/targets"), ("DELETE", "/api/admin/health/targets?id=x"),
        ("POST", "/api/admin/notifications/test"), ("GET", "/api/admin/security/audit"), ("GET", "/api/admin/security/sessions"),
        ("POST", "/api/admin/security/sessions/x/revoke"), ("GET", "/api/admin/analytics"), ("DELETE", "/api/admin/analytics"),
    ] {
        let mut req = Request::builder().method(method).uri(uri).header("content-type", "application/json").body(Body::from("{}")).unwrap();
        req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
        let res = app("").await.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED, "{method} {uri}");
    }
}
