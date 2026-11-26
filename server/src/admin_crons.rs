//! `/api/admin/crons`: the scheduled tasks, their secrets, logs, the template preview and "run now".

use axum::{
    extract::{Path, RawQuery, Request, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use chrono::Utc;
use serde_json::{Map, Value, json};

use crate::{
    AppState,
    admin_settings::failure,
    api::{json_status, log_error, query_map, signed_in, truthy},
    cron,
    cron_jobs,
    cron_template::{Context, Env},
    pages,
    site_api::js_string,
    write::{self, Kind::*, Singleton, Table},
};

const CRON: Table = Table {
    name: "Cron",
    columns: &[
        ("name", Text), ("type", Text), ("schedule", Text), ("enabled", Bool), ("action", Text), ("webhookUrl", OptText),
        ("webhookUrlType", Text), ("webhookMethod", Text), ("webhookHeaders", Json), ("webhookHeadersType", Text),
        ("webhookBody", OptText), ("webhookBodyType", Text), ("webhookEnv", Json), ("nextRun", OptDate),
        ("notificationEnabled", Bool), ("notificationOn", Text), ("retryEnabled", Bool), ("retryType", Text),
        ("retryCount", Int), ("retryDelay", Int),
    ],
    created_at: true,
    updated_at: true,
};
const CRON_ENV: Singleton = Singleton { table: "CronEnv", timestamps: true, secrets: &[] };
const MAX_PREVIEW: usize = 50_000;

fn refused() -> Response {
    json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }))
}

fn ok(value: Value) -> Response {
    json_status(StatusCode::OK, value)
}

fn failed(route: &str, err: anyhow::Error) -> Response {
    log_error(route, &err);
    failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
}

fn dynamic(value: &Value) -> bool {
    match value {
        Value::Array(items) => items.iter().any(dynamic),
        Value::Object(map) => map.values().any(dynamic),
        Value::String(s) => s.contains('$'),
        _ => false,
    }
}

/// `resolveTemplateMode`
fn mode(declared: &Value, value: &Value) -> Value {
    if declared == "expression" || dynamic(value) { "expression".into() } else { "fixed".into() }
}

/// `[{ key, value }]` with each value passed through `convert`; an error when it is not a list of objects.
fn secrets_list(list: &Value, convert: impl Fn(&str) -> Option<String>) -> anyhow::Result<Value> {
    if !truthy(list) {
        return Ok(json!([]));
    }
    let Some(items) = list.as_array() else { anyhow::bail!("environment variables must be a list") };
    let converted = items
        .iter()
        .map(|item| {
            anyhow::ensure!(!item.is_null(), "environment variables must be objects");
            let value = if truthy(&item["value"]) { convert(&js_string(&item["value"])).map_or(Value::Null, Value::String) } else { "".into() };
            let mut out = Map::new();
            if let Some(key) = item.get("key") {
                out.insert("key".into(), key.clone());
            }
            out.insert("value".into(), value);
            Ok(Value::Object(out))
        })
        .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(converted.into())
}

fn sealed(state: &AppState, list: &Value) -> anyhow::Result<Value> {
    secrets_list(list, |v| state.cipher.encrypt(v))
}

/// A job as the admin sees it, secrets opened.
fn shown(state: &AppState, mut job: Value) -> Value {
    if job["webhookEnv"].is_array() {
        job["webhookEnv"] = secrets_list(&job["webhookEnv"], |v| state.cipher.decrypt(v)).unwrap_or_else(|_| json!([]));
    }
    job
}

async fn body_of(state: &AppState, req: Request) -> Result<Option<Value>, Response> {
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await {
        return Err(refused());
    }
    Ok(write::json_body(body).await.filter(|b| !b.is_null()))
}

/// `GET /api/admin/crons`
pub async fn list(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let result = async {
        cron_jobs::heal_next_runs(&state).await?;
        let jobs = pages::client_rows(&state.db, "Cron", r#"ORDER BY type ASC, "createdAt" DESC"#).await?;
        anyhow::Ok(json!({ "success": true, "data": jobs.into_iter().map(|j| shown(&state, j)).collect::<Vec<_>>() }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/crons", err))
}

fn valid_expression(schedule: &str) -> bool {
    schedule.split_whitespace().count() == 5
}

/// `POST /api/admin/crons`: a new webhook job.
pub async fn create(State(state): State<AppState>, req: Request) -> Response {
    let body = match body_of(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body"),
        Err(reply) => return reply,
    };
    if !truthy(&body["name"]) || !truthy(&body["schedule"]) || !truthy(&body["webhookUrl"]) {
        return failure(StatusCode::BAD_REQUEST, "Name, schedule (cron expression), and Webhook URL are required.");
    }
    let Some(schedule) = body["schedule"].as_str() else { return failure(StatusCode::INTERNAL_SERVER_ERROR, "schedule must be a string") };
    if !valid_expression(schedule) {
        return failure(StatusCode::BAD_REQUEST, "Invalid cron expression. Must have exactly 5 fields (minute hour day-of-month month day-of-week).");
    }
    let result: anyhow::Result<Value> = async {
        let or = |key: &str, fallback: Value| body.get(key).cloned().unwrap_or(fallback);
        let either = |key: &str, fallback: Value| if truthy(&body[key]) { body[key].clone() } else { fallback };
        let next = cron::next_run(schedule, Utc::now(), cron_jobs::zone(&state).await);
        let headers = either("webhookHeaders", json!([]));
        let url = body["webhookUrl"].clone();
        let hook = or("webhookBody", "".into());
        let doc = json!({
            "name": body["name"], "type": "user", "schedule": schedule, "enabled": true, "action": "webhook",
            "webhookUrl": url, "webhookUrlType": mode(&body["webhookUrlType"], &url),
            "webhookMethod": or("webhookMethod", "POST".into()), "webhookHeaders": headers,
            "webhookHeadersType": mode(&body["webhookHeadersType"], &headers), "webhookBody": hook,
            "webhookBodyType": mode(&body["webhookBodyType"], &hook), "webhookEnv": sealed(&state, &body["webhookEnv"])?,
            "nextRun": next.map(|t| t.to_rfc3339()), "notificationEnabled": either("notificationEnabled", false.into()),
            "notificationOn": either("notificationOn", "always".into()), "retryEnabled": or("retryEnabled", false.into()),
            "retryType": or("retryType", "stable".into()), "retryCount": or("retryCount", 3.into()),
            "retryDelay": or("retryDelay", 60.into()),
        });
        let job = write::insert(&state.db, &CRON, write::prepare(&CRON, &doc)?).await?;
        Ok(json!({ "success": true, "data": shown(&state, job) }))
    }
    .await;
    result.map(|v| json_status(StatusCode::CREATED, v)).unwrap_or_else(|err| failed("/api/admin/crons", err))
}

const NOT_FOUND: &str = "Cron job not found.";

/// The changes an update makes to `existing`.
fn changes(state: &AppState, existing: &Value, body: &Value, zone: chrono_tz::Tz) -> anyhow::Result<Result<Map<String, Value>, &'static str>> {
    let mut data = Map::new();
    let next = |schedule: &str| cron::next_run(schedule, Utc::now(), zone).map_or(Value::Null, |t| t.to_rfc3339().into());
    let mut effective = existing["schedule"].as_str().unwrap_or("").to_string();
    if truthy(&body["schedule"]) && body["schedule"] != existing["schedule"] {
        let Some(schedule) = body["schedule"].as_str() else { anyhow::bail!("schedule must be a string") };
        if !valid_expression(schedule) {
            return Ok(Err("Invalid cron expression. Must have exactly 5 fields."));
        }
        data.insert("schedule".into(), schedule.into());
        data.insert("nextRun".into(), next(schedule));
        effective = schedule.to_string();
    }
    let user = existing["type"] == "user";
    if user && truthy(&body["name"]) {
        data.insert("name".into(), body["name"].clone());
    }
    if let Some(enabled) = body.get("enabled") {
        data.insert("enabled".into(), enabled.clone());
        data.insert("nextRun".into(), if truthy(enabled) { next(&effective) } else { Value::Null });
    }
    for key in ["notificationEnabled", "notificationOn", "retryEnabled", "retryType", "retryCount", "retryDelay"] {
        if let Some(v) = body.get(key) {
            data.insert(key.into(), v.clone());
        }
    }
    if !user {
        return Ok(Ok(data));
    }
    for key in ["webhookUrl", "webhookMethod"] {
        if truthy(&body[key]) {
            data.insert(key.into(), body[key].clone());
        }
    }
    for key in ["webhookHeaders", "webhookBody"] {
        if let Some(v) = body.get(key) {
            data.insert(key.into(), v.clone());
        }
    }
    for (kind, key) in [("webhookUrlType", "webhookUrl"), ("webhookHeadersType", "webhookHeaders"), ("webhookBodyType", "webhookBody")] {
        if body.get(kind).is_some() || body.get(key).is_some() {
            let value = body.get(key).filter(|v| !v.is_null()).unwrap_or(&existing[key]);
            data.insert(kind.into(), mode(&body[kind], value));
        }
    }
    if let Some(env) = body.get("webhookEnv") {
        data.insert("webhookEnv".into(), sealed(state, env)?);
    }
    Ok(Ok(data))
}

/// `PUT /api/admin/crons/{id}`
pub async fn update(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let body = match body_of(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body"),
        Err(reply) => return reply,
    };
    let result: anyhow::Result<Response> = async {
        let zone = cron_jobs::zone(&state).await;
        let Some(existing) = write::find(&state.db, CRON.name, &id).await? else { return Ok(failure(StatusCode::NOT_FOUND, NOT_FOUND)) };
        let data = match changes(&state, &existing, &body, zone)? {
            Ok(data) => data,
            Err(message) => return Ok(failure(StatusCode::BAD_REQUEST, message)),
        };
        let data = write::prepare(&CRON, &Value::Object(data))?;
        Ok(match write::update(&state.db, &CRON, &id, data).await? {
            Some(job) => ok(json!({ "success": true, "data": shown(&state, job) })),
            None => failure(StatusCode::NOT_FOUND, NOT_FOUND),
        })
    }
    .await;
    result.unwrap_or_else(|err| failed("/api/admin/crons/{id}", err))
}

/// `DELETE /api/admin/crons/{id}`
pub async fn delete(State(state): State<AppState>, Path(id): Path<String>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let result: anyhow::Result<Response> = async {
        let Some(job) = write::find(&state.db, CRON.name, &id).await? else { return Ok(failure(StatusCode::NOT_FOUND, NOT_FOUND)) };
        if job["type"] == "system" {
            return Ok(failure(StatusCode::FORBIDDEN, "System defined tasks cannot be deleted."));
        }
        write::delete(&state.db, CRON.name, &id).await?;
        Ok(ok(json!({ "success": true, "message": "Cron job deleted successfully." })))
    }
    .await;
    result.unwrap_or_else(|err| failed("/api/admin/crons/{id}", err))
}

/// `POST /api/admin/crons/{id}/run`: run now and answer with the job's new state.
pub async fn run(State(state): State<AppState>, Path(id): Path<String>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let result: anyhow::Result<Response> = async {
        let Some(job) = cron_jobs::find(&state, &id).await? else { return Ok(failure(StatusCode::NOT_FOUND, NOT_FOUND)) };
        tracing::info!(job = %job.name, "cron job started by the admin");
        // Its own task: closing the page must not stop a backup half way.
        let background = state.clone();
        tokio::spawn(async move { cron_jobs::execute(&background, &job).await }).await?;
        // The stored job as it is: secrets stay sealed.
        let updated = write::find(&state.db, CRON.name, &id).await?;
        Ok(ok(json!({ "success": true, "message": "Cron job executed successfully.", "data": updated })))
    }
    .await;
    result.unwrap_or_else(|err| failed("/api/admin/crons/{id}/run", err))
}

// ── secrets ────────────────────────────────────────────────────────────────────────────────────────────

fn env_reply(state: &AppState, stored: &Value) -> anyhow::Result<Value> {
    Ok(json!({ "success": true, "data": secrets_list(&stored["env"], |v| state.cipher.decrypt(v))? }))
}

/// `GET /api/admin/crons/env`
pub async fn env(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let result = async {
        let mut stored = pages::try_singleton(&state.db, CRON_ENV.table, true).await?;
        if stored.is_null() {
            stored = write::upsert_singleton(&state.db, &CRON_ENV, &Map::from_iter([("env".to_string(), json!([]))])).await?;
        }
        env_reply(&state, &stored)
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/crons/env", err))
}

/// `POST /api/admin/crons/env`
pub async fn save_env(State(state): State<AppState>, req: Request) -> Response {
    let body = match body_of(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body"),
        Err(reply) => return reply,
    };
    let result = async {
        let patch = Map::from_iter([("env".to_string(), sealed(&state, &body["env"])?)]);
        let stored = write::upsert_singleton(&state.db, &CRON_ENV, &patch).await?;
        env_reply(&state, &stored)
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/crons/env", err))
}

// ── logs and preview ───────────────────────────────────────────────────────────────────────────────────

/// `GET /api/admin/crons/logs?page=&limit=&status=&cronId=&search=`
pub async fn logs(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let params = query_map(&q);
    let text = |k: &str| params.get(k).cloned().unwrap_or_default();
    let number = |k: &str, fallback: i64| params.get(k).filter(|v| !v.is_empty()).and_then(|v| write::parse_int(&v.as_str().into())).unwrap_or(fallback);
    let (page, limit) = (number("page", 1).clamp(1, 1_000_000), number("limit", 10).clamp(1, 50));
    let status = Some(text("status")).filter(|s| s == "success" || s == "failure").unwrap_or_default();
    let cron_id = text("cronId");
    let term = text("search").trim().to_string();
    let pattern = format!("%{}%", term.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));
    const WHERE: &str = r#"WHERE ($1 = '' OR status = $1) AND ($2 = '' OR "cronId" = $2)
        AND ($3 = '' OR "cronName" ILIKE $4 OR url ILIKE $4 OR log ILIKE $4)"#;
    let result: anyhow::Result<Value> = async {
        let sql = format!(r#"SELECT row_to_json(t)::text FROM "CronLog" t {WHERE} ORDER BY "ranAt" DESC LIMIT $5 OFFSET $6"#);
        let rows: Vec<String> = sqlx::query_scalar(&sql)
            .bind(&status)
            .bind(&cron_id)
            .bind(&term)
            .bind(&pattern)
            .bind(limit)
            .bind((page - 1) * limit)
            .fetch_all(&state.db)
            .await?;
        let data = rows.iter().map(|raw| Ok(pages::to_client_row(serde_json::from_str(raw)?))).collect::<anyhow::Result<Vec<Value>>>()?;
        let total: i64 = sqlx::query_scalar(&format!(r#"SELECT count(*) FROM "CronLog" {WHERE}"#))
            .bind(&status)
            .bind(&cron_id)
            .bind(&term)
            .bind(&pattern)
            .fetch_one(&state.db)
            .await?;
        let pages = ((total + limit - 1) / limit).max(1);
        Ok(json!({ "success": true, "data": data, "pagination": { "page": page, "limit": limit, "total": total, "totalPages": pages } }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/crons/logs", err))
}

/// The preview cut to its first 50 000 UTF-16 units.
fn cut(text: String) -> String {
    let mut units = 0;
    match text.char_indices().find(|(_, c)| {
        units += c.len_utf16();
        units > MAX_PREVIEW
    }) {
        Some((at, _)) => format!("{}\n\n…[preview truncated — output exceeds 50,000 chars; full data is resolved at run time]", &text[..at]),
        None => text,
    }
}

/// `POST /api/admin/crons/preview`: what a template would send, with secrets hidden.
pub async fn preview(State(state): State<AppState>, req: Request) -> Response {
    let body = match body_of(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body"),
        Err(reply) => return reply,
    };
    let rows = std::env::var("CRON_PREVIEW_ROWS").ok().and_then(|v| v.parse().ok()).filter(|n| *n > 0).unwrap_or(20);
    let mut context = Context::new(&state, Env::Preview, rows);
    let compiled = match body.get("template") {
        Some(Value::String(s)) => context.compile(s).await,
        Some(v @ (Value::Object(_) | Value::Array(_) | Value::Null)) => Some(context.compile_value(v).await),
        Some(v) if truthy(v) => Some(v.clone()),
        _ => Some("".into()),
    };
    let shown = match compiled {
        Some(v @ (Value::Object(_) | Value::Array(_) | Value::Null)) => match serde_json::to_string_pretty(&v) {
            Ok(text) => text,
            Err(err) => return failed("/api/admin/crons/preview", err.into()),
        },
        Some(v) => js_string(&v),
        None => "undefined".into(),
    };
    ok(json!({ "success": true, "data": cut(shown) }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn template_mode_is_detected() {
        assert_eq!(mode(&json!("fixed"), &json!([{ "value": "$time" }])), "expression");
        assert_eq!(mode(&Value::Null, &json!("plain")), "fixed");
        assert_eq!(mode(&json!("expression"), &Value::Null), "expression");
    }

    #[test]
    fn secret_lists_keep_keys() {
        let out = secrets_list(&json!([{ "key": "a", "value": "x" }, { "value": "" }]), |v| Some(format!("<{v}>"))).unwrap();
        assert_eq!(out, json!([{ "key": "a", "value": "<x>" }, { "value": "" }]));
        assert!(secrets_list(&json!("no"), |_| None).is_err() && secrets_list(&json!([null]), |_| None).is_err());
        assert_eq!(secrets_list(&Value::Null, |_| None).unwrap(), json!([]));
    }

    #[test]
    fn previews_are_cut() {
        assert!(cut("a".repeat(60_000)).starts_with(&"a".repeat(50_000)));
        assert!(cut("a".repeat(60_000)).ends_with("run time]"));
        assert_eq!(cut("short".into()), "short");
    }
}
