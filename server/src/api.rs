//! `/api/*` routes ported from src/app/api (Next keeps the methods not ported yet: see `method_not_allowed_fallback`).
//! Responses match the Next handlers: same JSON, status codes and cache headers.

use axum::{
    Json,
    extract::{RawQuery, State},
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};
use std::{sync::LazyLock, time::Instant};

use crate::{AppState, pages};

/// `RESPONSE_CACHE` in src/lib/httpCache.js.
pub const PUBLIC_SHORT: &str = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
pub const PUBLIC_MEDIUM: &str = "public, max-age=0, s-maxage=300, stale-while-revalidate=900";
pub const PUBLIC_LONG: &str = "public, max-age=0, s-maxage=900, stale-while-revalidate=3600";
pub const NO_STORE: &str = "no-store, max-age=0";

/// `createPublicCacheHeaders` + `createCacheDebugHeaders` (Rust keeps no response cache, so the source is "none").
pub fn public_json(value: Value, cache: &'static str, key: &'static str) -> Response {
    let mut res = Json(value).into_response();
    let h = res.headers_mut();
    for name in ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] {
        h.insert(name, HeaderValue::from_static(cache));
    }
    h.insert("x-app-cache", HeaderValue::from_static("none"));
    h.insert("x-app-cache-key", HeaderValue::from_static(key));
    res
}

pub fn json_status(status: StatusCode, value: Value) -> Response {
    (status, Json(value)).into_response()
}

pub fn error(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "error": message }))
}

fn no_store(mut res: Response) -> Response {
    res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static(NO_STORE));
    res
}

fn log_error(route: &str, err: &anyhow::Error) {
    tracing::error!(route, error = %err, "api route failed");
}

macro_rules! singleton_get {
    ($name:ident, $table:literal, $key:literal, $msg:literal) => {
        #[doc = concat!("`GET /api/", $key, "`: the ", $table, " singleton.")]
        pub async fn $name(State(state): State<AppState>) -> Response {
            match pages::try_singleton(&state.db, $table, false).await {
                Ok(v) => public_json(v, PUBLIC_LONG, concat!("db:", $key)),
                Err(err) => {
                    log_error(concat!("/api/", $key), &err);
                    error(StatusCode::INTERNAL_SERVER_ERROR, $msg)
                }
            }
        }
    };
}

singleton_get!(about, "About", "about", "Failed to fetch about data");
singleton_get!(home, "Home", "home", "Failed to fetch home data");
singleton_get!(header_data, "Header", "header", "Failed to fetch header data");

/// `GET /api/socials`: newest id first.
pub async fn socials(State(state): State<AppState>) -> Response {
    match pages::client_rows(&state.db, "Social", "ORDER BY id DESC").await {
        Ok(rows) => public_json(Value::Array(rows), PUBLIC_LONG, "db:socials"),
        Err(err) => {
            log_error("/api/socials", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch socials")
        }
    }
}

/// `GET /api/version`
pub async fn version(State(state): State<AppState>) -> Response {
    match &state.package_version {
        Some(v) => {
            let display = if v.starts_with('v') { v.clone() } else { format!("v{v}") };
            no_store(Json(json!({ "version": v, "displayVersion": display })).into_response())
        }
        None => no_store(error(StatusCode::NOT_FOUND, "PACKAGE_VERSION_NOT_FOUND")),
    }
}

static STARTED: LazyLock<Instant> = LazyLock::new(Instant::now);

/// Call at startup so `uptime` counts from process start, like `process.uptime()`.
pub fn mark_start() {
    LazyLock::force(&STARTED);
}

/// `GET /api/health` (`?deep=1` also checks the database).
pub async fn health(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let started = Instant::now();
    let deep = q.as_deref().unwrap_or("").split('&').any(|p| p == "deep=1");
    let body = |status: &str, db: &str| {
        json!({
            "status": status, "mode": if deep { "deep" } else { "shallow" },
            "timestamp": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            "uptime": STARTED.elapsed().as_secs_f64(),
            "responseTimeMs": started.elapsed().as_millis() as u64,
            "checks": { "database": db },
        })
    };
    if !deep {
        return no_store(Json(body("healthy", "skipped")).into_response());
    }
    let up = sqlx::query("SELECT 1").execute(&state.db).await.is_ok();
    let status = if up { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    no_store(json_status(status, body(if up { "healthy" } else { "degraded" }, if up { "up" } else { "down" })))
}

async fn signed_in(state: &AppState, headers: &axum::http::HeaderMap) -> bool {
    crate::auth::require_session(state, headers).await.is_ok()
}

/// Top-level keys `GET /api/config` shows to visitors (PUBLIC_CONFIG_KEYS in src/app/api/config/route.js; a
/// longer list than the pages get).
const CONFIG_PUBLIC_KEYS: &[&str] = &[
    "siteTitle", "siteDescription", "logoText", "ogImage", "profession", "authorName", "googleAnalyticsId", "resume",
    "contactLocation", "contactEmail", "contactStatus", "footerText", "footerText2", "showWorkStatus", "workStatus",
    "footerVersion", "footerVersionLink", "terminal", "blogsTitle", "blogsSubtitle", "isBlogAutomated",
    "blogAutomationMessage", "showBlogViewCount", "projectsTitle", "projectsSubtitle", "galleryTitle", "gallerySubtitle",
    "desktopWallpaper", "desktopDeviceName", "desktopOsVersion", "activeTheme", "activeThemeVariant",
    "allowThemeSwitching", "perPageThemes", "adminSectionStages",
];

/// `GET /api/config`: the whole document for the admin, the public subset for everyone else.
pub async fn config(State(state): State<AppState>, req: axum::extract::Request) -> Response {
    let admin = signed_in(&state, req.headers()).await;
    let config = match pages::try_singleton(&state.db, "Config", false).await {
        Ok(c) => c,
        Err(err) => {
            log_error("/api/config", &err);
            return error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch config");
        }
    };
    if admin {
        // No row yet: Next creates an empty one (upsertSingleton); leave that write to it.
        if config.is_null() {
            return crate::proxy::forward(State(state), req).await;
        }
        return Json(config).into_response();
    }
    let Value::Object(full) = config else {
        let mut res = Json(json!({})).into_response();
        for name in ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] {
            res.headers_mut().insert(name, HeaderValue::from_static(PUBLIC_SHORT));
        }
        return res;
    };
    let mut out = serde_json::Map::new();
    for k in CONFIG_PUBLIC_KEYS {
        if let Some(v) = full.get(*k) {
            out.insert((*k).into(), v.clone());
        }
    }
    let fav = full.get("favicon");
    if let Some(Value::Object(f)) = fav {
        let s = |k: &str| f.get(k).and_then(Value::as_str).unwrap_or("").to_string();
        out.insert("favicon".into(), json!({ "filename": s("filename"), "mimeType": s("mimeType") }));
    }
    if let Some(og) = out.get("ogImage").and_then(Value::as_str).map(str::trim).filter(|o| !o.is_empty()).map(str::to_string) {
        out.insert("ogImage".into(), crate::web::absolute_url(&og).into());
    }
    let has_favicon = ["value", "filename", "mimeType"].iter().any(|k| fav.and_then(|f| f.get(*k)).is_some_and(truthy));
    out.insert("hasCustomFavicon".into(), has_favicon.into());
    public_json(Value::Object(out), PUBLIC_MEDIUM, "db:config:public:api")
}

fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::String(s) => !s.is_empty(),
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
        _ => true,
    }
}

/// `GET /api/projects`
pub async fn projects(State(state): State<AppState>) -> Response {
    match pages::projects(&state.db, false).await {
        Ok(rows) => public_json(Value::Array(rows), PUBLIC_MEDIUM, "db:projects"),
        Err(err) => {
            log_error("/api/projects", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch projects")
        }
    }
}

/// `GET /api/deployments`
pub async fn deployments(State(state): State<AppState>) -> Response {
    match pages::deployments(&state.db).await {
        Ok(rows) => public_json(Value::Array(rows), PUBLIC_MEDIUM, "db:deployments"),
        Err(err) => {
            log_error("/api/deployments", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch deployments")
        }
    }
}

/// One client-shaped row by id. `table` is a constant from this module.
async fn row_by_id(state: &AppState, table: &str, id: &str) -> anyhow::Result<Option<Value>> {
    let sql = format!(r#"SELECT row_to_json(t)::text FROM "{table}" t WHERE id = $1"#);
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(id).fetch_optional(&state.db).await?;
    Ok(match raw {
        Some(r) => Some(pages::to_client_row(serde_json::from_str(&r)?)),
        None => None,
    })
}

/// `GET /api/projects/{id}` and `GET /api/deployments/{id}` (by id only, like Next).
async fn item(state: &AppState, table: &str, id: &str, missing: &str, failed: &str) -> Response {
    match row_by_id(state, table, id).await {
        Ok(Some(v)) => {
            let mut res = public_json(v, PUBLIC_MEDIUM, "db:item");
            // Next's key carries the id (`db:projects:item:<id>`); it is debug-only, keep it informative.
            if let Ok(h) = HeaderValue::from_str(&format!("db:{}:item:{id}", if table == "Project" { "projects" } else { "deployments" })) {
                res.headers_mut().insert("x-app-cache-key", h);
            }
            res
        }
        Ok(None) => error(StatusCode::NOT_FOUND, missing),
        Err(err) => {
            log_error(table, &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, failed)
        }
    }
}

pub async fn project(State(state): State<AppState>, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    item(&state, "Project", &id, "Project not found", "Failed to fetch project").await
}

pub async fn deployment(State(state): State<AppState>, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    item(&state, "Deployment", &id, "Deployment not found", "Failed to fetch deployment").await
}

fn medium(value: Value) -> Response {
    let mut res = Json(value).into_response();
    for name in ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] {
        res.headers_mut().insert(name, HeaderValue::from_static(PUBLIC_MEDIUM));
    }
    res
}

/// `GET /api/projects/{id}/links`: the apps built from the project and their legal pages.
pub async fn project_links(State(state): State<AppState>, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    let result: anyhow::Result<Response> = async {
        let Some(_) = row_by_id(&state, "Project", &id).await? else { return Ok(error(StatusCode::NOT_FOUND, "Project not found")) };
        let apps = pages::app_links_for_project(&state.db, &id).await?;
        let mut legal: Vec<Value> = vec![];
        for app in &apps {
            for l in pages::legal_links_for_deployment(&state.db, app["id"].as_str().unwrap_or_default()).await["links"].as_array().into_iter().flatten() {
                if !legal.iter().any(|x| x["href"] == l["href"]) {
                    legal.push(l.clone());
                }
            }
        }
        let apps: Vec<Value> = apps.iter().map(|a| json!({ "name": a["name"], "href": a["href"], "isProduct": a["isProduct"] })).collect();
        Ok(medium(json!({ "apps": apps, "legal": legal })))
    }
    .await;
    result.unwrap_or_else(|err| {
        log_error("/api/projects/{id}/links", &err);
        error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch links")
    })
}

/// `GET /api/deployments/{id}/links`: product page, source project and legal pages of an app.
pub async fn deployment_links(State(state): State<AppState>, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    let result: anyhow::Result<Response> = async {
        let Some(d) = row_by_id(&state, "Deployment", &id).await? else { return Ok(error(StatusCode::NOT_FOUND, "Deployment not found")) };
        let product = pages::product_path(&state.db, &id).await;
        let project = pages::project_link_for_deployment(&state.db, d["projectId"].as_str()).await;
        let legal = pages::legal_links_for_deployment(&state.db, &id).await;
        Ok(medium(json!({ "productHref": product, "project": project, "legal": legal["links"].as_array().cloned().unwrap_or_default() })))
    }
    .await;
    result.unwrap_or_else(|err| {
        log_error("/api/deployments/{id}/links", &err);
        error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch links")
    })
}

/// `GET /api/gallery`: 60 requests a minute per client IP.
pub async fn gallery(State(state): State<AppState>, req: axum::extract::Request) -> Response {
    let ip = crate::limit::client_ip(&state, &req.into_parts().0);
    if !crate::limit::check(&format!("gallery:{ip}"), 60, std::time::Duration::from_secs(60)) {
        return json_status(StatusCode::TOO_MANY_REQUESTS, json!({ "success": false, "error": "Rate limit exceeded" }));
    }
    match pages::client_rows(&state.db, "Gallery", r#"ORDER BY "isPinned" DESC, "order" ASC, "createdAt" DESC"#).await {
        Ok(rows) => public_json(json!({ "success": true, "data": rows }), PUBLIC_MEDIUM, "db:gallery"),
        Err(err) => json_status(StatusCode::BAD_REQUEST, json!({ "success": false, "error": err.to_string() })),
    }
}
