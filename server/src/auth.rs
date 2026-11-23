//! Port of `getSession` (src/lib/auth.js): a valid JWT is not enough, the `Session` row for its `jti`
//! must exist, not be revoked and not be expired. That is what makes remote logout work.

use axum::{
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{NaiveDateTime, TimeDelta, Utc};

use crate::{AppState, session::{Claims, session_cookie}};

const LAST_SEEN_THROTTLE: TimeDelta = TimeDelta::minutes(1);

pub async fn require_session(state: &AppState, headers: &HeaderMap) -> Result<Claims, Response> {
    let unauthorized = || (StatusCode::UNAUTHORIZED, axum::Json(serde_json::json!({ "success": false, "error": "Unauthorized" }))).into_response();

    let token = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(session_cookie)
        .ok_or_else(unauthorized)?;
    let claims = state.sessions.verify(token).ok_or_else(unauthorized)?;
    let jti = claims.jti.clone().ok_or_else(unauthorized)?;

    // Prisma DateTime columns are `timestamp(3)` holding UTC.
    let row: Option<(String, Option<NaiveDateTime>, NaiveDateTime, NaiveDateTime)> =
        sqlx::query_as(r#"SELECT id, "revokedAt", "expiresAt", "lastSeenAt" FROM "Session" WHERE jti = $1"#)
            .bind(&jti)
            .fetch_optional(&state.db)
            .await
            .map_err(|err| {
                tracing::warn!(error = %err, "session lookup failed");
                unauthorized()
            })?;
    let (id, revoked_at, expires_at, last_seen_at) = row.ok_or_else(unauthorized)?;
    let now = Utc::now().naive_utc();
    if revoked_at.is_some() || expires_at <= now {
        return Err(unauthorized());
    }

    if now - last_seen_at > LAST_SEEN_THROTTLE {
        let db = state.db.clone();
        tokio::spawn(async move {
            let _ = sqlx::query(r#"UPDATE "Session" SET "lastSeenAt" = $1 WHERE id = $2"#).bind(now).bind(id).execute(&db).await;
        });
    }
    Ok(claims)
}
