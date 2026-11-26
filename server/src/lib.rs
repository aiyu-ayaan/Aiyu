pub mod admin_ai;
pub mod admin_analytics;
pub mod admin_blogs;
pub mod admin_crons;
pub mod admin_content;
pub mod admin_legal;
pub mod admin_security;
pub mod admin_settings;
pub mod admin_site;
pub mod ai;
pub mod ai_core;
pub mod ai_modes;
pub mod analytics;
pub mod api;
pub mod auth;
pub mod legal;
pub mod limit;
pub mod mcp;
pub mod misc;
pub mod net;
pub mod notify;
pub mod oauth;
pub mod og;
pub mod compat;
pub mod config;
pub mod contact;
pub mod cron;
pub mod cron_jobs;
pub mod cron_template;
pub mod db;
pub mod crypto;
pub mod drive;
pub mod export;
pub mod geoip;
pub mod github;
pub mod github_admin;
pub mod github_sync;
pub mod health;
pub mod heif;
pub mod images;
pub mod indexing;
pub mod pages;
pub mod proxy;
pub mod restore;
pub mod seo;
pub mod seo_admin;
pub mod session;
pub mod site_api;
pub mod site_files;
pub mod site_static;
pub mod storage;
pub mod uploads;
pub mod web;
pub mod write;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{HeaderValue, StatusCode, header},
    routing::{any, delete, get, patch, post, put},
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
    /// Outbound HTTPS (GitHub API, later the other integrations).
    pub http: reqwest::Client,
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
        health::start_clock();
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
            http: reqwest::Client::builder().user_agent("Portfolio-App").build()?,
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

/// Every ported `/api` route that Next's proxy rate limits belongs here (all POST, PUT, PATCH and DELETE, plus a
/// few listed paths): the limit is applied once, to all of them.
fn limited_api(state: &AppState) -> Router<AppState> {
    use admin_ai as ai_hub;
    use admin_settings as settings;
    use admin_blogs as posts;
    use admin_content as content;
    use admin_legal as legal_admin;
    use admin_site as site;
    Router::new()
        .route("/api/global-search", get(site_api::global_search))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/auth/github", get(oauth::start))
        .route("/api/auth/github/callback", get(oauth::callback))
        .route("/api/github/config", put(github_admin::put_config))
        .route("/api/github/sync", post(github_admin::run_sync))
        .route("/api/github/webhook", post(github_admin::webhook))
        .route("/api/analytics/track", post(analytics::track))
        .route("/api/about", put(site::put_about))
        .route("/api/home", put(site::put_home))
        .route("/api/header", put(site::put_header))
        .route("/api/config", put(site::put_config).post(site::put_config))
        .route("/api/themes/active", patch(site::set_active_theme))
        .route("/api/ai/layout", put(site::put_ai_layout))
        .route("/api/socials", post(content::create_social))
        .route("/api/socials/{id}", put(content::update_social).delete(content::delete_social))
        .route("/api/themes", post(content::create_theme))
        .route("/api/themes/{id}", put(content::update_theme).delete(content::delete_theme))
        .route("/api/projects", post(content::create_project))
        .route("/api/projects/reorder", patch(content::reorder_projects))
        .route("/api/projects/{id}", put(content::update_project).delete(content::delete_project))
        .route("/api/deployments", post(content::create_deployment))
        .route("/api/deployments/reorder", patch(content::reorder_deployments))
        .route("/api/deployments/{id}", put(content::update_deployment).delete(content::delete_deployment))
        .route("/api/gallery", post(content::create_gallery_item).put(content::update_gallery).delete(content::delete_gallery_item))
        .route("/api/blogs", post(posts::create))
        .route("/api/blogs/{id}", put(posts::update).delete(posts::delete))
        .route("/api/contact/message", get(posts::messages).delete(posts::delete_message).post(contact::submit))
        .route("/api/admin/notifications/test", post(notify::test))
        .route("/api/og-preview", get(og::og_preview))
        .route("/api/legal/apps", post(legal_admin::post_app))
        .route("/api/legal/apps/{id}", put(legal_admin::put_app).delete(legal_admin::remove_app))
        .route("/api/legal/apps/{id}/documents", post(legal_admin::post_document))
        .route("/api/legal/documents/{id}", put(legal_admin::put_document).delete(legal_admin::remove_document))
        .route("/api/ai/skills/categories", post(ai_hub::create_category))
        .route("/api/ai/skills/categories/{id}", put(ai_hub::update_category).delete(ai_hub::delete_category))
        .route("/api/ai/skills/items", post(ai_hub::create_skill))
        .route("/api/ai/skills/items/{id}", put(ai_hub::update_skill).delete(ai_hub::delete_skill))
        .route("/api/ai/recommendations", post(ai_hub::create_recommendation))
        .route("/api/ai/recommendations/{id}", put(ai_hub::update_recommendation).delete(ai_hub::delete_recommendation))
        .route("/api/ai/credits", post(ai_hub::create_credit))
        .route("/api/ai/credits/{id}", put(ai_hub::update_credit).delete(ai_hub::delete_credit))
        .route("/api/ai/prompts", post(ai_hub::create_prompt))
        .route("/api/ai/prompts/{id}", put(ai_hub::update_prompt).delete(ai_hub::delete_prompt))
        .route("/api/ai/seed", post(ai_hub::post_seed))
        .route("/api/admin/ads", put(settings::put_ads))
        .route("/api/admin/social", put(settings::put_social))
        .route("/api/admin/seo/config", put(settings::put_seo_config))
        .route("/api/admin/notifications", put(settings::put_notifications))
        .route("/api/admin/blogs/token", post(settings::create_blog_token).delete(settings::delete_blog_token))
        .route("/api/admin/mcp/token", post(settings::create_mcp_token).delete(settings::delete_mcp_token))
        .route("/api/admin/mcp/config", put(settings::put_mcp_config))
        .route("/api/admin/crons/timezone", post(settings::save_timezone))
        .route("/api/admin/health/targets", post(settings::create_target).delete(settings::delete_target))
        .route("/api/admin/security/sessions/{id}/revoke", post(admin_security::revoke))
        .route("/api/admin/analytics", delete(admin_analytics::reset))
        .route("/api/upload", post(uploads::upload).layer(DefaultBodyLimit::max(uploads::BODY_LIMIT)))
        .route("/api/admin/images/upload", post(uploads::upload_image).layer(DefaultBodyLimit::max(uploads::BODY_LIMIT)))
        .route("/api/admin/storage/unreferenced", delete(storage::remove))
        .route("/api/admin/storage/migrate", post(storage::migrate))
        .route("/api/admin/migrate-gallery", post(storage::gallery_thumbnails))
        .route("/api/admin/health/uptime/check", post(health::check_now))
        .route("/api/admin/purge-cache", post(misc::purge_cache))
        .route("/api/admin/crons", post(admin_crons::create))
        .route("/api/admin/crons/{id}", put(admin_crons::update).delete(admin_crons::delete))
        .route("/api/admin/crons/{id}/run", post(admin_crons::run))
        .route("/api/admin/crons/env", post(admin_crons::save_env))
        .route("/api/admin/crons/preview", post(admin_crons::preview))
        .route("/api/admin/gdrive/config", post(drive::save_config))
        .route("/api/admin/gdrive/cron", post(drive::save_schedule))
        .route("/api/admin/gdrive/backup", post(drive::run_backup))
        .route("/api/admin/gdrive/restore", post(drive::restore_backup))
        .route("/api/admin/gdrive/delete", post(drive::remove))
        .route("/api/admin/gdrive/disconnect", post(drive::disconnect))
        .route("/api/admin/resume", put(misc::save_resume))
        .route("/api/admin/resume/compile", post(misc::compile))
        .route("/api/admin/resume/publish", post(misc::publish))
        .route("/api/mcp", post(mcp::post_mcp).delete(mcp::delete_mcp))
        .route("/api/admin/ai/config", put(ai_core::put_config))
        .route("/api/admin/ai/models", post(ai_core::discover_models))
        .route("/api/admin/ai/validate-provider", post(ai_core::validate_provider))
        .route("/api/admin/ai/text", post(ai_core::text))
        .route("/api/admin/ai/generate", post(ai_core::generate).layer(DefaultBodyLimit::max(uploads::BODY_LIMIT)))
        .route("/api/admin/health/analyze", post(ai_core::analyze))
        .route("/api/admin/seo/crawl", post(seo_admin::crawl))
        .route("/api/admin/seo/index", post(seo_admin::index))
        .route("/api/admin/seo/fix", post(seo_admin::fix))
        // A backup can be hundreds of megabytes; the handler streams it to disk and enforces its own limit.
        .route("/api/admin/import", post(restore::import).layer(DefaultBodyLimit::disable()))
        .route_layer(axum::middleware::from_fn_with_state(state.clone(), limit::api))
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

    // Agent documents: the proxy sends other hosts to the canonical one first.
    let documents = Router::new()
        .route("/auth.md", get(site_files::auth_md))
        .route("/docs/api", get(site_files::api_docs))
        .route("/docs/mcp", get(site_files::mcp_docs))
        .layer(axum::middleware::from_fn(compat::canonical_host));

    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .merge(web_pages)
        .merge(documents)
        .route("/robots.txt", get(site_files::robots))
        .route("/sitemap.xml", get(site_files::sitemap))
        .route("/ads.txt", get(site_files::ads_txt))
        .route("/_img/blog/{id}", get(web::blog_image))
        // Catch-alls: answer only for legal apps in the database, everything else goes on to Next.
        .route("/{legal_app}", get(web::legal_app))
        .route("/{legal_app}/{legal_doc}", get(web::legal_doc))
        .route("/api/admin/export", get(export::export))
        .route("/api/admin/ads", get(admin_settings::ads))
        .route("/api/admin/social", get(admin_settings::social))
        .route("/api/admin/seo/config", get(admin_settings::seo_config))
        .route("/api/admin/seo/audit", get(seo_admin::audit))
        .route("/api/admin/notifications", get(admin_settings::notifications))
        .route("/api/admin/blogs/token", get(admin_settings::blog_token))
        .route("/api/admin/mcp/token", get(admin_settings::mcp_token))
        .route("/api/admin/mcp/config", get(admin_settings::mcp_config))
        .route("/api/admin/crons/timezone", get(admin_settings::timezone))
        .route("/api/admin/health/targets", get(admin_settings::targets))
        .route("/api/admin/security/audit", get(admin_security::audit_log))
        .route("/api/admin/security/sessions", get(admin_security::sessions))
        .route("/api/admin/analytics", get(admin_analytics::analytics))
        .route("/api/admin/storage", get(storage::usage))
        .route("/api/admin/storage/migrate", get(storage::preview))
        .route("/api/admin/icons", get(uploads::icons))
        .route("/api/admin/crons", get(admin_crons::list))
        .route("/api/admin/crons/env", get(admin_crons::env))
        .route("/api/admin/crons/logs", get(admin_crons::logs))
        .route("/api/admin/gdrive/status", get(drive::status))
        .route("/api/admin/gdrive/config", get(drive::config))
        .route("/api/admin/gdrive/cron", get(drive::schedules))
        .route("/api/admin/gdrive/auth", get(drive::auth))
        .route("/api/admin/gdrive/callback", get(drive::callback))
        .route("/api/admin/gdrive/list", get(drive::list_backups))
        .route("/api/admin/health/metrics", get(health::metrics))
        .route("/api/admin/health/uptime", get(health::uptime))
        .route("/api/admin/resume", get(misc::resume))
        .route("/api/admin/ai/logs", get(misc::ai_logs))
        .route("/api/admin/ai/config", get(ai_core::config))
        .route("/api/admin/ai/models", get(ai_core::models))
        .route("/api/admin/system-prompt", get(misc::system_prompt))
        .route("/api/mcp", get(mcp::get_mcp).options(mcp::options_mcp))
        .route("/api/uploads/{filename}", get(uploads::serve))
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
        // Ported writes, behind the /api rate limit.
        .merge(limited_api(&state))
        // Next's side of the writes: reached over loopback only, never for outside callers.
        .route("/api/internal/{*rest}", any(|| async { StatusCode::NOT_FOUND }))
        .route("/api/github/stats", get(github::stats))
        .route("/api/github/config", get(github_admin::config))
        .route("/api/github/sync", get(github_admin::preview))
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
        .merge(site_static::uploads(&state))
        .fallback(site_static::fallback)
        // A path Rust serves only for GET (pages, the legal catch-alls) still belongs to Next for other methods.
        .method_not_allowed_fallback(proxy::forward)
        .layer(axum::middleware::from_fn(site_static::redirects))
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
