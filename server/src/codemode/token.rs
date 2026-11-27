//! Code Mode agent tokens: generation, SHA-256 verification, and admin CRUD routes.

use axum::{
    Json,
    extract::{Path, Request, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{NaiveDateTime, TimeDelta, Utc};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

use crate::{
    AppState, auth,
    codemode::catalog::Scope,
    db::{Stamp, new_id},
    write,
};

pub const TOKEN_PREFIX: &str = "aiyu_agent_";
pub const DEFAULT_EXPIRY_DAYS: i64 = 30;
const RANDOM_BYTES: usize = 24; // 48 hex chars
const MAX_NAME_LEN: usize = 120;

#[derive(Debug, Clone)]
pub struct VerifiedToken {
    pub id: String,
    pub name: String,
    pub scope: Scope,
}

fn unauthorized() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "success": false, "error": "Unauthorized" })),
    )
        .into_response()
}

fn bad_request(message: &str) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({ "success": false, "error": message })),
    )
        .into_response()
}

fn internal_error(route: &str, err: anyhow::Error) -> Response {
    crate::api::log_error(route, &err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "success": false, "error": "Internal server error" })),
    )
        .into_response()
}

fn iso(stamp: NaiveDateTime) -> String {
    format!("{}Z", crate::db::format_time(stamp))
}

fn opt_iso(stamp: Option<Stamp>) -> Value {
    match stamp {
        Some(s) => Value::String(iso(s.0)),
        None => Value::Null,
    }
}

/// Generate a fresh `aiyu_agent_<48 hex>` token, its SHA-256 hex digest, and its last 4 chars.
pub fn generate_token() -> (String, String, String) {
    let secret: [u8; RANDOM_BYTES] = rand::random();
    let token = format!("{TOKEN_PREFIX}{}", hex::encode(secret));
    let hash = hash_token(&token);
    let last_four = token[token.len() - 4..].to_string();
    (token, hash, last_four)
}

pub fn hash_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

fn parse_bearer(headers: &HeaderMap) -> Option<&str> {
    let raw = headers.get(header::AUTHORIZATION)?.to_str().ok()?.trim();
    let (scheme, token) = raw.split_once(' ')?;
    if !scheme.eq_ignore_ascii_case("bearer") {
        return None;
    }
    let token = token.trim();
    let hex_part = token.strip_prefix(TOKEN_PREFIX)?;
    if hex_part.len() != RANDOM_BYTES * 2 || !hex_part.bytes().all(|b| b.is_ascii_hexdigit()) {
        return None;
    }
    Some(token)
}

/// Authenticate a Code Mode request using `Authorization: Bearer aiyu_agent_...`.
/// Rejects missing, malformed, unknown, revoked, or expired tokens with 401.
pub async fn verify_agent_token(state: &AppState, headers: &HeaderMap) -> Result<VerifiedToken, Response> {
    let token = parse_bearer(headers).ok_or_else(unauthorized)?;
    let digest = hash_token(token);

    let row: Option<(String, String, String, Stamp, Option<Stamp>)> = sqlx::query_as(
        r#"SELECT id, name, scope, "expiresAt", "revokedAt" FROM "AgentToken" WHERE "tokenHash" = $1 LIMIT 1"#,
    )
    .bind(&digest)
    .fetch_optional(&state.db)
    .await
    .map_err(|err| {
        tracing::warn!(error = %err, "agent token lookup failed");
        unauthorized()
    })?;

    let (id, name, scope_str, expires_at, revoked_at) = row.ok_or_else(unauthorized)?;
    let now = Utc::now().naive_utc();
    if revoked_at.is_some() || expires_at.0 <= now {
        return Err(unauthorized());
    }

    let scope = match scope_str.as_str() {
        "read" => Scope::Read,
        "write" => Scope::Write,
        _ => return Err(unauthorized()),
    };

    let _ = sqlx::query(r#"UPDATE "AgentToken" SET "lastUsedAt" = $1 WHERE id = $2"#)
        .bind(Stamp(now))
        .bind(&id)
        .execute(&state.db)
        .await;

    Ok(VerifiedToken { id, name, scope })
}

type TokenRow = (String, String, String, String, Stamp, Stamp, Option<Stamp>, Option<Stamp>);

fn format_row(row: TokenRow) -> Value {
    let (id, name, last_four, scope, created_at, expires_at, last_used_at, revoked_at) = row;
    json!({
        "id": id,
        "name": name,
        "lastFour": last_four,
        "scope": scope,
        "createdAt": iso(created_at.0),
        "expiresAt": iso(expires_at.0),
        "lastUsedAt": opt_iso(last_used_at),
        "revokedAt": opt_iso(revoked_at),
    })
}

/// `GET /api/admin/codemode/tokens`: list all agent tokens (never returns `tokenHash`).
pub async fn list_tokens(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(res) = auth::require_session(&state, &headers).await {
        return res;
    }
    let rows: Result<Vec<TokenRow>, _> = sqlx::query_as(
        r#"SELECT id, name, "lastFour", scope, "createdAt", "expiresAt", "lastUsedAt", "revokedAt"
           FROM "AgentToken" ORDER BY "createdAt" DESC, id DESC"#,
    )
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let tokens: Vec<Value> = rows.into_iter().map(format_row).collect();
            (StatusCode::OK, Json(json!({ "success": true, "tokens": tokens }))).into_response()
        }
        Err(err) => internal_error("/api/admin/codemode/tokens", err.into()),
    }
}

/// `POST /api/admin/codemode/tokens`: create an agent token (30-day expiry, shown once).
pub async fn create_token(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if let Err(res) = auth::require_session(&state, &parts.headers).await {
        return res;
    }
    let Some(body) = write::json_body(body).await.filter(Value::is_object) else {
        return bad_request("Invalid JSON body");
    };

    let name = body
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    if name.is_empty() {
        return bad_request("Token name is required");
    }
    if name.chars().count() > MAX_NAME_LEN {
        return bad_request("Token name must be 120 characters or fewer");
    }

    let scope = match body.get("scope") {
        None | Some(Value::Null) => "read",
        Some(Value::String(s)) if s == "read" || s == "write" => s.as_str(),
        _ => return bad_request("Scope must be 'read' or 'write'"),
    };

    let id = new_id();
    let (token, hash, last_four) = generate_token();
    let now = Utc::now().naive_utc();
    let expires = (Utc::now() + TimeDelta::days(DEFAULT_EXPIRY_DAYS)).naive_utc();

    let inserted = sqlx::query(
        r#"INSERT INTO "AgentToken" (id, name, "tokenHash", "lastFour", scope, "expiresAt", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
    )
    .bind(&id)
    .bind(name)
    .bind(&hash)
    .bind(&last_four)
    .bind(scope)
    .bind(Stamp(expires))
    .bind(Stamp(now))
    .execute(&state.db)
    .await;

    match inserted {
        Ok(_) => {
            let item = format_row((
                id,
                name.to_string(),
                last_four,
                scope.to_string(),
                Stamp(now),
                Stamp(expires),
                None,
                None,
            ));
            (
                StatusCode::OK,
                Json(json!({ "success": true, "token": token, "item": item })),
            )
                .into_response()
        }
        Err(err) => internal_error("/api/admin/codemode/tokens", err.into()),
    }
}

/// `DELETE /api/admin/codemode/tokens/{id}`: revoke an agent token.
pub async fn revoke_token(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    if let Err(res) = auth::require_session(&state, &headers).await {
        return res;
    }
    let now = Stamp(Utc::now().naive_utc());
    let updated = sqlx::query(
        r#"UPDATE "AgentToken" SET "revokedAt" = COALESCE("revokedAt", $1) WHERE id = $2"#,
    )
    .bind(now)
    .bind(&id)
    .execute(&state.db)
    .await;

    match updated {
        Ok(res) if res.rows_affected() > 0 => {
            (StatusCode::OK, Json(json!({ "success": true }))).into_response()
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "error": "Token not found" })),
        )
            .into_response(),
        Err(err) => internal_error("/api/admin/codemode/tokens/{id}", err.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_tokens_have_expected_prefix_length_and_hash() {
        let (tok, digest, last4) = generate_token();
        assert!(tok.starts_with(TOKEN_PREFIX));
        assert_eq!(tok.len(), TOKEN_PREFIX.len() + RANDOM_BYTES * 2);
        assert!(tok.ends_with(&last4));
        assert_eq!(digest, hash_token(&tok));

        let mut headers = HeaderMap::new();
        headers.insert(header::AUTHORIZATION, format!("Bearer {tok}").parse().unwrap());
        assert_eq!(parse_bearer(&headers), Some(tok.as_str()));

        // Malformed tokens rejected.
        for bad in ["Bearer short", "Basic abc", "Bearer aiyu_agent_nothex", "Bearer blg_1234"] {
            let mut h = HeaderMap::new();
            h.insert(header::AUTHORIZATION, bad.parse().unwrap());
            assert!(parse_bearer(&h).is_none(), "{bad}");
        }
    }
}
