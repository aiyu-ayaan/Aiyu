//! Shared pieces of the ported admin writes: who may write, how the body is read, the typed inserts and updates
//! Prisma did, and the side effects that still run in Next.

use axum::{
    body::Body,
    http::{HeaderMap, header},
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use hmac::{Hmac, Mac};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::time::Duration;

use crate::{AppState, db::new_id, export::INTERNAL_HEADER, pages, session::constant_time_eq, site_api::js_string};

/// Blog covers, favicons and the resume arrive as base64 inside the JSON.
const BODY_LIMIT: usize = 20 * 1024 * 1024;

// ── who may write ──────────────────────────────────────────────────────────────────────────────────────

/// `validateBearerBlogToken`: the blog API token, or the MCP write token.
pub async fn bearer(state: &AppState, headers: &HeaderMap) -> bool {
    let value = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).unwrap_or("");
    // `split(' ')` and the first two parts, as in Node.
    let mut parts = value.split(' ');
    let (scheme, token) = (parts.next().unwrap_or(""), parts.next().unwrap_or(""));
    if !scheme.eq_ignore_ascii_case("bearer") || token.is_empty() {
        return false;
    }
    let provided = hex::encode(Sha256::digest(token.trim().as_bytes()));
    let stored: Result<Vec<Option<String>>, _> = sqlx::query_scalar(
        r#"(SELECT "blogApiTokenHash" FROM "Config" LIMIT 1) UNION ALL (SELECT "mcpTokenHash" FROM "McpConfig" LIMIT 1)"#,
    )
    .fetch_all(&state.db)
    .await;
    match stored {
        Ok(hashes) => hashes.into_iter().flatten().any(|h| constant_time_eq(&h.to_ascii_lowercase(), &provided)),
        Err(err) => {
            tracing::warn!(error = %err, "token lookup failed");
            false
        }
    }
}

// ── request body ───────────────────────────────────────────────────────────────────────────────────────

/// `await request.json()`: any content type; None when the body is not JSON. Read after the auth check, so an
/// anonymous caller cannot make the server buffer a large body.
pub async fn json_body(body: Body) -> Option<Value> {
    let bytes = axum::body::to_bytes(body, BODY_LIMIT).await.ok()?;
    serde_json::from_slice(&bytes).ok()
}

// ── side effects that stay in Next ─────────────────────────────────────────────────────────────────────

pub fn hooks_key(jwt_secret: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(jwt_secret.as_bytes()).expect("any key length");
    mac.update(b"internal:hooks");
    hex::encode(mac.finalize().into_bytes())
}

/// What follows a write: `{ prefixes, keys, revalidate, pings: [{ paths, type }] }`. The pings run here; Next's
/// caches are cleared through `/api/internal/hooks`. The write has happened, so a failure is only logged.
pub async fn notify(state: &AppState, mut effects: Value) {
    if let Some(Value::Array(pings)) = effects.as_object_mut().and_then(|e| e.shift_remove("pings")) {
        crate::indexing::auto(state, pings);
    }
    if effects.as_object().is_some_and(Map::is_empty) {
        return;
    }
    let sent = state
        .upstream_client()
        .post(format!("{}/api/internal/hooks", state.upstream_base()))
        .header(INTERNAL_HEADER, hooks_key(&state.config.jwt_secret))
        .header(header::CONTENT_TYPE, "application/json")
        .body(effects.to_string())
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .and_then(|r| r.error_for_status());
    if let Err(err) = sent {
        tracing::warn!(error = %err, "Next hooks failed: its caches stay until they expire");
    }
}

pub fn ping(paths: &[String], kind: &str) -> Value {
    json!({ "paths": paths, "type": kind })
}

// ── typed rows ─────────────────────────────────────────────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq)]
pub enum Kind {
    Text,
    OptText,
    Int,
    Bool,
    List,
    Json,
    OptJson,
    Date,
    OptDate,
}

/// A relational model as the API writes it. `columns` is the `RELATIONAL_COLUMNS` whitelist of serialize.js.
pub struct Table {
    pub name: &'static str,
    pub columns: &'static [(&'static str, Kind)],
    /// Has `createdAt` / `updatedAt`, which Prisma filled in.
    pub created_at: bool,
    pub updated_at: bool,
}

/// `new Date(value)` as the stored UTC timestamp. Postgres would drop an offset silently, so convert here.
pub fn js_date_value(value: &Value) -> Option<NaiveDateTime> {
    match value {
        Value::Number(n) => DateTime::from_timestamp_millis(n.as_f64()? as i64).map(|d| d.naive_utc()),
        Value::String(s) => {
            let s = s.trim();
            DateTime::parse_from_rfc3339(s)
                .map(|d| d.naive_utc())
                .ok()
                .or_else(|| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok().map(|d| d.and_time(chrono::NaiveTime::MIN)))
                // No offset: local time in Node, which is UTC in the containers.
                .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f").ok())
        }
        _ => None,
    }
}

fn sql_time(t: NaiveDateTime) -> Value {
    Value::String(t.format("%Y-%m-%dT%H:%M:%S%.3f").to_string())
}

/// `Number.parseInt(value, 10)`
pub fn parse_int(value: &Value) -> Option<i64> {
    let text = js_string(value);
    let text = text.trim_start();
    let (sign, digits) = match text.as_bytes().first() {
        Some(b'-') => (-1, &text[1..]),
        Some(b'+') => (1, &text[1..]),
        _ => (1, text),
    };
    let end = digits.find(|c: char| !c.is_ascii_digit()).unwrap_or(digits.len());
    digits[..end].parse::<i64>().ok().map(|n| sign * n)
}

/// `fromClient` plus Prisma's type check: unknown keys are dropped, wrong types are an error.
pub fn prepare(table: &Table, doc: &Value) -> anyhow::Result<Map<String, Value>> {
    let mut out = Map::new();
    let Some(doc) = doc.as_object() else { return Ok(out) };
    for &(name, kind) in table.columns {
        let Some(value) = doc.get(name) else { continue };
        let value = match kind {
            // `coerceInt`: an unreadable number leaves the column alone.
            Kind::Int if !value.is_null() => match parse_int(value) {
                Some(n) if i32::try_from(n).is_ok() => json!(n),
                Some(n) => anyhow::bail!("{name}: {n} is out of range"),
                None => continue,
            },
            Kind::Date | Kind::OptDate => js_date_value(value).map(sql_time).unwrap_or(Value::Null),
            _ => value.clone(),
        };
        let fits = match kind {
            Kind::Text => value.is_string(),
            Kind::OptText => value.is_string() || value.is_null(),
            Kind::Int => value.is_i64(),
            Kind::Bool => value.is_boolean(),
            Kind::List => value.as_array().is_some_and(|a| a.iter().all(Value::is_string)),
            Kind::Json => !value.is_null(),
            Kind::OptJson => true,
            Kind::Date => value.is_string(),
            Kind::OptDate => value.is_string() || value.is_null(),
        };
        anyhow::ensure!(fits, "invalid value for {name}");
        out.insert(name.to_string(), value);
    }
    Ok(out)
}

fn client(raw: &str) -> anyhow::Result<Value> {
    let mut row = pages::to_client_row(serde_json::from_str(raw)?);
    // The blog search index is not part of the document (RELATIONAL_OMIT).
    if let Some(fields) = row.as_object_mut() {
        fields.shift_remove("searchVector");
    }
    Ok(row)
}

/// The columns of `data`, quoted. Names come from the table's constant list.
fn column_list(data: &Map<String, Value>) -> String {
    data.keys().map(|k| format!(r#""{k}""#)).collect::<Vec<_>>().join(", ")
}

/// `prisma.<model>.create`: omitted columns take their database defaults.
pub async fn insert(db: &PgPool, table: &Table, mut data: Map<String, Value>) -> anyhow::Result<Value> {
    let now = sql_time(Utc::now().naive_utc());
    data.insert("id".into(), new_id().into());
    if table.created_at {
        data.entry("createdAt").or_insert_with(|| now.clone());
    }
    if table.updated_at {
        data.entry("updatedAt").or_insert(now);
    }
    let columns = column_list(&data);
    let t = table.name;
    let sql = format!(r#"INSERT INTO "{t}" ({columns}) SELECT {columns} FROM jsonb_populate_record(NULL::"{t}", $1::jsonb) RETURNING row_to_json("{t}".*)::text"#);
    let raw: String = sqlx::query_scalar(&sql).bind(Value::Object(data).to_string()).fetch_one(db).await?;
    client(&raw)
}

/// `prisma.<model>.update` by id. None when there is no such row.
pub async fn update(db: &PgPool, table: &Table, id: &str, mut data: Map<String, Value>) -> anyhow::Result<Option<Value>> {
    if data.is_empty() {
        return find(db, table.name, id).await;
    }
    if table.updated_at {
        data.entry("updatedAt").or_insert_with(|| sql_time(Utc::now().naive_utc()));
    }
    let t = table.name;
    let set = data.keys().map(|k| format!(r#""{k}" = r."{k}""#)).collect::<Vec<_>>().join(", ");
    let sql = format!(r#"UPDATE "{t}" t SET {set} FROM jsonb_populate_record(NULL::"{t}", $1::jsonb) r WHERE t.id = $2 RETURNING row_to_json(t.*)::text"#);
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(Value::Object(data).to_string()).bind(id).fetch_optional(db).await?;
    raw.as_deref().map(client).transpose()
}

/// `prisma.<model>.delete` by id: the deleted row, or None. `table` is a constant.
pub async fn delete(db: &PgPool, table: &str, id: &str) -> anyhow::Result<Option<Value>> {
    let sql = format!(r#"DELETE FROM "{table}" t WHERE id = $1 RETURNING row_to_json(t.*)::text"#);
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(id).fetch_optional(db).await?;
    raw.as_deref().map(client).transpose()
}

pub async fn find(db: &PgPool, table: &str, id: &str) -> anyhow::Result<Option<Value>> {
    let sql = format!(r#"SELECT row_to_json(t)::text FROM "{table}" t WHERE id = $1"#);
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(id).fetch_optional(db).await?;
    raw.as_deref().map(client).transpose()
}

/// Prisma P2002: a unique constraint refused the row.
pub fn is_duplicate(err: &anyhow::Error) -> bool {
    err.downcast_ref::<sqlx::Error>().and_then(|e| e.as_database_error()).is_some_and(|e| e.is_unique_violation())
}

// ── singletons ─────────────────────────────────────────────────────────────────────────────────────────

/// A one-row json document (`MODELS` in serialize.js).
pub struct Singleton {
    pub table: &'static str,
    /// The client sees `createdAt` / `updatedAt`.
    pub timestamps: bool,
    /// Secret columns: kept out of replies, written when the patch names them.
    pub secrets: &'static [&'static str],
}

/// What `upsertSingleton` stores: the patch merged over the current document, split into columns.
fn singleton_columns(model: &Singleton, current: Map<String, Value>, patch: &Map<String, Value>, now: NaiveDateTime) -> Map<String, Value> {
    let mut data = current;
    data.extend(patch.clone());
    for key in ["_id", "id", "__v"] {
        data.shift_remove(key);
    }
    let mut row = Map::new();
    for &secret in model.secrets {
        if let Some(v) = data.shift_remove(secret) {
            row.insert(secret.into(), if v.is_null() { v } else { js_string(&v).into() });
        }
    }
    row.insert("updatedAt".into(), sql_time(now));
    if model.timestamps {
        for key in ["createdAt", "updatedAt"] {
            // The merged document carries the stored timestamps, so Next writes them back unchanged.
            if let Some(t) = data.shift_remove(key).as_ref().and_then(js_date_value) {
                row.insert(key.into(), sql_time(t));
            }
        }
    }
    row.insert("data".into(), Value::Object(data));
    row
}

/// `upsertSingleton(prisma, key, patch)`; returns the document as the API shows it.
pub async fn upsert_singleton(db: &PgPool, model: &Singleton, patch: &Map<String, Value>) -> anyhow::Result<Value> {
    let table = model.table;
    let current = match pages::try_singleton(db, table, model.timestamps).await? {
        Value::Object(m) => m,
        _ => Map::new(),
    };
    let id = current.get("_id").and_then(Value::as_str).map(str::to_string);
    let now = Utc::now().naive_utc();
    let mut row = singleton_columns(model, current, patch, now);
    match id {
        Some(id) => {
            let set = row.keys().map(|k| format!(r#""{k}" = r."{k}""#)).collect::<Vec<_>>().join(", ");
            let sql = format!(r#"UPDATE "{table}" t SET {set} FROM jsonb_populate_record(NULL::"{table}", $1::jsonb) r WHERE t.id = $2"#);
            sqlx::query(&sql).bind(Value::Object(row).to_string()).bind(id).execute(db).await?;
        }
        None => {
            row.insert("id".into(), new_id().into());
            row.entry("createdAt").or_insert_with(|| sql_time(now));
            let columns = column_list(&row);
            let sql = format!(r#"INSERT INTO "{table}" ({columns}) SELECT {columns} FROM jsonb_populate_record(NULL::"{table}", $1::jsonb)"#);
            sqlx::query(&sql).bind(Value::Object(row).to_string()).execute(db).await?;
        }
    }
    pages::try_singleton(db, table, model.timestamps).await
}

#[cfg(test)]
mod tests {
    use super::*;

    const T: Table = Table {
        name: "T",
        columns: &[("name", Kind::Text), ("link", Kind::OptText), ("order", Kind::Int), ("on", Kind::Bool), ("tags", Kind::List), ("at", Kind::Date)],
        created_at: false,
        updated_at: false,
    };

    #[test]
    fn prepare_keeps_known_columns_and_checks_types() {
        let out = prepare(&T, &json!({ "name": "a", "link": null, "order": "7px", "tags": ["x"], "at": "2026-01-01T05:30:00+05:30", "id": "x", "evil": 1 })).unwrap();
        assert_eq!(Value::Object(out), json!({ "name": "a", "link": null, "order": 7, "tags": ["x"], "at": "2026-01-01T00:00:00.000" }));
        assert!(prepare(&T, &json!({ "order": "abc" })).unwrap().is_empty());
        for bad in [json!({ "name": 1 }), json!({ "name": null }), json!({ "order": null }), json!({ "on": "true" }), json!({ "tags": [1] }), json!({ "at": "soon" })] {
            assert!(prepare(&T, &bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn parse_int_matches_javascript() {
        for (input, want) in [(json!("12abc"), Some(12)), (json!(" -3"), Some(-3)), (json!(1.9), Some(1)), (json!(""), None), (json!(true), None)] {
            assert_eq!(parse_int(&input), want, "{input}");
        }
    }

    #[test]
    fn singleton_merge_moves_secrets_and_timestamps_to_columns() {
        let model = Singleton { table: "T", timestamps: true, secrets: &["token"] };
        let current = json!({ "_id": "1", "a": 1, "b": 2, "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-02T00:00:00.000Z", "token": "old" });
        let patch = json!({ "b": 3, "token": 5, "id": "other" });
        let row = singleton_columns(&model, current.as_object().unwrap().clone(), patch.as_object().unwrap(), Utc::now().naive_utc());
        assert_eq!(
            Value::Object(row),
            json!({ "token": "5", "updatedAt": "2026-01-02T00:00:00.000", "createdAt": "2026-01-01T00:00:00.000", "data": { "a": 1, "b": 3 } })
        );
    }

    #[test]
    fn hooks_key_is_not_the_export_key() {
        // node -e "console.log(require('crypto').createHmac('sha256','s').update('internal:hooks').digest('hex'))"
        assert_eq!(hooks_key("s"), "f5d14c7867abee830008f37d32709061ec74a3d38fabcebda793bb00ca7e1af3");
        assert_ne!(hooks_key("s"), crate::export::internal_key("s"));
    }
}
