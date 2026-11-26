//! The router: what it refuses, and who may write.

use aiyu_server::{AppState, config::{Config, parse_trusted}, router};
use axum::{
    Router,
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode},
};
use std::net::SocketAddr;
use tower::ServiceExt;

async fn app(trusted: &str) -> Router {
    router(AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        jwt_secret: "s".into(),
        trusted_proxies: parse_trusted(trusted).unwrap(),
        uploads_dir: "/nonexistent".into(),
        public_dir: "/nonexistent".into(),
        database_url: "postgres://localhost/none".into(),
        web_dir: "/nonexistent".into(),
    }).await.unwrap())
}

#[test]
fn rejects_bad_trusted_entries() {
    assert!(parse_trusted("not-an-ip").is_err());
    assert_eq!(parse_trusted(" 127.0.0.1 , ::1 ,").unwrap().len(), 2);
}

#[tokio::test]
async fn unknown_paths_and_methods_are_refused() {
    for (method, uri, status) in [
        ("GET", "/api/no-such-route", 404), ("POST", "/api/no-such-route", 404), ("POST", "/api/internal/hooks", 404),
        ("GET", "/no/such/page", 404), ("POST", "/no-such-page", 404), ("PUT", "/api/admin/storage", 405), ("POST", "/blogs", 405),
        // The web build is missing here.
        ("GET", "/", 503),
    ] {
        let mut req = Request::builder().method(method).uri(uri).header("host", "localhost").body(Body::empty()).unwrap();
        req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
        let res = app("").await.oneshot(req).await.unwrap();
        assert_eq!(res.status().as_u16(), status, "{method} {uri}");
    }
}

#[tokio::test]
async fn writes_refuse_anonymous_callers() {
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
        ("POST", "/api/upload"), ("POST", "/api/admin/images/upload"), ("GET", "/api/admin/storage"), ("GET", "/api/admin/storage/migrate"),
        ("POST", "/api/admin/storage/migrate"), ("DELETE", "/api/admin/storage/unreferenced"), ("POST", "/api/admin/migrate-gallery"),
        ("GET", "/api/admin/icons"),
        ("GET", "/api/admin/mcp/config"), ("PUT", "/api/admin/mcp/config"), ("GET", "/api/admin/resume"),
        ("GET", "/api/admin/health/metrics"), ("GET", "/api/admin/health/uptime"), ("POST", "/api/admin/health/uptime/check"),
        ("POST", "/api/admin/purge-cache"), ("PUT", "/api/admin/resume"), ("POST", "/api/admin/resume/compile"),
        ("POST", "/api/admin/resume/publish"), ("GET", "/api/admin/ai/logs"), ("GET", "/api/admin/system-prompt"),
        ("GET", "/api/admin/crons"), ("POST", "/api/admin/crons"), ("PUT", "/api/admin/crons/x"), ("DELETE", "/api/admin/crons/x"),
        ("POST", "/api/admin/crons/x/run"), ("GET", "/api/admin/crons/env"), ("POST", "/api/admin/crons/env"),
        ("GET", "/api/admin/crons/logs"), ("POST", "/api/admin/crons/preview"),
        ("POST", "/api/admin/import"), ("GET", "/api/admin/gdrive/status"), ("GET", "/api/admin/gdrive/config"),
        ("POST", "/api/admin/gdrive/config"), ("GET", "/api/admin/gdrive/cron"), ("POST", "/api/admin/gdrive/cron"),
        ("GET", "/api/admin/gdrive/auth"), ("GET", "/api/admin/gdrive/list"), ("POST", "/api/admin/gdrive/backup"),
        ("POST", "/api/admin/gdrive/restore"), ("POST", "/api/admin/gdrive/delete"), ("POST", "/api/admin/gdrive/disconnect"),
        ("PUT", "/api/github/config"), ("GET", "/api/github/sync?repo=x"), ("POST", "/api/github/sync"),
        ("POST", "/api/admin/notifications/test"), ("GET", "/api/admin/security/audit"), ("GET", "/api/admin/security/sessions"),
        ("GET", "/api/admin/ai/config"), ("PUT", "/api/admin/ai/config"), ("GET", "/api/admin/ai/models"), ("POST", "/api/admin/ai/models"),
        ("POST", "/api/admin/ai/validate-provider"), ("POST", "/api/admin/ai/text"), ("POST", "/api/admin/ai/generate"),
        ("POST", "/api/admin/health/analyze"), ("GET", "/api/admin/seo/audit"), ("POST", "/api/admin/seo/crawl"),
        ("POST", "/api/admin/seo/index"), ("POST", "/api/admin/seo/fix"),
        ("POST", "/api/admin/security/sessions/x/revoke"), ("GET", "/api/admin/analytics"), ("DELETE", "/api/admin/analytics"),
    ] {
        let mut req = Request::builder().method(method).uri(uri).header("content-type", "application/json").body(Body::from("{}")).unwrap();
        req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
        let res = app("").await.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED, "{method} {uri}");
    }
}
