//! The admin settings routes under `/api/admin`: ads, social metadata, SEO, notifications, API tokens, the MCP
//! config, the cron time zone and the extra uptime targets.

use crate::db::{Stamp};
use axum::{
    extract::{RawQuery, Request, State},
    http::{HeaderMap, StatusCode, request::Parts},
    response::Response,
};
use chrono::{SecondsFormat, Utc};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};

use crate::{
    AppState,
    api::{json_status, log_error, query_map, signed_in, truthy},
    auth, cron, pages, seo,
    site_api::{js_string, mcp_card, merge_mcp_config},
    write::{self, Kind, Singleton, Table},
};

const ADS: Singleton = Singleton { table: "Ads", timestamps: true, secrets: &[] };
const SEO: Singleton = Singleton { table: "SeoConfig", timestamps: false, secrets: &["encryptedGoogleServiceAccount"] };
const NOTIFICATIONS: Singleton = Singleton { table: "NotificationConfig", timestamps: true, secrets: &[] };
const MCP: Singleton = Singleton { table: "McpConfig", timestamps: true, secrets: &["mcpTokenHash"] };

const UPTIME_TARGET: Table = Table {
    name: "UptimeTarget",
    columns: &[("label", Kind::Text), ("url", Kind::Text), ("enabled", Kind::Bool)],
    created_at: true,
    updated_at: false,
};

const PLACEMENTS: [&str; 5] = ["top", "middle", "bottom", "sidebar", "footer"];

fn ok(value: Value) -> Response {
    json_status(StatusCode::OK, value)
}

/// `{ error }`, the shape of the ads route.
fn plain(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "error": message }))
}

/// `{ success: false, error }`
pub(crate) fn failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "success": false, "error": message }))
}

pub(crate) fn unauthorized() -> Response {
    failure(StatusCode::UNAUTHORIZED, "Unauthorized")
}

/// The refusal of `withAuth` in src/middleware/auth.js.
pub(crate) fn unauthorized_with_message() -> Response {
    json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }))
}

/// A database or input error: logged, and reported with its text.
pub(crate) fn failed(route: &str, status: StatusCode, err: anyhow::Error) -> Response {
    log_error(route, &err);
    failure(status, &err.to_string())
}

pub(crate) fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn object(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(m) => m,
        _ => Map::new(),
    }
}

/// Session check, then `await request.json()` (None when the body is not JSON).
async fn admin_body(state: &AppState, req: Request) -> Option<(Parts, Option<Value>)> {
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await {
        return None;
    }
    Some((parts, write::json_body(body).await))
}

// ── ads ────────────────────────────────────────────────────────────────────────────────────────────────

/// `GET /api/admin/ads`: the stored document with the ids decrypted.
pub async fn ads(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return plain(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let result: anyhow::Result<Value> = async {
        let mut config = pages::try_singleton(&state.db, ADS.table, true).await?;
        if config.is_null() {
            config = write::upsert_singleton(&state.db, &ADS, &Map::new()).await?;
        }
        let open = |v: &Value| v.as_str().and_then(|s| state.cipher.decrypt(s)).unwrap_or_default();
        let or = |v: &Value, fallback: Value| if truthy(v) { v.clone() } else { fallback };
        let placements: Map<String, Value> = PLACEMENTS
            .iter()
            .map(|&key| {
                let p = &config["placements"][key];
                let shown = json!({
                    "enabled": or(&p["enabled"], false.into()),
                    "slotId": open(&p["encryptedSlotId"]),
                    "adType": or(&p["adType"], "display".into()),
                    "adLayoutKey": or(&p["adLayoutKey"], "".into()),
                });
                (key.to_string(), shown)
            })
            .collect();
        Ok(json!({
            "adsenseEnabled": or(&config["adsenseEnabled"], false.into()),
            "clientId": open(&config["encryptedClientId"]),
            "adsTxt": or(&config["adsTxt"], "".into()),
            "placements": placements,
        }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| {
        log_error("/api/admin/ads", &err);
        plain(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch ads configuration")
    })
}

/// `PUT /api/admin/ads`
pub async fn put_ads(State(state): State<AppState>, req: Request) -> Response {
    const FAILED: &str = "Failed to update ads configuration";
    let Some((_, body)) = admin_body(&state, req).await else { return plain(StatusCode::UNAUTHORIZED, "Unauthorized") };
    let Some(body) = body.filter(|b| !b.is_null()) else { return plain(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    let result: anyhow::Result<()> = async {
        // `encrypt(value)`: null for a falsy value; Node's cipher refuses anything but a string.
        let seal = |v: &Value| -> anyhow::Result<Value> {
            if !truthy(v) {
                return Ok(Value::Null);
            }
            let Some(text) = v.as_str() else { anyhow::bail!("ad ids must be strings") };
            Ok(state.cipher.encrypt(text).map_or(Value::Null, Value::String))
        };
        let mut patch = Map::new();
        patch.insert("adsenseEnabled".into(), truthy(&body["adsenseEnabled"]).into());
        patch.insert("adsTxt".into(), body.get("adsTxt").map(js_string).unwrap_or_default().into());
        if let Some(id) = body.get("clientId") {
            patch.insert("encryptedClientId".into(), seal(id)?);
        }
        if truthy(&body["placements"]) {
            let mut placements = Map::new();
            for key in PLACEMENTS {
                let p = &body["placements"][key];
                if !truthy(p) {
                    continue;
                }
                let or = |v: &Value, fallback: &str| if truthy(v) { v.clone() } else { fallback.into() };
                let mut out = object(json!({
                    "enabled": truthy(&p["enabled"]),
                    "adType": or(&p["adType"], "display"),
                    "adLayoutKey": or(&p["adLayoutKey"], ""),
                }));
                if let Some(slot) = p.get("slotId") {
                    out.insert("encryptedSlotId".into(), seal(slot)?);
                }
                placements.insert(key.into(), Value::Object(out));
            }
            patch.insert("placements".into(), Value::Object(placements));
        }
        write::upsert_singleton(&state.db, &ADS, &patch).await?;
        Ok(())
    }
    .await;
    match result {
        Ok(()) => ok(json!({ "success": true })),
        Err(err) => {
            log_error("/api/admin/ads", &err);
            plain(StatusCode::INTERNAL_SERVER_ERROR, FAILED)
        }
    }
}

// ── social metadata ────────────────────────────────────────────────────────────────────────────────────

/// `GET /api/admin/social`
pub async fn social(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    // getSocialMeta never throws: a database error shows the defaults.
    let stored = pages::singleton(&state.db, SEO.table, false).await;
    ok(json!({ "success": true, "social": seo::merge_social_meta(&stored["social"]) }))
}

/// `PUT /api/admin/social`
pub async fn put_social(State(state): State<AppState>, req: Request) -> Response {
    let Some((_, body)) = admin_body(&state, req).await else { return unauthorized() };
    let Some(body) = body else { return failure(StatusCode::BAD_REQUEST, "Invalid JSON body") };
    let input = body.get("social").filter(|v| !v.is_null()).unwrap_or(&body);
    let clean = seo::merge_social_meta(input);
    let patch = object(json!({ "social": clean.clone() }));
    if let Err(err) = write::upsert_singleton(&state.db, &SEO, &patch).await {
        return failed("/api/admin/social", StatusCode::BAD_REQUEST, err);
    }
    ok(json!({ "success": true, "social": clean }))
}

// ── SEO ────────────────────────────────────────────────────────────────────────────────────────────────

/// The merged config and whether a Google service account is stored (never the key itself).
async fn seo_state(state: &AppState) -> anyhow::Result<(Value, Value)> {
    let stored = pages::singleton(&state.db, SEO.table, false).await;
    let sealed: Option<Option<String>> =
        sqlx::query_scalar(r#"SELECT "encryptedGoogleServiceAccount" FROM "SeoConfig" LIMIT 1"#).fetch_optional(&state.db).await?;
    let status = match sealed.flatten().filter(|s| !s.is_empty()) {
        None => json!({ "hasServiceAccount": false, "email": "" }),
        Some(sealed) => {
            let raw = state.cipher.decrypt(&sealed).map_or(Value::Null, Value::String);
            match seo::service_account_email(&raw) {
                Ok(email) => json!({ "hasServiceAccount": true, "email": email }),
                Err(_) => json!({ "hasServiceAccount": true, "email": "", "invalid": true }),
            }
        }
    };
    Ok((seo::merge_seo_config(&stored), status))
}

/// `GET /api/admin/seo/config`
pub async fn seo_config(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result: anyhow::Result<Value> = async {
        let (config, status) = seo_state(&state).await?;
        let logs = pages::client_rows(&state.db, "IndexingLog", r#"ORDER BY "createdAt" DESC LIMIT 25"#).await?;
        Ok(json!({ "success": true, "config": config, "serviceAccount": status, "logs": logs }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/seo/config", StatusCode::INTERNAL_SERVER_ERROR, err))
}

/// `PUT /api/admin/seo/config`
pub async fn put_seo_config(State(state): State<AppState>, req: Request) -> Response {
    let Some((_, body)) = admin_body(&state, req).await else { return unauthorized() };
    let Some(body) = body.filter(|b| !b.is_null()) else { return failure(StatusCode::BAD_REQUEST, "Invalid JSON body") };
    let mut patch = Map::new();
    for key in ["robots", "sitemap", "indexing"] {
        if let Some(v) = body.get(key) {
            patch.insert(key.into(), v.clone());
        }
    }
    // A JSON string (or object) sets the key, '' or null clears it, absent leaves it.
    if let Some(account) = body.get("serviceAccount") {
        let sealed = if account.is_null() || account == "" {
            Value::Null
        } else {
            if let Err(message) = seo::service_account_email(account) {
                return failure(StatusCode::BAD_REQUEST, &message);
            }
            let raw = account.as_str().map(str::to_string).unwrap_or_else(|| account.to_string());
            state.cipher.encrypt(&raw).map_or(Value::Null, Value::String)
        };
        patch.insert("encryptedGoogleServiceAccount".into(), sealed);
    }
    let result: anyhow::Result<Value> = async {
        write::upsert_singleton(&state.db, &SEO, &patch).await?;
        let (config, status) = seo_state(&state).await?;
        Ok(json!({ "success": true, "config": config, "serviceAccount": status }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/seo/config", StatusCode::BAD_REQUEST, err))
}

// ── notifications ──────────────────────────────────────────────────────────────────────────────────────

fn default_notifications() -> Value {
    json!({
        "enabled": false,
        "ntfy": { "enabled": false, "serverUrl": "https://ntfy.sh", "topic": "", "token": "" },
        "telegram": { "enabled": false, "botToken": "", "chatId": "" },
        "discord": { "enabled": false, "webhookUrl": "" },
        "notifyOnContactMessage": false,
    })
}

/// `GET /api/admin/notifications`
pub async fn notifications(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized_with_message();
    }
    let result: anyhow::Result<Value> = async {
        let mut config = pages::try_singleton(&state.db, NOTIFICATIONS.table, true).await?;
        if config.is_null() {
            config = write::upsert_singleton(&state.db, &NOTIFICATIONS, &object(default_notifications())).await?;
        }
        Ok(json!({ "success": true, "data": config }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/notifications", StatusCode::INTERNAL_SERVER_ERROR, err))
}

/// The stored settings with `body`'s known fields laid over them.
fn merge_notifications(current: Value, body: &Value) -> Map<String, Value> {
    let defaults = default_notifications();
    let mut merged = object(current);
    let channels: [(&str, &[&str]); 3] = [
        ("ntfy", &["enabled", "serverUrl", "topic", "token"]),
        ("telegram", &["enabled", "botToken", "chatId"]),
        ("discord", &["enabled", "webhookUrl"]),
    ];
    for (channel, fields) in channels {
        let mut settings = object(defaults[channel].clone());
        settings.extend(object(merged.get(channel).cloned().unwrap_or_default()));
        for &field in fields {
            if let Some(v) = body[channel].get(field) {
                settings.insert(field.into(), v.clone());
            }
        }
        merged.insert(channel.into(), Value::Object(settings));
    }
    for key in ["enabled", "notifyOnContactMessage"] {
        if let Some(v) = body.get(key) {
            merged.insert(key.into(), v.clone());
        }
    }
    merged
}

/// `PUT /api/admin/notifications`
pub async fn put_notifications(State(state): State<AppState>, req: Request) -> Response {
    let Some((_, body)) = admin_body(&state, req).await else { return unauthorized_with_message() };
    let Some(body) = body.filter(|b| !b.is_null()) else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body");
    };
    let result: anyhow::Result<Value> = async {
        let current = match pages::try_singleton(&state.db, NOTIFICATIONS.table, true).await? {
            Value::Null => default_notifications(),
            stored => stored,
        };
        let config = write::upsert_singleton(&state.db, &NOTIFICATIONS, &merge_notifications(current, &body)).await?;
        Ok(json!({ "success": true, "data": config }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/notifications", StatusCode::INTERNAL_SERVER_ERROR, err))
}

// ── API tokens ─────────────────────────────────────────────────────────────────────────────────────────

/// A new bearer token, `<prefix>_<64 hex>`, with the hash and last four characters that get stored.
fn new_token(prefix: &str) -> (String, String, String) {
    let secret: [u8; 32] = rand::random();
    let token = format!("{prefix}_{}", hex::encode(secret));
    let hash = hex::encode(Sha256::digest(token.as_bytes()));
    let last4 = token[token.len() - 4..].to_string();
    (token, hash, last4)
}

/// `GET /api/admin/blogs/token`
pub async fn blog_token(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result: anyhow::Result<Value> = async {
        let config = pages::try_singleton(&state.db, "Config", false).await?;
        let hash: Option<Option<String>> = sqlx::query_scalar(r#"SELECT "blogApiTokenHash" FROM "Config" LIMIT 1"#).fetch_optional(&state.db).await?;
        let or = |v: &Value, fallback: Value| if truthy(v) { v.clone() } else { fallback };
        Ok(json!({ "success": true, "data": {
            "hasToken": hash.flatten().is_some_and(|h| !h.is_empty()),
            "last4": or(&config["blogApiTokenLast4"], "".into()),
            "createdAt": or(&config["blogApiTokenCreatedAt"], Value::Null),
        } }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| {
        log_error("/api/admin/blogs/token", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch token status")
    })
}

async fn store_blog_token(state: &AppState, hash: &str, last4: &str, created: Value) -> anyhow::Result<()> {
    let patch = object(json!({ "blogApiTokenHash": hash, "blogApiTokenLast4": last4, "blogApiTokenCreatedAt": created }));
    write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &patch).await?;
    Ok(())
}

/// `POST /api/admin/blogs/token`: a new token, shown this once.
pub async fn create_blog_token(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let (token, hash, last4) = new_token("blg");
    if let Err(err) = store_blog_token(&state, &hash, &last4, now_iso().into()).await {
        log_error("/api/admin/blogs/token", &err);
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to generate token");
    }
    ok(json!({ "success": true, "data": { "token": token, "createdAt": now_iso(), "last4": last4 } }))
}

/// `DELETE /api/admin/blogs/token`
pub async fn delete_blog_token(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    if let Err(err) = store_blog_token(&state, "", "", Value::Null).await {
        log_error("/api/admin/blogs/token", &err);
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to revoke token");
    }
    ok(json!({ "success": true }))
}

/// The MCP config row's id and token columns.
async fn mcp_row(state: &AppState) -> anyhow::Result<Option<(String, Option<String>, String, Option<Stamp>)>> {
    Ok(sqlx::query_as(r#"SELECT id, "mcpTokenHash", "mcpTokenLast4", "mcpTokenUpdatedAt" FROM "McpConfig" LIMIT 1"#)
        .fetch_optional(&state.db)
        .await?)
}

/// `GET /api/admin/mcp/token`
pub async fn mcp_token(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    match mcp_row(&state).await {
        Ok(row) => {
            let (_, hash, last4, updated) = row.unwrap_or_default();
            let updated = updated.map(|t| t.0.and_utc().to_rfc3339_opts(SecondsFormat::Millis, true));
            ok(json!({ "success": true, "data": { "hasToken": hash.is_some_and(|h| !h.is_empty()), "last4": last4, "updatedAt": updated } }))
        }
        Err(err) => {
            log_error("/api/admin/mcp/token", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch token status")
        }
    }
}

/// `POST /api/admin/mcp/token`: generate or rotate the MCP write token.
pub async fn create_mcp_token(State(state): State<AppState>, req: Request) -> Response {
    let (parts, _) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized();
    }
    let (token, hash, last4) = new_token("mcp");
    let now = Utc::now();
    let result: anyhow::Result<bool> = async {
        let row = mcp_row(&state).await?;
        let sql = match &row {
            Some(_) => r#"UPDATE "McpConfig" SET "mcpTokenHash" = $1, "mcpTokenLast4" = $2, "mcpTokenUpdatedAt" = $3, "updatedAt" = $3 WHERE id = $4"#,
            None => r#"INSERT INTO "McpConfig" ("mcpTokenHash", "mcpTokenLast4", "mcpTokenUpdatedAt", "updatedAt", id, "createdAt") VALUES ($1, $2, $3, $3, $4, $3)"#,
        };
        let id = row.as_ref().map(|r| r.0.clone()).unwrap_or_else(crate::db::new_id);
        sqlx::query(sql).bind(&hash).bind(&last4).bind(Stamp(now.naive_utc())).bind(id).execute(&state.db).await?;
        Ok(row.and_then(|r| r.1).is_some_and(|h| !h.is_empty()))
    }
    .await;
    match result {
        Ok(rotated) => {
            let action = if rotated { "MCP_TOKEN_ROTATED" } else { "MCP_TOKEN_CREATED" };
            auth::audit(&state, &parts, action, "security", "MCP write token generated").await;
            ok(json!({ "success": true, "data": { "token": token, "last4": last4, "updatedAt": now.to_rfc3339_opts(SecondsFormat::Millis, true) } }))
        }
        Err(err) => {
            log_error("/api/admin/mcp/token", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to generate token")
        }
    }
}

/// `DELETE /api/admin/mcp/token`
pub async fn delete_mcp_token(State(state): State<AppState>, req: Request) -> Response {
    let (parts, _) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized();
    }
    let result: anyhow::Result<bool> = async {
        let Some((id, ..)) = mcp_row(&state).await? else { return Ok(false) };
        sqlx::query(r#"UPDATE "McpConfig" SET "mcpTokenHash" = NULL, "mcpTokenLast4" = '', "mcpTokenUpdatedAt" = NULL, "updatedAt" = $1 WHERE id = $2"#)
            .bind(Stamp(Utc::now().naive_utc()))
            .bind(id)
            .execute(&state.db)
            .await?;
        Ok(true)
    }
    .await;
    match result {
        Ok(revoked) => {
            if revoked {
                auth::audit(&state, &parts, "MCP_TOKEN_REVOKED", "security", "MCP write token revoked").await;
            }
            ok(json!({ "success": true }))
        }
        Err(err) => {
            log_error("/api/admin/mcp/token", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to revoke token")
        }
    }
}

// ── MCP config ─────────────────────────────────────────────────────────────────────────────────────────

/// The editor's reply: the merged config, the server card it publishes and the card's address.
fn mcp_payload(web: &crate::web::WebApp, stored: &Value) -> Value {
    let defaults = &web.discovery["mcpDefaults"];
    let config = merge_mcp_config(stored, defaults);
    let site = crate::web::site_url();
    let card = mcp_card(&config, defaults, &site);
    json!({ "success": true, "config": config, "card": card, "cardUrl": format!("{site}/.well-known/mcp/server-card.json") })
}

/// `GET /api/admin/mcp/config`
pub async fn mcp_config(State(state): State<AppState>, req: Request) -> Response {
    // The defaults come from the web build; without it Next answers.
    if !signed_in(&state, req.headers()).await {
        return unauthorized();
    }
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    let stored = pages::singleton(&state.db, MCP.table, true).await;
    ok(mcp_payload(&web, &stored))
}

/// `PUT /api/admin/mcp/config`: the whole document, replaced.
pub async fn put_mcp_config(State(state): State<AppState>, req: Request) -> Response {
    let Some((_, body)) = admin_body(&state, req).await else { return unauthorized() };
    let Some(web) = state.web.clone() else { return failure(StatusCode::INTERNAL_SERVER_ERROR, "web build missing") };
    let Some(body) = body else { return failure(StatusCode::BAD_REQUEST, "Invalid JSON body") };
    let normalized = object(merge_mcp_config(&body, &web.discovery["mcpDefaults"]));
    match write::upsert_singleton(&state.db, &MCP, &normalized).await {
        Ok(saved) => {
            ok(mcp_payload(&web, &saved))
        }
        Err(err) => failed("/api/admin/mcp/config", StatusCode::BAD_REQUEST, err),
    }
}

// ── cron time zone ─────────────────────────────────────────────────────────────────────────────────────

/// `GET /api/admin/crons/timezone`
pub async fn timezone(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized_with_message();
    }
    match pages::try_singleton(&state.db, "Config", false).await {
        Ok(config) => {
            let zone = &config["defaultTimezone"];
            ok(json!({ "success": true, "timezone": if truthy(zone) { zone.clone() } else { "UTC".into() } }))
        }
        Err(err) => failed("/api/admin/crons/timezone", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

/// `POST /api/admin/crons/timezone`: save the zone and move every enabled job to its next run in it.
pub async fn save_timezone(State(state): State<AppState>, req: Request) -> Response {
    let Some((_, body)) = admin_body(&state, req).await else { return unauthorized_with_message() };
    let Some(body) = body.filter(|b| !b.is_null()) else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body");
    };
    let name = &body["timezone"];
    if !truthy(name) {
        return failure(StatusCode::BAD_REQUEST, "Timezone is required.");
    }
    let Some(zone) = name.as_str().and_then(cron::zone) else {
        return failure(StatusCode::BAD_REQUEST, "Invalid timezone identifier.");
    };
    let result: anyhow::Result<()> = async {
        write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &object(json!({ "defaultTimezone": name }))).await?;
        let now = Utc::now();
        let jobs: Vec<(String, String)> = sqlx::query_as(r#"SELECT id, schedule FROM "Cron" WHERE enabled"#).fetch_all(&state.db).await?;
        for (id, schedule) in jobs {
            sqlx::query(r#"UPDATE "Cron" SET "nextRun" = $1, "updatedAt" = $2 WHERE id = $3"#)
                .bind(cron::next_run(&schedule, now, zone).map(|t| Stamp(t.naive_utc())))
                .bind(Stamp(Utc::now().naive_utc()))
                .bind(id)
                .execute(&state.db)
                .await?;
        }
        Ok(())
    }
    .await;
    match result {
        Ok(()) => ok(json!({ "success": true, "timezone": name })),
        Err(err) => failed("/api/admin/crons/timezone", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

// ── uptime targets ─────────────────────────────────────────────────────────────────────────────────────

/// `GET /api/admin/health/targets`
pub async fn targets(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    match pages::client_rows(&state.db, UPTIME_TARGET.name, r#"ORDER BY "createdAt" DESC"#).await {
        Ok(rows) => ok(json!({ "success": true, "targets": rows })),
        Err(err) => failed("/api/admin/health/targets", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

/// `POST /api/admin/health/targets`
pub async fn create_target(State(state): State<AppState>, req: Request) -> Response {
    let Some((_, body)) = admin_body(&state, req).await else { return unauthorized() };
    let Some(body) = body.filter(|b| !b.is_null()) else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body");
    };
    let text = |v: &Value| if truthy(v) { js_string(v).trim().to_string() } else { String::new() };
    let (label, url) = (text(&body["label"]), text(&body["url"]));
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return failure(StatusCode::BAD_REQUEST, "A valid http(s) URL is required.");
    }
    let label = if label.is_empty() { url.clone() } else { label };
    let data = object(json!({ "label": label, "url": url, "enabled": true }));
    match write::insert(&state.db, &UPTIME_TARGET, data).await {
        Ok(row) => ok(json!({ "success": true, "target": row })),
        Err(err) => failed("/api/admin/health/targets", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

/// `DELETE /api/admin/health/targets?id=`
pub async fn delete_target(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let Some(id) = query_map(&q).remove("id").filter(|id| !id.is_empty()) else {
        return failure(StatusCode::BAD_REQUEST, "Missing target id.");
    };
    // Next ignores a failed delete (the target may be gone already).
    if let Err(err) = write::delete(&state.db, UPTIME_TARGET.name, &id).await {
        log_error("/api/admin/health/targets", &err);
    }
    ok(json!({ "success": true, "deleted": id }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_are_prefixed_and_stored_as_their_hash() {
        let (token, hash, last4) = new_token("mcp");
        assert!(token.starts_with("mcp_") && token.len() == 68 && token.ends_with(&last4), "{token}");
        assert_eq!(hash, hex::encode(Sha256::digest(token.as_bytes())));
        assert_ne!(new_token("mcp").0, token);
    }

    #[test]
    fn notification_updates_keep_unnamed_fields() {
        let current = json!({ "enabled": false, "ntfy": { "topic": "t", "token": "s" }, "extra": 1 });
        let out = merge_notifications(current, &json!({ "enabled": true, "ntfy": { "topic": "new", "evil": 1 } }));
        assert_eq!(out["ntfy"], json!({ "enabled": false, "serverUrl": "https://ntfy.sh", "topic": "new", "token": "s" }));
        assert_eq!((out["enabled"].clone(), out["extra"].clone()), (json!(true), json!(1)));
        assert_eq!(out["discord"], json!({ "enabled": false, "webhookUrl": "" }));
    }
}
