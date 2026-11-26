//! Admin sessions: port of src/lib/auth.js and the `/api/auth/login` and `/api/auth/logout` routes. A valid JWT
//! is not enough, the `Session` row for its `jti` must exist, not be revoked and not be expired. That is what
//! makes remote logout work. GitHub OAuth is still served by Next, which writes the same rows and cookie.

use crate::db::{Stamp};
use axum::{
    Json,
    body::Body,
    extract::{FromRequest, Multipart, Request, State},
    http::{HeaderMap, StatusCode, header, request::Parts},
    response::{IntoResponse, Response},
};
use chrono::{DateTime, SecondsFormat, TimeDelta, Utc};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, time::Duration};

use crate::{
    AppState,
    api::{error, json_status},
    db::new_id,
    limit,
    limit::header_str,
    session::{Claims, constant_time_eq, session_cookie},
};

const LAST_SEEN_THROTTLE: TimeDelta = TimeDelta::minutes(1);
const SESSION_TTL: TimeDelta = TimeDelta::hours(24);
const LOGIN_MAX_PER_IP: usize = 5;
const LOGIN_WINDOW: Duration = Duration::from_secs(5 * 60);
const LOGIN_GLOBAL_WINDOW: Duration = Duration::from_secs(10 * 60);

pub async fn require_session(state: &AppState, headers: &HeaderMap) -> Result<Claims, Response> {
    let unauthorized = || (StatusCode::UNAUTHORIZED, axum::Json(serde_json::json!({ "success": false, "error": "Unauthorized" }))).into_response();

    let token = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(session_cookie)
        .ok_or_else(unauthorized)?;
    let claims = state.sessions.verify(token).ok_or_else(unauthorized)?;
    let jti = claims.jti.clone().ok_or_else(unauthorized)?;

    let row: Option<(String, Option<Stamp>, Stamp, Stamp)> =
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
    if revoked_at.is_some() || expires_at.0 <= now {
        return Err(unauthorized());
    }

    if now - last_seen_at.0 > LAST_SEEN_THROTTLE {
        let db = state.db.clone();
        tokio::spawn(async move {
            let _ = sqlx::query(r#"UPDATE "Session" SET "lastSeenAt" = $1 WHERE id = $2"#).bind(Stamp(now)).bind(id).execute(&db).await;
        });
    }
    Ok(claims)
}

fn env(name: &str) -> String {
    std::env::var(name).unwrap_or_default()
}

/// `logAudit`: an audit write must never break the action it records.
pub(crate) async fn audit(state: &AppState, parts: &Parts, action: &str, category: &str, details: &str) {
    let written = sqlx::query(r#"INSERT INTO "AuditLog" (id, action, category, details, "ipAddress", "userAgent", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)"#)
        .bind(new_id())
        .bind(action)
        .bind(category)
        .bind(details.chars().take(2000).collect::<String>())
        .bind(limit::client_ip(state, parts))
        .bind(header_str(&parts.headers, "user-agent"))
        .bind(Stamp(Utc::now().naive_utc()))
        .execute(&state.db)
        .await;
    if let Err(err) = written {
        tracing::error!(action, error = %err, "audit record failed");
    }
}

/// The `Set-Cookie` value Next writes. `Secure` is dropped only for `NODE_ENV=development`.
fn cookie(value: &str, expires: DateTime<Utc>) -> String {
    let secure = if env("NODE_ENV") == "development" { "" } else { " Secure;" };
    format!("session={value}; Path=/; Expires={};{secure} HttpOnly; SameSite=strict", expires.format("%a, %d %b %Y %H:%M:%S GMT"))
}

/// Fields of a `multipart/form-data` or urlencoded body (`request.formData()`); the first value of a name wins.
async fn form_fields(parts: &Parts, body: Body) -> anyhow::Result<HashMap<String, String>> {
    let kind = header_str(&parts.headers, "content-type").to_ascii_lowercase();
    let mut req = Request::new(body);
    *req.headers_mut() = parts.headers.clone();
    let mut fields = HashMap::new();
    if kind.starts_with("multipart/form-data") {
        let mut form = Multipart::from_request(req, &()).await?;
        while let Some(field) = form.next_field().await? {
            let Some(name) = field.name().map(str::to_string) else { continue };
            let value = field.text().await?;
            fields.entry(name).or_insert(value);
        }
    } else if kind.starts_with("application/x-www-form-urlencoded") {
        let bytes = axum::body::to_bytes(req.into_body(), 64 * 1024).await?;
        for (name, value) in url::form_urlencoded::parse(&bytes) {
            fields.entry(name.into_owned()).or_insert(value.into_owned());
        }
    } else {
        anyhow::bail!("unsupported form content type {kind:?}");
    }
    Ok(fields)
}

/// Compare digests, so neither the secret's content nor its length shows in the timing.
fn safe_equal(provided: &str, expected: &str) -> bool {
    let digest = |s: &str| hex::encode(Sha256::digest(s.as_bytes()));
    constant_time_eq(&digest(provided), &digest(expected))
}

/// Fails closed when the admin credentials are not configured.
fn credentials_match(username: &str, password: &str, expected_user: &str, expected_password: &str) -> bool {
    if expected_user.is_empty() || expected_password.is_empty() {
        return false;
    }
    // Both are compared before branching, so the timing does not tell which one was wrong.
    let user_ok = safe_equal(username, expected_user);
    let password_ok = safe_equal(password, expected_password);
    user_ok && password_ok
}

pub(crate) fn uuid_v4() -> String {
    let mut b: [u8; 16] = rand::random();
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    let h = hex::encode(b);
    format!("{}-{}-{}-{}-{}", &h[..8], &h[8..12], &h[12..16], &h[16..20], &h[20..])
}

/// `createSession`: the `Session` row, then the signed cookie pointing at it.
pub(crate) async fn create_session(state: &AppState, parts: &Parts, user: Value) -> anyhow::Result<String> {
    let now = Utc::now();
    let expires = now + SESSION_TTL;
    let jti = uuid_v4();
    sqlx::query(r#"INSERT INTO "Session" (id, jti, "ipAddress", "userAgent", "lastSeenAt", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $5)"#)
        .bind(new_id())
        .bind(&jti)
        .bind(limit::client_ip(state, parts))
        .bind(header_str(&parts.headers, "user-agent"))
        .bind(Stamp(now.naive_utc()))
        .bind(Stamp(expires.naive_utc()))
        .execute(&state.db)
        .await?;
    let iat = now.timestamp() as u64;
    let token = state.sessions.sign(&Claims {
        user,
        jti: Some(jti),
        expires: Some(expires.to_rfc3339_opts(SecondsFormat::Millis, true)),
        iat: Some(iat),
        exp: iat + SESSION_TTL.num_seconds() as u64,
    })?;
    Ok(cookie(&token, expires))
}

/// `POST /api/auth/login`
pub async fn login(State(state): State<AppState>, req: Request) -> Response {
    // Either password or GitHub: with GitHub login on, the password path must not be a way around it.
    if env("GITHUB_AUTH_ENABLED") == "true" {
        return error(StatusCode::FORBIDDEN, "Password login is disabled.");
    }
    let (parts, body) = req.into_parts();
    let ip = limit::client_ip(&state, &parts);
    if !limit::check(&format!("login:{ip}"), LOGIN_MAX_PER_IP, LOGIN_WINDOW) {
        tracing::warn!(%ip, "login rate limit exceeded");
        audit(&state, &parts, "LOGIN_RATE_LIMITED", "security", "Login blocked: too many attempts").await;
        return error(StatusCode::TOO_MANY_REQUESTS, "Too many login attempts. Please try again in 5 minutes.");
    }
    // Backstop against guessing spread over many addresses.
    let global_max = env("LOGIN_GLOBAL_MAX_ATTEMPTS").trim().parse().ok().filter(|&n| n > 0).unwrap_or(50);
    if !limit::check("login:global", global_max, LOGIN_GLOBAL_WINDOW) {
        tracing::warn!("global login rate limit exceeded");
        audit(&state, &parts, "LOGIN_RATE_LIMITED", "security", "Login blocked: global attempt threshold exceeded").await;
        return error(StatusCode::TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");
    }

    let failed = |err: anyhow::Error| {
        tracing::error!(error = %err, "login error");
        error(StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error")
    };
    let form = match form_fields(&parts, body).await {
        Ok(f) => f,
        Err(err) => return failed(err),
    };
    let field = |name: &str| form.get(name).map(String::as_str).unwrap_or("");
    if !credentials_match(field("username"), field("password"), &env("ADMIN_USERNAME"), &env("ADMIN_PASSWORD")) {
        tracing::warn!(%ip, "failed login attempt");
        audit(&state, &parts, "LOGIN_FAILED", "security", &format!("Invalid credentials for username \"{}\"", field("username"))).await;
        return error(StatusCode::UNAUTHORIZED, "Invalid credentials");
    }
    let set_cookie = match create_session(&state, &parts, json!({ "email": form.get("email"), "name": "Admin" })).await {
        Ok(c) => c,
        Err(err) => return failed(err),
    };
    tracing::info!(%ip, "admin signed in");
    audit(&state, &parts, "LOGIN_SUCCESS", "auth", "Admin signed in").await;
    ([(header::SET_COOKIE, set_cookie)], Json(json!({ "success": true }))).into_response()
}

/// `POST /api/auth/logout`: revoke the row behind the cookie, then clear the cookie.
pub async fn logout(State(state): State<AppState>, parts: Parts) -> Response {
    let cookies = header_str(&parts.headers, "cookie");
    if let Some(jti) = session_cookie(&cookies).and_then(|t| state.sessions.verify(t)).and_then(|c| c.jti) {
        let revoked = sqlx::query(r#"UPDATE "Session" SET "revokedAt" = $1 WHERE jti = $2 AND "revokedAt" IS NULL"#)
            .bind(Stamp(Utc::now().naive_utc()))
            .bind(jti)
            .execute(&state.db)
            .await;
        if let Err(err) = revoked {
            tracing::error!(error = %err, "session revoke failed");
        }
    }
    audit(&state, &parts, "LOGOUT", "auth", "Admin signed out").await;
    let mut res = json_status(StatusCode::OK, json!({ "success": true }));
    if let Ok(v) = cookie("", DateTime::UNIX_EPOCH).parse() {
        res.headers_mut().insert(header::SET_COOKIE, v);
    }
    res
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credentials_fail_closed() {
        assert!(credentials_match("admin", "pw", "admin", "pw"));
        assert!(!credentials_match("admin", "pw2", "admin", "pw"));
        assert!(!credentials_match("admin2", "pw", "admin", "pw"));
        assert!(!credentials_match("", "", "", ""));
        assert!(!credentials_match("admin", "", "admin", ""));
    }

    #[test]
    fn cookie_matches_next() {
        if env("NODE_ENV") != "development" {
            assert_eq!(cookie("", DateTime::UNIX_EPOCH), "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=strict");
        }
    }

    #[test]
    fn jti_is_a_uuid_v4() {
        let id = uuid_v4();
        assert_eq!(id.len(), 36);
        assert_eq!(&id[14..15], "4");
        assert!(matches!(&id[19..20], "8" | "9" | "a" | "b"));
    }
}
