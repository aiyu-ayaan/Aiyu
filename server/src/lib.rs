pub mod auth;
pub mod config;
pub mod db;
pub mod crypto;
pub mod export;
pub mod pages;
pub mod proxy;
pub mod session;
pub mod web;

use axum::{
    Router,
    http::{HeaderValue, header},
    routing::get,
};
use tower_http::{
    compression::{
        CompressionLayer,
        predicate::{DefaultPredicate, NotForContentType, Predicate},
    },
    services::ServeDir,
    set_header::SetResponseHeaderLayer,
};

#[derive(Clone)]
pub struct AppState {
    pub config: config::Config,
    pub upstream: proxy::Upstream,
    pub cipher: crypto::FieldCipher,
    pub sessions: session::SessionKeys,
    pub db: sqlx::PgPool,
    /// None when the Vite build is missing: those routes then fall through to Next.
    pub web: Option<std::sync::Arc<web::WebApp>>,
    /// package.json version, shown in the footer.
    pub package_version: Option<String>,
}

impl AppState {
    pub fn upstream_base(&self) -> &str {
        &self.upstream.base
    }

    pub fn upstream_client(&self) -> &reqwest::Client {
        &self.upstream.client
    }

    /// The pool connects lazily, so this never blocks or fails on a down database.
    pub async fn new(config: config::Config) -> anyhow::Result<Self> {
        let web = match web::WebApp::load(&config.web_dir) {
            Ok(w) => Some(w),
            Err(err) => {
                tracing::warn!(dir = ?config.web_dir, error = %err, "web app not loaded; its routes go to Next");
                None
            }
        };
        let package_version = std::fs::read_to_string(std::env::var("PACKAGE_JSON").unwrap_or_else(|_| "package.json".into()))
            .ok()
            .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
            .and_then(|v| v.get("version").and_then(|v| v.as_str()).map(str::to_string));
        Ok(Self {
            package_version,
            web,
            db: db::connect(&config.database_url).await?,
            upstream: proxy::Upstream::new(&config.next_upstream),
            cipher: crypto::FieldCipher::new(&config.jwt_secret),
            sessions: session::SessionKeys::new(&config.jwt_secret),
            config,
        })
    }
}

/// Routes ported to Rust are added here; everything else streams through to Next (strangler fallback).
pub fn router(state: AppState) -> Router {
    // Hashed build assets never change: serve them from disk with a one-year immutable cache.
    let next_static = Router::new()
        .nest_service("/_next/static", ServeDir::new(state.config.next_dir.join("static")))
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        ));

    // Vite assets: content-hashed, so cache forever.
    let web_assets = Router::new()
        .nest_service("/_app", ServeDir::new(&state.config.web_dir))
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        ));

    // Pages owned by the Vite app (keep in sync with web/src/appRoutes.ts).
    let web_pages = Router::new()
        .route("/games", get(web::page))
        .route("/games/", get(web::page))
        .route("/games/{slug}", get(web::page))
        .route("/blogs", get(web::blogs_index))
        .route("/blogs/", get(web::blogs_index))
        .route("/blogs/{id}", get(web::blog_detail))
        .layer(axum::middleware::from_fn(web::skip_next_rsc));

    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .merge(web_pages)
        .route("/_img/blog/{id}", get(web::blog_image))
        .route("/api/admin/export", get(export::export))
        .merge(next_static)
        .merge(web_assets)
        .fallback(proxy::forward)
        .layer(
            CompressionLayer::new().quality(tower_http::CompressionLevel::Precise(4)).br(true).gzip(true).compress_when(
                // Already-compressed payloads (backup zips, images, fonts) only cost CPU to recompress.
                DefaultPredicate::new()
                    .and(NotForContentType::new("application/zip"))
                    .and(NotForContentType::new("application/octet-stream"))
                    .and(NotForContentType::new("application/pdf"))
                    .and(NotForContentType::new("font/woff2"))
                    .and(NotForContentType::new("video/")),
            ),
        )
        .with_state(state)
}
