pub mod config;
pub mod crypto;
pub mod proxy;
pub mod session;

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
}

impl AppState {
    pub fn new(config: config::Config) -> Self {
        Self {
            upstream: proxy::Upstream::new(&config.next_upstream),
            cipher: crypto::FieldCipher::new(&config.jwt_secret),
            sessions: session::SessionKeys::new(&config.jwt_secret),
            config,
        }
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

    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .merge(next_static)
        .fallback(proxy::forward)
        .layer(
            CompressionLayer::new().br(true).gzip(true).compress_when(
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
