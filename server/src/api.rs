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

pub(crate) fn log_error(route: &str, err: &anyhow::Error) {
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

pub(crate) async fn signed_in(state: &AppState, headers: &axum::http::HeaderMap) -> bool {
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
        if !config.is_null() {
            return Json(config).into_response();
        }
        // No row yet: the admin's first read creates an empty one.
        return match crate::write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &serde_json::Map::new()).await {
            Ok(created) => Json(created).into_response(),
            Err(err) => {
                log_error("/api/config", &err);
                error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch config")
            }
        };
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

pub(crate) fn truthy(v: &Value) -> bool {
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

pub(crate) fn medium(value: Value) -> Response {
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

// ── blogs ─────────────────────────────────────────────────────────────────────────────────────────────

pub(crate) fn query_map(q: &Option<String>) -> std::collections::HashMap<String, String> {
    url::form_urlencoded_parse(q.as_deref().unwrap_or(""))
}

mod url {
    /// `URLSearchParams.get` semantics: `+` is a space, `%XX` decodes, the first value of a key wins.
    pub fn form_urlencoded_parse(q: &str) -> std::collections::HashMap<String, String> {
        let dec = |s: &str| {
            let b = s.as_bytes();
            let mut out = Vec::with_capacity(b.len());
            let mut i = 0;
            while i < b.len() {
                let hex = |c: u8| (c as char).to_digit(16);
                match b[i] {
                    b'+' => out.push(b' '),
                    b'%' if i + 2 < b.len() => {
                        match (hex(b[i + 1]), hex(b[i + 2])) {
                            (Some(h), Some(l)) => {
                                out.push((h * 16 + l) as u8);
                                i += 3;
                                continue;
                            }
                            _ => out.push(b'%'),
                        }
                    }
                    c => out.push(c),
                }
                i += 1;
            }
            String::from_utf8_lossy(&out).into_owned()
        };
        let mut map = std::collections::HashMap::new();
        for pair in q.split('&').filter(|p| !p.is_empty()) {
            let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
            map.entry(dec(k)).or_insert_with(|| dec(v));
        }
        map
    }
}

/// `Number.parseInt` of a query value: leading integer, else None.
fn js_int(v: Option<&String>) -> Option<i64> {
    let s = v?.trim_start();
    let end = s.char_indices().take_while(|(i, c)| c.is_ascii_digit() || (*i == 0 && (*c == '-' || *c == '+'))).last().map(|(i, c)| i + c.len_utf8())?;
    s[..end].parse().ok()
}

fn without_search_vector(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter()
        .map(|mut r| {
            if let Some(o) = r.as_object_mut() {
                o.shift_remove("searchVector");
            }
            r
        })
        .collect()
}

async fn blog_views(state: &AppState, ids: &[String]) -> anyhow::Result<std::collections::HashMap<String, i64>> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        r#"SELECT "entityId", COALESCE(SUM(views), 0)::bigint FROM "AnalyticsDaily"
           WHERE type = 'entity_view' AND "entityType" = 'blog' AND "entityId" = ANY($1) GROUP BY "entityId""#,
    )
    .bind(ids)
    .fetch_all(&state.db)
    .await?;
    Ok(rows.into_iter().collect())
}

fn with_time(mut res: Response, started: Instant) -> Response {
    if let Ok(v) = HeaderValue::from_str(&started.elapsed().as_millis().to_string()) {
        res.headers_mut().insert("x-response-time-ms", v);
    }
    res
}

/// `GET /api/blogs`: published posts (all, or `?page=&limit=`), or for the admin with `?all=true` every post with
/// filters, sorting, view counts and counts per tab.
pub async fn blogs(State(state): State<AppState>, RawQuery(q): RawQuery, headers: axum::http::HeaderMap) -> Response {
    let started = Instant::now();
    let p = query_map(&q);
    let admin = p.get("all").map(String::as_str) == Some("true") && signed_in(&state, &headers).await;
    let result = if admin { blogs_admin(&state, &p, started).await } else { blogs_public(&state, &p, started).await };
    result.unwrap_or_else(|err| with_time(json_status(StatusCode::BAD_REQUEST, json!({ "success": false, "error": err.to_string() })), started))
}

async fn blogs_public(state: &AppState, p: &std::collections::HashMap<String, String>, started: Instant) -> anyhow::Result<Response> {
    const DEFAULT: i64 = 6;
    if p.contains_key("page") || p.contains_key("limit") {
        let page = js_int(p.get("page")).unwrap_or(1).max(1);
        let limit = match p.get("limit") {
            Some(_) => js_int(p.get("limit")).map(|l| l.clamp(1, 24)).unwrap_or(DEFAULT),
            None => DEFAULT,
        };
        // page/limit are parsed integers.
        let rest = format!(r#"WHERE published ORDER BY "createdAt" DESC LIMIT {limit} OFFSET {}"#, (page - 1) * limit);
        let rows = without_search_vector(pages::client_rows(&state.db, "Blog", &rest).await?);
        let total: i64 = sqlx::query_scalar(r#"SELECT count(*) FROM "Blog" WHERE published"#).fetch_one(&state.db).await?;
        let pages_n = if total > 0 { (total + limit - 1) / limit } else { 0 };
        let body = json!({ "success": true, "data": rows, "pagination": { "page": page, "limit": limit, "total": total, "totalPages": pages_n, "hasMore": page < pages_n } });
        return Ok(with_time(public_json(body, PUBLIC_MEDIUM, "db:blogs:published:page"), started));
    }
    let rows = without_search_vector(pages::client_rows(&state.db, "Blog", r#"WHERE published ORDER BY "createdAt" DESC"#).await?);
    Ok(with_time(public_json(json!({ "success": true, "data": rows }), PUBLIC_MEDIUM, "db:blogs:published"), started))
}

async fn blogs_admin(state: &AppState, p: &std::collections::HashMap<String, String>, started: Instant) -> anyhow::Result<Response> {
    let limit = js_int(p.get("limit")).filter(|l| *l != 0).unwrap_or(20).clamp(1, 24);
    let page = js_int(p.get("page")).filter(|l| *l != 0).unwrap_or(1).max(1);
    let tab = p.get("filter").map(String::as_str).unwrap_or("all");
    let sort_key = p.get("sortKey").map(String::as_str).unwrap_or("");
    let dir = if p.get("sortDir").map(String::as_str) == Some("asc") { "ASC" } else { "DESC" };
    let filter = match tab {
        "flagged" => r#"WHERE "isFlagged""#,
        "ceased" => r#"WHERE NOT published AND NOT "isFlagged""#,
        "active" => r#"WHERE published AND NOT "isFlagged""#,
        _ => "",
    };
    let (all, flagged, ceased, active): (i64, i64, i64, i64) = sqlx::query_as(
        r#"SELECT count(*), count(*) FILTER (WHERE "isFlagged"), count(*) FILTER (WHERE NOT published AND NOT "isFlagged"),
                  count(*) FILTER (WHERE published AND NOT "isFlagged") FROM "Blog""#,
    )
    .fetch_one(&state.db)
    .await?;
    let offset = (page - 1) * limit;
    let id_of = |b: &Value| b["_id"].as_str().unwrap_or_default().to_string();
    let data: Vec<Value> = if sort_key == "views" {
        // Rank every matching post by views (ties keep the table order, like the JS sort), then load one page.
        let ids: Vec<String> = sqlx::query_scalar(&format!(r#"SELECT id FROM "Blog" {filter}"#)).fetch_all(&state.db).await?;
        let views = blog_views(state, &ids).await?;
        let mut ranked = ids.clone();
        ranked.sort_by(|a, b| {
            let (va, vb) = (views.get(a).copied().unwrap_or(0), views.get(b).copied().unwrap_or(0));
            if dir == "ASC" { va.cmp(&vb) } else { vb.cmp(&va) }
        });
        let page_ids: Vec<String> = ranked.into_iter().skip(offset as usize).take(limit as usize).collect();
        let rows = sqlx::query_scalar::<_, String>(r#"SELECT row_to_json(t)::text FROM "Blog" t WHERE id = ANY($1)"#).bind(&page_ids).fetch_all(&state.db).await?;
        let mut by_id: std::collections::HashMap<String, Value> = std::collections::HashMap::new();
        for r in rows {
            let v = pages::to_client_row(serde_json::from_str(&r)?);
            by_id.insert(id_of(&v), v);
        }
        without_search_vector(page_ids.iter().filter_map(|id| by_id.remove(id)).collect())
            .into_iter()
            .map(|mut b| {
                let n = views.get(&id_of(&b)).copied().unwrap_or(0);
                b["views"] = n.into();
                b
            })
            .collect()
    } else {
        let order = match sort_key {
            "title" => format!("title {dir}"),
            "date" => format!(r#""createdAt" {dir}"#),
            "published" => format!("published {dir}"),
            _ => r#""createdAt" DESC"#.into(),
        };
        // Every fragment is a constant or a parsed integer.
        let rows = without_search_vector(pages::client_rows(&state.db, "Blog", &format!("{filter} ORDER BY {order} LIMIT {limit} OFFSET {offset}")).await?);
        let ids: Vec<String> = rows.iter().map(id_of).collect();
        let views = blog_views(state, &ids).await?;
        rows.into_iter()
            .map(|mut b| {
                let n = views.get(&id_of(&b)).copied().unwrap_or(0);
                b["views"] = n.into();
                b
            })
            .collect()
    };
    let total = match tab {
        "flagged" => flagged,
        "ceased" => ceased,
        "active" => active,
        _ => all,
    };
    let pages_n = if total > 0 { (total + limit - 1) / limit } else { 0 };
    let body = json!({
        "success": true, "data": data,
        "pagination": { "page": page, "limit": limit, "total": total, "totalPages": pages_n, "hasMore": page < pages_n },
        "counts": { "all": all, "flagged": flagged, "ceased": ceased, "active": active },
    });
    Ok(with_time(Json(body).into_response(), started))
}

/// `GET /api/blogs/{id}`: `resolveBlogByIdentifier` (slug, slug ignoring case, id, then loose matches), drafts
/// included like Next. Next also backfilled a missing slug on read; that write is left out.
pub async fn blog(State(state): State<AppState>, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    let result: anyhow::Result<Option<Value>> = async {
        let ident = id.trim();
        if ident.is_empty() {
            return Ok(None);
        }
        let one = |cond: &str| format!(r#"SELECT row_to_json(t)::text FROM "Blog" t WHERE {cond} LIMIT 1"#);
        for cond in ["slug = $1", "lower(slug) = lower($1)", "id = $1"] {
            if let Some(raw) = sqlx::query_scalar::<_, String>(&one(cond)).bind(ident).fetch_optional(&state.db).await? {
                return Ok(Some(pages::to_client_row(serde_json::from_str(&raw)?)));
            }
        }
        let all: Vec<(String, String, String)> = sqlx::query_as(r#"SELECT id, slug, title FROM "Blog""#).fetch_all(&state.db).await?;
        let hit = all.into_iter().find(|(bid, slug, title)| {
            let derived = pages::entity_slug(&json!({ "_id": bid, "slug": slug, "name": title }), "blog");
            derived == ident || slug == ident || bid == ident || pages::generate_slug(title) == ident
                || (!slug.is_empty() && (ident.starts_with(slug.as_str()) || slug.starts_with(ident)))
        });
        match hit {
            Some((bid, ..)) => {
                let raw: String = sqlx::query_scalar(&one("id = $1")).bind(bid).fetch_one(&state.db).await?;
                Ok(Some(pages::to_client_row(serde_json::from_str(&raw)?)))
            }
            None => Ok(None),
        }
    }
    .await;
    match result {
        Ok(Some(mut b)) => {
            if let Some(o) = b.as_object_mut() {
                o.shift_remove("searchVector");
            }
            Json(json!({ "success": true, "data": b })).into_response()
        }
        Ok(None) => json_status(StatusCode::NOT_FOUND, json!({ "success": false, "error": "Blog not found" })),
        Err(err) => json_status(StatusCode::BAD_REQUEST, json!({ "success": false, "error": err.to_string() })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn query_parsing_like_url_search_params() {
        let m = url::form_urlencoded_parse("a=1&a=2&b=x+y%21&c=%E2%9C%93&bad=%zz%&e");
        assert_eq!(m["a"], "1");
        assert_eq!(m["b"], "x y!");
        assert_eq!(m["c"], "✓");
        assert_eq!(m["bad"], "%zz%");
        assert_eq!(m["e"], "");
        assert_eq!(js_int(Some(&"12abc".to_string())), Some(12));
        assert_eq!(js_int(Some(&"abc".to_string())), None);
    }
}

// ── batch 2: socials/{id}, AI hub reads, legal admin reads, resume, favicon ───────────────────────────────

/// `GET /api/socials/{id}`
pub async fn social(State(state): State<AppState>, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    match row_by_id(&state, "Social", &id).await {
        Ok(Some(v)) => {
            let mut res = public_json(v, PUBLIC_LONG, "db:socials:item");
            if let Ok(h) = HeaderValue::from_str(&format!("db:socials:item:{id}")) {
                res.headers_mut().insert("x-app-cache-key", h);
            }
            res
        }
        Ok(None) => error(StatusCode::NOT_FOUND, "Social link not found"),
        Err(err) => {
            log_error("/api/socials/{id}", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch social link")
        }
    }
}

/// `GET /api/ai-page`: the skeleton hydrated from the four section tables.
pub async fn ai_page(State(state): State<AppState>) -> Response {
    // DEFAULT_AI_PAGE comes with the Vite build; without it Next answers.
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    match crate::ai::hydrated(&state.db, &web.ai_defaults).await {
        Ok(v) => public_json(v, PUBLIC_LONG, "db:aiPage"),
        Err(err) => {
            log_error("/api/ai-page", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch AI page config")
        }
    }
}

/// `GET /api/ai/layout`: the skeleton only, no cache headers.
pub async fn ai_layout(State(state): State<AppState>) -> Response {
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    match crate::ai::skeleton(&state.db, &web.ai_defaults).await {
        Ok(v) => Json(v).into_response(),
        Err(err) => {
            log_error("/api/ai/layout", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch AI page layout")
        }
    }
}

/// `handleRead` in src/app/api/ai/_shared.js.
fn ai_read(route: &str, result: anyhow::Result<Value>) -> Response {
    match result {
        Ok(v) => medium(v),
        Err(err) => {
            log_error(route, &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Internal error")
        }
    }
}

pub async fn ai_skills(State(state): State<AppState>) -> Response {
    ai_read("/api/ai/skills", crate::ai::section(&state.db, "skills").await)
}

pub async fn ai_recommendations(State(state): State<AppState>) -> Response {
    ai_read("/api/ai/recommendations", crate::ai::section(&state.db, "recommendations").await)
}

pub async fn ai_credits(State(state): State<AppState>) -> Response {
    ai_read("/api/ai/credits", crate::ai::section(&state.db, "credits").await)
}

pub async fn ai_prompts(State(state): State<AppState>) -> Response {
    ai_read("/api/ai/prompts", crate::ai::section(&state.db, "prompts").await)
}

/// Client rows of `table` whose `fk` is `id`, in `order`. `table`, `fk`, `order` are constants from this module.
async fn children(state: &AppState, table: &str, fk: &str, id: &str, order: &str) -> anyhow::Result<Vec<Value>> {
    let sql = format!(r#"SELECT row_to_json(t)::text FROM "{table}" t WHERE "{fk}" = $1 ORDER BY {order}"#);
    let rows: Vec<String> = sqlx::query_scalar(&sql).bind(id).fetch_all(&state.db).await?;
    rows.iter().map(|r| Ok(pages::to_client_row(serde_json::from_str(r)?))).collect()
}

const BY_ORDER: &str = r#""displayOrder" ASC, "createdAt" DESC"#;

/// `GET /api/ai/skills/categories`: `listSkillCategories`, every category with its `skills`.
pub async fn ai_skill_categories(State(state): State<AppState>) -> Response {
    let result: anyhow::Result<Value> = async {
        let mut cats = pages::client_rows(&state.db, "AiSkillCategory", r#"ORDER BY "displayOrder" ASC, "createdAt" DESC"#).await?;
        for cat in cats.iter_mut() {
            let id = cat["_id"].as_str().unwrap_or_default().to_string();
            cat["skills"] = Value::Array(children(&state, "AiSkill", "categoryId", &id, BY_ORDER).await?);
        }
        Ok(json!({ "categories": cats }))
    }
    .await;
    ai_read("/api/ai/skills/categories", result)
}

/// `handleAdmin` in src/app/api/legal/_shared.js for reads: session, then `no-store` JSON.
async fn legal_admin(state: &AppState, headers: &axum::http::HeaderMap, result: impl std::future::Future<Output = anyhow::Result<Option<Value>>>, missing: &str) -> Response {
    if !signed_in(state, headers).await {
        return error(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    match result.await {
        Ok(Some(v)) => {
            let mut res = Json(v).into_response();
            res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
            res
        }
        Ok(None) => error(StatusCode::NOT_FOUND, missing),
        Err(err) => {
            log_error("/api/legal", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Internal error")
        }
    }
}

/// `shapeAppWithDocs`: the app with every document, drafts included.
async fn legal_app_with_docs(state: &AppState, mut app: Value) -> anyhow::Result<Value> {
    let id = app["_id"].as_str().unwrap_or_default().to_string();
    app["documents"] = Value::Array(children(state, "LegalDocument", "appId", &id, BY_ORDER).await?);
    Ok(app)
}

/// `GET /api/legal/apps`
pub async fn legal_apps(State(state): State<AppState>, headers: axum::http::HeaderMap) -> Response {
    let result = async {
        let mut out = vec![];
        for app in pages::client_rows(&state.db, "LegalApp", r#"ORDER BY "createdAt" DESC"#).await? {
            out.push(legal_app_with_docs(&state, app).await?);
        }
        Ok(Some(Value::Array(out)))
    };
    legal_admin(&state, &headers, result, "").await
}

/// `GET /api/legal/apps/{id}`
pub async fn legal_app(State(state): State<AppState>, headers: axum::http::HeaderMap, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    let result = async {
        Ok(match row_by_id(&state, "LegalApp", &id).await? {
            Some(app) => Some(legal_app_with_docs(&state, app).await?),
            None => None,
        })
    };
    legal_admin(&state, &headers, result, "Legal app not found.").await
}

/// `GET /api/legal/documents/{id}`: the document with its `app`.
pub async fn legal_document(State(state): State<AppState>, headers: axum::http::HeaderMap, axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    let result = async {
        let Some(mut doc) = row_by_id(&state, "LegalDocument", &id).await? else { return Ok(None) };
        let app_id = doc["appId"].as_str().unwrap_or_default().to_string();
        doc["app"] = row_by_id(&state, "LegalApp", &app_id).await?.unwrap_or(Value::Null);
        Ok(Some(doc))
    };
    legal_admin(&state, &headers, result, "Legal page not found.").await
}

fn plain(status: StatusCode, body: &'static str) -> Response {
    (status, [(header::CONTENT_TYPE, "text/plain;charset=UTF-8")], body).into_response()
}

/// `GET /api/resume`: the uploaded PDF stored as a data URI in the config.
pub async fn resume(State(state): State<AppState>) -> Response {
    let config = match pages::try_singleton(&state.db, "Config", false).await {
        Ok(c) => c,
        Err(err) => {
            log_error("/api/resume", &err);
            return plain(StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error");
        }
    };
    let r = &config["resume"];
    let Some(uri) = r["value"].as_str().filter(|v| r["type"] == "file" && !v.is_empty()) else {
        return plain(StatusCode::NOT_FOUND, "Resume not found");
    };
    let parts: Vec<&str> = uri.split(',').collect();
    if parts.len() != 2 {
        return plain(StatusCode::INTERNAL_SERVER_ERROR, "Invalid resume data");
    }
    // `/:(.*?);/` on the prefix.
    let mime = parts[0].split_once(':').and_then(|(_, rest)| rest.split_once(';')).map_or("application/pdf", |(m, _)| m);
    let filename = r["filename"].as_str().filter(|f| !f.is_empty()).unwrap_or("resume");
    let body = node_base64(parts[1]);
    let mut res = body.into_response();
    let h = res.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_str(mime).unwrap_or(HeaderValue::from_static("application/pdf")));
    if let Ok(v) = HeaderValue::from_str(&format!("inline; filename=\"{filename}\"")) {
        h.insert(header::CONTENT_DISPOSITION, v);
    }
    res
}

/// `GET /api/favicon`: the custom favicon from the config, cached forever.
pub async fn favicon(State(state): State<AppState>) -> Response {
    let config = match pages::try_singleton(&state.db, "Config", false).await {
        Ok(c) => c,
        Err(err) => {
            log_error("/api/favicon", &err);
            return plain(StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error");
        }
    };
    let f = &config["favicon"];
    let Some(value) = f["value"].as_str().filter(|v| !v.is_empty()) else { return plain(StatusCode::NOT_FOUND, "Not found") };
    let data = value.rsplit(";base64,").next().unwrap_or(value);
    let mime = f["mimeType"].as_str().filter(|m| !m.is_empty()).unwrap_or("image/x-icon");
    let mut res = node_base64(data).into_response();
    let h = res.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_str(mime).unwrap_or(HeaderValue::from_static("image/x-icon")));
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=31536000, immutable"));
    res
}

/// `Buffer.from(s, 'base64')`: lenient, skips characters outside the alphabet and stops at the first `=`.
fn node_base64(s: &str) -> Vec<u8> {
    use base64::{Engine, alphabet, engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig}};
    const LENIENT: GeneralPurpose = GeneralPurpose::new(
        &alphabet::STANDARD,
        GeneralPurposeConfig::new().with_decode_allow_trailing_bits(true).with_decode_padding_mode(DecodePaddingMode::Indifferent),
    );
    let mut clean: String = s
        .chars()
        .take_while(|c| *c != '=')
        .filter_map(|c| match c {
            '-' => Some('+'),
            '_' => Some('/'),
            c if c.is_ascii_alphanumeric() || c == '+' || c == '/' => Some(c),
            _ => None,
        })
        .collect();
    // A dangling single char carries no full byte: Node drops it.
    if clean.len() % 4 == 1 {
        clean.pop();
    }
    LENIENT.decode(clean).unwrap_or_default()
}

#[cfg(test)]
mod base64_tests {
    #[test]
    fn node_base64_is_lenient() {
        assert_eq!(super::node_base64("aGVsbG8="), b"hello");
        assert_eq!(super::node_base64("aGVs\nbG8"), b"hello");
        assert_eq!(super::node_base64("aGVsbG8x="), b"hello1");
        assert_eq!(super::node_base64("aGVsbG8xY"), b"hello1");
    }
}
