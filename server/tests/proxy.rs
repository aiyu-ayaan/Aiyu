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
    }))
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
    }));
    let res = app.oneshot(Request::builder().uri("/").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_GATEWAY);
}

#[test]
fn rejects_bad_trusted_entries() {
    assert!(parse_trusted("not-an-ip").is_err());
    assert_eq!(parse_trusted(" 127.0.0.1 , ::1 ,").unwrap().len(), 2);
}
