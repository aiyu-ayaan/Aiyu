//! `/api/admin/security`: the audit log and the signed-in devices.

use axum::{
    extract::{Path, RawQuery, Request, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use chrono::{SecondsFormat, TimeDelta, Utc};
use futures_util::future::join_all;
use serde_json::{Map, Value, json};

use crate::{
    AppState,
    admin_settings::{failed, failure, unauthorized},
    api::{json_status, query_map},
    auth, geoip, pages,
};

const MAX_LIMIT: i64 = 100;
const RETENTION_DAYS: i64 = 7;

/// `%`, `_` and `\` as literal characters of an ILIKE pattern.
fn like(text: &str) -> String {
    let escaped = text.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    format!("%{escaped}%")
}

/// `GET /api/admin/security/audit?category=&action=&limit=&cursor=`: newest first, paged by the last row's id.
pub async fn audit_log(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if auth::require_session(&state, &headers).await.is_err() {
        return unauthorized();
    }
    let mut params = query_map(&q);
    let mut param = |k: &str| params.remove(k).unwrap_or_default();
    let (category, action, cursor) = (param("category"), param("action"), param("cursor"));
    let limit = param("limit").parse::<f64>().ok().filter(|n| n.is_finite() && *n >= 1.0).map_or(50, |n| n as i64).min(MAX_LIMIT);
    let result: anyhow::Result<Value> = async {
        let rows: Vec<String> = sqlx::query_scalar(
            r#"SELECT row_to_json(t)::text FROM "AuditLog" t
               WHERE ($1 = '' OR category = $1) AND ($2 = '' OR action ILIKE $3)
                 AND ($4 = '' OR ("createdAt", id) < (SELECT "createdAt", id FROM "AuditLog" WHERE id = $4))
               ORDER BY "createdAt" DESC, id DESC LIMIT $5"#,
        )
        .bind(&category)
        .bind(&action)
        .bind(like(&action))
        .bind(&cursor)
        .bind(limit + 1)
        .fetch_all(&state.db)
        .await?;
        let more = rows.len() as i64 > limit;
        let logs = rows
            .iter()
            .take(limit as usize)
            .map(|raw| Ok(pages::to_client_row(serde_json::from_str(raw)?)))
            .collect::<anyhow::Result<Vec<Value>>>()?;
        let grouped: Vec<(String, i64)> = sqlx::query_as(r#"SELECT category, count(*) FROM "AuditLog" GROUP BY category"#).fetch_all(&state.db).await?;
        let counts: Map<String, Value> = grouped.into_iter().map(|(c, n)| (c, n.into())).collect();
        let next = if more { logs.last().map(|l| l["_id"].clone()) } else { None };
        Ok(json!({ "success": true, "logs": logs, "nextCursor": next, "counts": counts }))
    }
    .await;
    result.map(|v| json_status(StatusCode::OK, v)).unwrap_or_else(|err| failed("/api/admin/security/audit", StatusCode::INTERNAL_SERVER_ERROR, err))
}

/// The `Session` row of the caller's token.
async fn own_session(state: &AppState, jti: Option<&str>) -> anyhow::Result<Option<String>> {
    Ok(sqlx::query_scalar(r#"SELECT id FROM "Session" WHERE jti = $1"#).bind(jti).fetch_optional(&state.db).await?)
}

/// A session row with its state, when it will be deleted, and whether it is the caller's.
fn describe(mut session: Value, current: Option<&str>) -> Value {
    let time = |v: &Value| v.as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.to_utc());
    let now = Utc::now();
    let revoked = time(&session["revokedAt"]);
    let expires = time(&session["expiresAt"]);
    let expired = expires.is_some_and(|e| e <= now);
    let active = revoked.is_none() && !expired;
    // Inactive sessions are deleted a week after they ended.
    let ended = revoked.or(expires.filter(|_| expired));
    let delete_at = ended.map(|t| (t + TimeDelta::days(RETENTION_DAYS)).to_rfc3339_opts(SecondsFormat::Millis, true));
    let is_current = current.is_some_and(|id| session["_id"] == id);
    if let Value::Object(s) = &mut session {
        s.insert("current".into(), is_current.into());
        s.insert("active".into(), active.into());
        s.insert("expired".into(), expired.into());
        s.insert("state".into(), if active { "active" } else if revoked.is_some() { "revoked" } else { "expired" }.into());
        s.insert("deleteAt".into(), json!(delete_at));
    }
    session
}

/// `GET /api/admin/security/sessions`
pub async fn sessions(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let Ok(claims) = auth::require_session(&state, &headers).await else { return unauthorized() };
    let result: anyhow::Result<Value> = async {
        let current = own_session(&state, claims.jti.as_deref()).await?;
        let rows = pages::client_rows(&state.db, "Session", r#"ORDER BY "revokedAt" ASC, "lastSeenAt" DESC LIMIT 100"#).await?;
        let mut addresses: Vec<&str> = rows.iter().filter_map(|r| r["ipAddress"].as_str()).filter(|ip| !ip.is_empty()).collect();
        addresses.sort_unstable();
        addresses.dedup();
        let places = join_all(addresses.iter().map(|ip| geoip::lookup(&state.http, ip))).await;
        let sessions: Vec<Value> = rows
            .iter()
            .map(|row| {
                let ip = row["ipAddress"].as_str().unwrap_or("");
                let geo = places.iter().find(|p| p["ip"] == ip).cloned().unwrap_or_else(|| json!({ "label": if ip.is_empty() { "Unknown" } else { ip } }));
                let mut session = describe(row.clone(), current.as_deref());
                session["geo"] = geo;
                session
            })
            .collect();
        let count = |name: &str| sessions.iter().filter(|s| s["state"] == name).count();
        let counts = json!({ "active": count("active"), "expired": count("expired"), "revoked": count("revoked") });
        Ok(json!({ "success": true, "activeCount": count("active"), "sessions": sessions, "counts": counts, "retentionDays": RETENTION_DAYS }))
    }
    .await;
    result.map(|v| json_status(StatusCode::OK, v)).unwrap_or_else(|err| failed("/api/admin/security/sessions", StatusCode::INTERNAL_SERVER_ERROR, err))
}

/// `POST /api/admin/security/sessions/{id}/revoke`: sign one device out.
pub async fn revoke(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let (parts, _) = req.into_parts();
    let Ok(claims) = auth::require_session(&state, &parts.headers).await else { return unauthorized() };
    let result: anyhow::Result<Option<bool>> = async {
        // Read first: revoking your own session must still know it was yours.
        let current = own_session(&state, claims.jti.as_deref()).await?;
        let changed = sqlx::query(r#"UPDATE "Session" SET "revokedAt" = $1 WHERE id = $2 AND "revokedAt" IS NULL"#)
            .bind(Utc::now().naive_utc())
            .bind(&id)
            .execute(&state.db)
            .await?;
        Ok((changed.rows_affected() > 0).then(|| current.as_deref() == Some(id.as_str())))
    }
    .await;
    match result {
        Ok(None) => failure(StatusCode::NOT_FOUND, "Session not found or already revoked."),
        Ok(Some(own)) => {
            let details = if own { "Revoked own current session".to_string() } else { format!("Revoked session {id}") };
            auth::audit(&state, &parts, "SESSION_REVOKED", "security", &details).await;
            json_status(StatusCode::OK, json!({ "success": true, "revoked": id, "self": own }))
        }
        Err(err) => failed("/api/admin/security/sessions/revoke", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_states() {
        let row = |revoked: Value, expires: &str| json!({ "_id": "a", "revokedAt": revoked, "expiresAt": expires });
        let live = describe(row(Value::Null, "2999-01-01T00:00:00.000Z"), Some("a"));
        assert_eq!((live["state"].clone(), live["current"].clone(), live["deleteAt"].clone()), (json!("active"), json!(true), Value::Null));
        let old = describe(row(Value::Null, "2020-01-01T00:00:00.000Z"), None);
        assert_eq!((old["state"].clone(), old["deleteAt"].clone()), (json!("expired"), json!("2020-01-08T00:00:00.000Z")));
        let out = describe(row(json!("2021-01-01T00:00:00.000Z"), "2999-01-01T00:00:00.000Z"), None);
        assert_eq!((out["state"].clone(), out["deleteAt"].clone()), (json!("revoked"), json!("2021-01-08T00:00:00.000Z")));
    }

    #[test]
    fn like_patterns_are_literal() {
        assert_eq!(like("a%_\\"), "%a\\%\\_\\\\%");
    }
}
