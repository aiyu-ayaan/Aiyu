//! Old-address redirects and the files under `public/` and the uploads folder, through the whole router.

use aiyu_server::{AppState, config::Config, router};
use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode},
    response::Response,
};
use http_body_util::BodyExt;
use std::path::PathBuf;
use tower::ServiceExt;

/// A fresh `public/` with an uploads folder, and a secret file just outside it.
fn site(name: &str) -> PathBuf {
    let root = std::env::temp_dir().join(format!("aiyu-static-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    for (file, text) in [
        ("public/resume.pdf", "pdf"),
        ("public/doom/js-dos.js", "doom"),
        ("public/images/a.txt", "image"),
        ("uploads/pic.webp", "webp"),
        ("secret.txt", "secret"),
    ] {
        let path = root.join(file);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, text).unwrap();
    }
    root
}

async fn app(root: &std::path::Path) -> Router {
    router(AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        next_upstream: "http://127.0.0.1:1".into(),
        next_dir: "/nonexistent".into(),
        jwt_secret: "s".into(),
        trusted_proxies: vec![],
        uploads_dir: root.join("uploads"),
        public_dir: root.join("public"),
        database_url: "postgres://localhost/none".into(),
        web_dir: "/nonexistent".into(),
    }).await.unwrap())
}

async fn ask(app: &Router, method: &str, uri: &str) -> Response {
    let req = Request::builder().method(method).uri(uri).header("host", "localhost").body(Body::empty()).unwrap();
    app.clone().oneshot(req).await.unwrap()
}

async fn text(res: Response) -> String {
    String::from_utf8(res.into_body().collect().await.unwrap().to_bytes().to_vec()).unwrap()
}

#[tokio::test]
async fn serves_public_files_and_uploads() {
    let root = site("files");
    let app = app(&root).await;
    // One segment (the legal catch-all's pattern), two (its document pattern) and the uploads mount.
    for (uri, body) in [("/resume.pdf", "pdf"), ("/doom/js-dos.js", "doom"), ("/images/a.txt", "image"), ("/uploads/pic.webp", "webp")] {
        let res = ask(&app, "GET", uri).await;
        assert_eq!(res.status(), StatusCode::OK, "{uri}");
        assert!(res.headers().contains_key("cache-control"), "{uri}");
        assert_eq!(text(res).await, body, "{uri}");
    }
    assert_eq!(ask(&app, "HEAD", "/resume.pdf").await.status(), StatusCode::OK);
    assert_eq!(ask(&app, "GET", "/uploads/pic.webp").await.headers()["x-content-type-options"], "nosniff");
    let _ = std::fs::remove_dir_all(root);
}

#[tokio::test]
async fn files_outside_the_folders_are_not_served() {
    let root = site("traversal");
    let app = app(&root).await;
    for uri in ["/../secret.txt", "/%2e%2e/secret.txt", "/doom/%2e%2e/%2e%2e/secret.txt", "/uploads/%2e%2e/secret.txt", "/uploads/..%2Fsecret.txt"] {
        let res = ask(&app, "GET", uri).await;
        assert_ne!(text(res).await, "secret", "{uri}");
    }
    let _ = std::fs::remove_dir_all(root);
}

#[tokio::test]
async fn old_addresses_redirect_before_any_route() {
    let root = site("redirects");
    let app = app(&root).await;
    // `/about` and `/blog/x` would otherwise reach the legal catch-alls.
    for (uri, status, to) in [("/about", 308, "/about-me"), ("/blog/x?y=1", 308, "/blogs/x?y=1"), ("/v1/projects", 301, "/projects"), ("/gallery/", 308, "/gallery")] {
        let res = ask(&app, "GET", uri).await;
        assert_eq!(res.status().as_u16(), status, "{uri}");
        assert_eq!(res.headers()["location"], to, "{uri}");
    }
    assert!(ask(&app, "GET", "/gallery/abc").await.headers().contains_key("strict-transport-security"));
    let _ = std::fs::remove_dir_all(root);
}
