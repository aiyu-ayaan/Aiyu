pub mod ai;
pub mod api;
pub mod auth;
pub mod legal;
pub mod limit;
pub mod compat;
pub mod config;
pub mod db;
pub mod crypto;
pub mod export;
pub mod pages;
pub mod proxy;
pub mod session;
pub mod site_api;
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
        .route("/about-me", get(web::about_me))
        .route("/apps", get(web::apps))
        .route("/apps/{id}", get(web::app_detail))
        .route("/projects", get(web::projects))
        .route("/projects/{id}", get(web::project_detail))
        .route("/gallery", get(web::gallery))
        .route("/github", get(web::github))
        .route("/contact-us", get(web::contact))
        .route("/ai", get(web::ai_hub))
        .route("/ai/{section}", get(web::ai_section))
        .route("/sitemap", get(web::sitemap_page))
        .route("/", get(web::home))
        .route("/desktop", get(web::desktop))
        .route("/admin", get(web::admin))
        .route("/admin/{*rest}", get(web::admin))
        .layer(axum::middleware::from_fn(web::skip_next_rsc))
        .layer(axum::middleware::from_fn(compat::public_page));

    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .merge(web_pages)
        .route("/_img/blog/{id}", get(web::blog_image))
        // Catch-alls: answer only for legal apps in the database, everything else goes on to Next.
        .route("/{legal_app}", get(web::legal_app))
        .route("/{legal_app}/{legal_doc}", get(web::legal_doc))
        .route("/api/admin/export", get(export::export))
        // API routes ported from Next; other methods on these paths still go to Next.
        .route("/api/about", get(api::about))
        .route("/api/home", get(api::home))
        .route("/api/header", get(api::header_data))
        .route("/api/socials", get(api::socials))
        .route("/api/version", get(api::version))
        .route("/api/health", get(api::health))
        .route("/api/config", get(api::config))
        .route("/api/projects", get(api::projects))
        .route("/api/projects/{id}", get(api::project))
        .route("/api/projects/{id}/links", get(api::project_links))
        .route("/api/deployments", get(api::deployments))
        .route("/api/deployments/{id}", get(api::deployment))
        .route("/api/deployments/{id}/links", get(api::deployment_links))
        .route("/api/gallery", get(api::gallery))
        .route("/api/blogs", get(api::blogs))
        .route("/api/blogs/{id}", get(api::blog))
        .route("/api/socials/{id}", get(api::social))
        .route("/api/ai-page", get(api::ai_page))
        .route("/api/ai/layout", get(api::ai_layout))
        .route("/api/ai/skills", get(api::ai_skills))
        .route("/api/ai/skills/categories", get(api::ai_skill_categories))
        .route("/api/ai/recommendations", get(api::ai_recommendations))
        .route("/api/ai/credits", get(api::ai_credits))
        .route("/api/ai/prompts", get(api::ai_prompts))
        .route("/api/legal/apps", get(api::legal_apps))
        .route("/api/legal/apps/{id}", get(api::legal_app))
        .route("/api/legal/documents/{id}", get(api::legal_document))
        .route("/api/resume", get(api::resume))
        .route("/api/favicon", get(api::favicon))
        .route("/api/themes", get(site_api::themes))
        .route("/api/themes/active", get(site_api::active_theme))
        .route("/api/themes/{id}", get(site_api::theme))
        .route("/api/desktop/widgets", get(site_api::desktop_widgets))
        .route("/api/desktop/source", get(site_api::desktop_source))
        .route("/api/global-search", get(site_api::global_search))
        .route("/.well-known/api-catalog", get(site_api::api_catalog))
        .route("/.well-known/openapi.json", get(site_api::openapi))
        .route("/.well-known/oauth-authorization-server", get(site_api::oauth_metadata))
        .route("/.well-known/openid-configuration", get(site_api::oauth_metadata))
        .route("/.well-known/oauth-protected-resource", get(site_api::protected_resource))
        .route("/.well-known/jwks.json", get(site_api::jwks))
        .route("/.well-known/agent-skills/index.json", get(site_api::skills_index))
        .route("/.well-known/agent-skills/{skill}/SKILL.md", get(site_api::skill_md))
        .route("/.well-known/mcp/server-card.json", get(site_api::mcp_server_card))
        .merge(next_static)
        .merge(web_assets)
        .fallback(proxy::forward)
        // A path Rust serves only for GET (pages, the legal catch-alls) still belongs to Next for other methods.
        .method_not_allowed_fallback(proxy::forward)
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
