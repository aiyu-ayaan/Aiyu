//! Google Drive backups (src/lib/gdrive.js and src/app/api/admin/gdrive). The OAuth keys and tokens sit encrypted
//! under `gdriveConfig` in the config document. Backups are built, uploaded and downloaded through temporary files,
//! never held in memory.

use crate::db::{self, Stamp};
use axum::{
    extract::{RawQuery, Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{DateTime, TimeDelta, Utc};
use futures_util::StreamExt;
use serde_json::{Map, Value, json};
use std::time::Duration;
use tokio_util::io::ReaderStream;

use crate::{
    AppState,
    admin_settings::{failure, unauthorized},
    api::{json_status, log_error, query_map, signed_in, truthy},
    cron,
    db::new_id,
    export, oauth, pages,
    restore::{self, TempFile},
    session::constant_time_eq,
    site_api::js_string,
    web::site_url,
    write,
};

const STATE_COOKIE: &str = "gdrive_oauth_state";
const FIELDS: [&str; 7] = ["clientId", "clientSecret", "accessToken", "refreshToken", "tokenExpiry", "user", "folderId"];
const RECONNECT_HINT: &str = "Reconnect Google Drive in Database Admin. If the Google Cloud OAuth consent screen for this client is still in \"Testing\", refresh tokens are revoked after 7 days — publish the app to keep the connection alive.";
/// Metadata calls; transfers have no overall limit, only a connect limit.
const TIMEOUT: Duration = Duration::from_secs(30);
const TRANSFER_TIMEOUT: Duration = Duration::from_secs(30 * 60);

/// Google's address, or `GOOGLE_API_BASE_URL` (a local stand-in used by the tests).
pub(crate) fn google(default_host: &str, path: &str) -> String {
    match std::env::var("GOOGLE_API_BASE_URL").ok().filter(|v| !v.is_empty()) {
        Some(base) => format!("{}{path}", base.trim_end_matches('/')),
        None => format!("https://{default_host}{path}"),
    }
}

fn api(path: &str) -> String {
    google("www.googleapis.com", path)
}

/// A failure of the Drive integration; `reconnect` ones cannot succeed until the admin consents again.
#[derive(Debug)]
pub struct DriveError {
    pub message: String,
    pub reconnect: bool,
}

impl std::fmt::Display for DriveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for DriveError {}

fn failed(message: impl Into<String>) -> DriveError {
    DriveError { message: message.into(), reconnect: false }
}

impl From<anyhow::Error> for DriveError {
    fn from(e: anyhow::Error) -> Self {
        failed(e.to_string())
    }
}
impl From<sqlx::Error> for DriveError {
    fn from(e: sqlx::Error) -> Self {
        failed(e.to_string())
    }
}
impl From<reqwest::Error> for DriveError {
    fn from(e: reqwest::Error) -> Self {
        // A URL can hold a token or a file id; leave it out.
        failed(format!("fetch failed: {}", e.without_url()))
    }
}
impl From<std::io::Error> for DriveError {
    fn from(e: std::io::Error) -> Self {
        failed(e.to_string())
    }
}

// ── settings ───────────────────────────────────────────────────────────────────────────────────────────

#[derive(Default)]
pub struct Settings {
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    access_token: Option<String>,
    refresh_token: Option<String>,
    token_expiry: Option<i64>,
    pub user: Option<String>,
    folder_id: Option<String>,
    pub retention_months: i64,
    pub auto_delete: bool,
}

impl Settings {
    fn configured(&self) -> bool {
        self.client_id.is_some() && self.client_secret.is_some()
    }
    pub fn is_connected(&self) -> bool {
        self.refresh_token.is_some() || self.access_token.is_some()
    }
}

async fn stored(state: &AppState) -> anyhow::Result<Option<(String, Map<String, Value>)>> {
    let row: Option<(String, sqlx::types::Json<Value>)> = sqlx::query_as(r#"SELECT id, data FROM "Config" LIMIT 1"#).fetch_optional(&state.db).await?;
    Ok(row.map(|(id, data)| (id, data.0.as_object().cloned().unwrap_or_default())))
}

/// 1 to 12 months.
fn months(value: &Value) -> i64 {
    write::parse_int(value).unwrap_or(1).clamp(1, 12)
}

pub async fn settings(state: &AppState) -> anyhow::Result<Settings> {
    let raw = stored(state).await?.and_then(|(_, data)| data.get("gdriveConfig").cloned()).unwrap_or(Value::Null);
    let open = |field: &str| raw[field].as_str().and_then(|sealed| state.cipher.decrypt(sealed)).filter(|v| !v.is_empty());
    Ok(Settings {
        client_id: open("clientId"),
        client_secret: open("clientSecret"),
        access_token: open("accessToken"),
        refresh_token: open("refreshToken"),
        token_expiry: open("tokenExpiry").and_then(|v| v.parse().ok()),
        user: open("user"),
        folder_id: open("folderId"),
        retention_months: if truthy(&raw["retentionMonths"]) { months(&raw["retentionMonths"]) } else { 1 },
        auto_delete: raw["autoDeleteEnabled"] == Value::Bool(true),
    })
}

/// The stored settings with `updates` laid over them: secrets encrypted, empty ones cleared.
fn merge(state: &AppState, mut current: Map<String, Value>, updates: &Map<String, Value>) -> Map<String, Value> {
    for field in FIELDS {
        let Some(value) = updates.get(field) else { continue };
        let sealed = match value {
            Value::Null => None,
            v => state.cipher.encrypt(&js_string(v)),
        };
        current.insert(field.into(), sealed.map_or(Value::Null, Value::String));
    }
    if let Some(v) = updates.get("retentionMonths").filter(|v| !v.is_null() && *v != "") {
        current.insert("retentionMonths".into(), write::parse_int(v).map_or(Value::Null, |n| n.clamp(1, 12).into()));
    }
    if let Some(v) = updates.get("autoDeleteEnabled") {
        current.insert("autoDeleteEnabled".into(), truthy(v).into());
    }
    current
}

pub async fn save(state: &AppState, updates: Value) -> anyhow::Result<()> {
    let updates = updates.as_object().cloned().unwrap_or_default();
    let (id, mut data) = match stored(state).await? {
        Some(row) => row,
        None => (String::new(), Map::new()),
    };
    let current = data.get("gdriveConfig").and_then(Value::as_object).cloned().unwrap_or_default();
    let gdrive = Value::Object(merge(state, current, &updates));
    let now = Stamp(Utc::now().naive_utc());
    if id.is_empty() {
        data.insert("gdriveConfig".into(), gdrive);
        sqlx::query(r#"INSERT INTO "Config" (id, data, "createdAt", "updatedAt") VALUES ($1, $2, $3, $3)"#)
            .bind(new_id())
            .bind(sqlx::types::Json(Value::Object(data)))
            .bind(now)
            .execute(&state.db)
            .await?;
    } else {
        // Only this key is written, so a settings save made meanwhile is not undone.
        sqlx::query(r#"UPDATE "Config" SET data = json_set(data, '$.gdriveConfig', json($1)), "updatedAt" = $2 WHERE id = $3"#)
            .bind(sqlx::types::Json(gdrive))
            .bind(now)
            .bind(id)
            .execute(&state.db)
            .await?;
    }
    Ok(())
}

/// Forget the grant; the client id and secret stay.
async fn clear_tokens(state: &AppState) -> anyhow::Result<()> {
    save(state, json!({ "accessToken": null, "refreshToken": null, "tokenExpiry": null, "user": null, "folderId": null })).await
}

// ── Google calls ───────────────────────────────────────────────────────────────────────────────────────

/// "Failed to <what>: <status text> - <body>", as Node reports it.
async fn checked(response: reqwest::Response, what: &str) -> Result<reqwest::Response, DriveError> {
    if response.status().is_success() {
        return Ok(response);
    }
    let reason = response.status().canonical_reason().unwrap_or("");
    let body = response.text().await.unwrap_or_default();
    let shown: String = body.chars().take(500).collect();
    Err(failed(format!("Failed to {what}: {reason} - {shown}")))
}

async fn json_of(response: reqwest::Response) -> Result<Value, DriveError> {
    let bytes = response.bytes().await?;
    serde_json::from_slice(&bytes).map_err(|e| failed(e.to_string()))
}

fn form(fields: &[(&str, &str)]) -> String {
    let mut out = url::form_urlencoded::Serializer::new(String::new());
    out.extend_pairs(fields);
    out.finish()
}

async fn token_request(state: &AppState, fields: &[(&str, &str)]) -> reqwest::Result<reqwest::Response> {
    state
        .http
        .post(google("oauth2.googleapis.com", "/token"))
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(form(fields))
        .timeout(TIMEOUT)
        .send()
        .await
}

fn expiry(data: &Value) -> i64 {
    let seconds = data["expires_in"].as_i64().filter(|s| *s > 0).unwrap_or(3600);
    Utc::now().timestamp_millis() + seconds * 1000
}

/// A token good for at least a minute, refreshed when needed.
async fn access_token(state: &AppState) -> Result<String, DriveError> {
    let s = settings(state).await?;
    if let (Some(token), Some(expires)) = (&s.access_token, s.token_expiry) {
        if expires > Utc::now().timestamp_millis() + 60_000 {
            return Ok(token.clone());
        }
    }
    let (Some(refresh), Some(id), Some(secret)) = (&s.refresh_token, &s.client_id, &s.client_secret) else {
        return Err(DriveError { message: "Google Drive credentials or refresh token missing".into(), reconnect: true });
    };
    let response = token_request(state, &[("client_id", id), ("client_secret", secret), ("refresh_token", refresh), ("grant_type", "refresh_token")]).await?;
    if !response.status().is_success() {
        let reason = response.status().canonical_reason().unwrap_or("").to_string();
        let body = response.text().await.unwrap_or_default();
        // The grant is dead: retrying can never work, so report the site as disconnected.
        if serde_json::from_str::<Value>(&body).is_ok_and(|v| v["error"] == "invalid_grant") {
            clear_tokens(state).await?;
            return Err(DriveError { message: format!("Google Drive refresh token is expired or revoked. {RECONNECT_HINT}"), reconnect: true });
        }
        return Err(failed(format!("Failed to refresh Google Drive token: {reason} - {body}")));
    }
    let data = json_of(response).await?;
    let Some(token) = data["access_token"].as_str().filter(|t| !t.is_empty()) else { return Err(failed("No access token returned from Google OAuth")) };
    let mut updates = json!({ "accessToken": token, "tokenExpiry": expiry(&data) });
    if truthy(&data["refresh_token"]) {
        updates["refreshToken"] = data["refresh_token"].clone();
    }
    save(state, updates).await?;
    Ok(token.to_string())
}

/// The "Aiyu Backups" folder, found or created once and remembered.
async fn folder(state: &AppState, token: &str) -> Result<String, DriveError> {
    if let Some(id) = settings(state).await?.folder_id {
        return Ok(id);
    }
    let query = "name='Aiyu Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    let url = format!("{}?{}", api("/drive/v3/files"), form(&[("q", query), ("fields", "files(id,name)")]));
    let found = json_of(checked(state.http.get(url).bearer_auth(token).timeout(TIMEOUT).send().await?, "search Google Drive folder").await?).await?;
    let id = match found["files"][0]["id"].as_str() {
        Some(id) => id.to_string(),
        None => {
            let body = json!({ "name": "Aiyu Backups", "mimeType": "application/vnd.google-apps.folder" });
            let request = state.http.post(api("/drive/v3/files")).bearer_auth(token).header(header::CONTENT_TYPE, "application/json").body(body.to_string());
            let created = json_of(checked(request.timeout(TIMEOUT).send().await?, "create Google Drive backup folder").await?).await?;
            created["id"].as_str().ok_or_else(|| failed("Google Drive returned no folder id"))?.to_string()
        }
    };
    save(state, json!({ "folderId": id })).await?;
    Ok(id)
}

/// Uploads the zip at `file` as `name`, then removes backups past their retention.
pub async fn upload(state: &AppState, file: &TempFile, name: &str) -> Result<Value, DriveError> {
    let token = access_token(state).await?;
    let folder = folder(state, &token).await?;
    let boundary = format!("-------AiyuBoundary{}", new_id());
    let metadata = json!({ "name": name, "parents": [folder], "mimeType": "application/zip" });
    let head = format!(
        "--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Type: application/zip\r\n\r\n"
    );
    let tail = format!("\r\n--{boundary}--\r\n");
    let zip = tokio::fs::File::open(&file.0).await?;
    let length = head.len() as u64 + zip.metadata().await?.len() + tail.len() as u64;
    let once = |text: String| futures_util::stream::once(async move { Ok::<_, std::io::Error>(axum::body::Bytes::from(text)) });
    let body = once(head).chain(ReaderStream::new(zip)).chain(once(tail));
    let response = state
        .http
        .post(api("/upload/drive/v3/files?uploadType=multipart"))
        .bearer_auth(&token)
        .header(header::CONTENT_TYPE, format!("multipart/related; boundary={boundary}"))
        .header(header::CONTENT_LENGTH, length)
        .body(reqwest::Body::wrap_stream(body))
        .timeout(TRANSFER_TIMEOUT)
        .send()
        .await?;
    let uploaded = json_of(checked(response, "upload backup to Google Drive").await?).await?;
    purge(state, false).await?;
    Ok(uploaded)
}

/// Builds a backup in a temporary file and uploads it.
pub async fn backup(state: &AppState, query: &[(String, String)], name: &str) -> Result<Value, DriveError> {
    let file = TempFile::new("zip").await?;
    let include_images = !query.iter().any(|(k, v)| k == "includeImages" && v == "false");
    let images = include_images.then_some(state.config.uploads_dir.as_path());
    let out = tokio::fs::File::create(&file.0).await?;
    export::write_backup(out, &state.db, &export::selected_keys(query), images, Utc::now().naive_utc()).await?;
    upload(state, &file, name).await
}

pub async fn list(state: &AppState) -> Result<Vec<Value>, DriveError> {
    let token = access_token(state).await?;
    let folder = folder(state, &token).await?;
    let query = format!("'{folder}' in parents and trashed=false");
    let params = form(&[("q", &query), ("fields", "files(id,name,mimeType,size,createdTime,modifiedTime)"), ("orderBy", "createdTime desc")]);
    let url = format!("{}?{params}", api("/drive/v3/files"));
    let response = checked(state.http.get(url).bearer_auth(&token).timeout(TIMEOUT).send().await?, "list Google Drive backups").await?;
    Ok(json_of(response).await?["files"].as_array().cloned().unwrap_or_default())
}

/// A Drive file id has no characters that could change the request path.
fn file_url(id: &str) -> Result<String, DriveError> {
    let valid = !id.is_empty() && id.chars().all(|c| c.is_ascii_alphanumeric() || "-_".contains(c));
    valid.then(|| api(&format!("/drive/v3/files/{id}"))).ok_or_else(|| failed("Invalid file id"))
}

pub async fn delete(state: &AppState, id: &str) -> Result<(), DriveError> {
    let url = file_url(id)?;
    let token = access_token(state).await?;
    checked(state.http.delete(url).bearer_auth(token).timeout(TIMEOUT).send().await?, "delete Google Drive backup").await?;
    Ok(())
}

async fn download(state: &AppState, id: &str) -> Result<TempFile, DriveError> {
    let url = file_url(id)?;
    let token = access_token(state).await?;
    let request = state.http.get(format!("{url}?alt=media")).bearer_auth(token).timeout(TRANSFER_TIMEOUT);
    let response = checked(request.send().await?, "download Google Drive backup").await?;
    let file = TempFile::new("zip").await?;
    restore::save_stream(response.bytes_stream(), &file).await.map_err(|e| match e {
        restore::RestoreError::Backup(message) => failed(message),
        restore::RestoreError::Failed(err) => failed(err.to_string()),
    })?;
    Ok(file)
}

/// Deletes backups older than the retention, when automatic deletion is on (or `forced`, the scheduled purge).
pub async fn purge(state: &AppState, forced: bool) -> Result<Value, DriveError> {
    let s = settings(state).await?;
    if !s.auto_delete && !forced {
        return Ok(json!({ "deletedCount": 0, "deletedFiles": [], "skipped": true }));
    }
    let cutoff = Utc::now() - TimeDelta::days(30 * s.retention_months.max(1));
    let expired: Vec<Value> = list(state)
        .await?
        .into_iter()
        .filter(|f| f["createdTime"].as_str().and_then(|t| DateTime::parse_from_rfc3339(t).ok()).is_some_and(|t| t < cutoff))
        .collect();
    for file in &expired {
        delete(state, file["id"].as_str().unwrap_or("")).await?;
    }
    Ok(json!({ "deletedCount": expired.len(), "deletedFiles": expired.iter().map(|f| f["name"].clone()).collect::<Vec<_>>() }))
}

// ── routes ─────────────────────────────────────────────────────────────────────────────────────────────

fn ok(value: Value) -> Response {
    json_status(StatusCode::OK, value)
}

fn reply(route: &str, result: Result<Value, DriveError>) -> Response {
    match result {
        Ok(v) => ok(v),
        Err(err) => {
            log_error(route, &anyhow::anyhow!(err.message.clone()));
            failure(StatusCode::INTERNAL_SERVER_ERROR, &err.message)
        }
    }
}

fn callback_url(headers: &HeaderMap) -> String {
    format!("{}/api/admin/gdrive/callback", oauth::public_origin(headers, &site_url()))
}

/// `GET /api/admin/gdrive/status`
pub async fn status(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result: Result<Value, DriveError> = async {
        let s = settings(&state).await?;
        let config = pages::client_rows(&state.db, "Config", "LIMIT 1").await?;
        let updated = config.first().map_or(Value::Null, |c| c["updatedAt"].clone());
        Ok(json!({
            "isConfigured": s.configured(), "isConnected": s.is_connected(), "user": s.user, "clientId": s.client_id,
            "retentionMonths": s.retention_months, "autoDeleteEnabled": s.auto_delete, "updatedAt": updated,
        }))
    }
    .await;
    reply("/api/admin/gdrive/status", result)
}

/// `GET /api/admin/gdrive/config`
pub async fn config(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result = settings(&state).await.map_err(DriveError::from).map(|s| {
        json!({
            "clientId": s.client_id.clone().unwrap_or_default(), "hasClientSecret": s.client_secret.is_some(),
            "callbackUrl": callback_url(&headers), "isConfigured": s.configured(), "isConnected": s.is_connected(),
            "retentionMonths": s.retention_months, "autoDeleteEnabled": s.auto_delete,
        })
    });
    reply("/api/admin/gdrive/config", result)
}

/// Session check, then the JSON body (an empty object when there is none).
async fn admin_body(state: &AppState, req: Request) -> Option<Option<Value>> {
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await {
        return None;
    }
    Some(write::json_body(body).await)
}

/// `POST /api/admin/gdrive/config`
pub async fn save_config(State(state): State<AppState>, req: Request) -> Response {
    let Some(body) = admin_body(&state, req).await else { return unauthorized() };
    let result: Result<Value, DriveError> = async {
        let body = body.ok_or_else(|| failed("Invalid JSON body"))?;
        let updates: Map<String, Value> = ["clientId", "clientSecret", "retentionMonths", "autoDeleteEnabled"]
            .iter()
            .filter_map(|k| body.get(k).map(|v| (k.to_string(), v.clone())))
            .collect();
        save(&state, Value::Object(updates)).await?;
        let s = settings(&state).await?;
        Ok(json!({ "success": true, "isConfigured": s.configured(), "retentionMonths": s.retention_months, "autoDeleteEnabled": s.auto_delete }))
    }
    .await;
    reply("/api/admin/gdrive/config", result)
}

fn state_cookie(value: &str, max_age: i64) -> String {
    let expires = (Utc::now() + TimeDelta::seconds(max_age)).format("%a, %d %b %Y %H:%M:%S GMT");
    let secure = if std::env::var("NODE_ENV").as_deref() == Ok("production") { " Secure;" } else { "" };
    format!("{STATE_COOKIE}={value}; Path=/api/admin/gdrive; Expires={expires}; Max-Age={max_age};{secure} HttpOnly; SameSite=lax")
}

fn redirect(location: &str, cookie: &str) -> Response {
    let (Ok(location), Ok(cookie)) = (HeaderValue::from_str(location), HeaderValue::from_str(cookie)) else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    (StatusCode::TEMPORARY_REDIRECT, [(header::LOCATION, location), (header::SET_COOKIE, cookie)]).into_response()
}

/// `GET /api/admin/gdrive/auth`: send the admin to Google's consent screen.
pub async fn auth(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let s = match settings(&state).await {
        Ok(s) => s,
        Err(err) => return reply("/api/admin/gdrive/auth", Err(err.into())),
    };
    let (Some(client), true) = (s.client_id.as_deref(), s.client_secret.is_some()) else {
        return failure(StatusCode::BAD_REQUEST, "Google Drive client ID or client secret is not configured");
    };
    // The callback cannot see the session cookie (SameSite=Strict, cross-site redirect): this one-time value is what
    // proves the returning code belongs to a flow the admin started.
    let secret: [u8; 32] = rand::random();
    let nonce = hex::encode(secret);
    let callback = callback_url(&headers);
    let params = form(&[
        ("client_id", client), ("redirect_uri", &callback), ("access_type", "offline"), ("prompt", "consent"), ("response_type", "code"),
        ("state", &nonce),
        ("scope", "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"),
    ]);
    redirect(&format!("https://accounts.google.com/o/oauth2/v2/auth?{params}"), &state_cookie(&nonce, 600))
}

/// The tokens for `code`, saved; the error name for the admin page otherwise.
async fn connect(state: &AppState, code: &str, redirect_uri: &str) -> Result<(), String> {
    let text = |e: anyhow::Error| e.to_string();
    let s = settings(state).await.map_err(text)?;
    let (Some(id), Some(secret)) = (&s.client_id, &s.client_secret) else { return Err("not_configured".into()) };
    let fields = [("code", code), ("client_id", id.as_str()), ("client_secret", secret.as_str()), ("redirect_uri", redirect_uri), ("grant_type", "authorization_code")];
    let response = token_request(state, &fields).await.map_err(|e| e.without_url().to_string())?;
    if !response.status().is_success() {
        tracing::error!(status = %response.status(), "Google token exchange failed");
        return Err("token_exchange_failed".into());
    }
    let data = json_of(response).await.map_err(|e| e.message)?;
    let Some(token) = data["access_token"].as_str().filter(|t| !t.is_empty()) else { return Err("no_access_token".into()) };
    // The account's address is only shown in the admin.
    let who = state.http.get(api("/oauth2/v2/userinfo")).bearer_auth(token).timeout(TIMEOUT).send().await;
    let user = match who.ok().filter(|r| r.status().is_success()) {
        Some(r) => json_of(r).await.ok().map(|u| if truthy(&u["email"]) { u["email"].clone() } else { u["name"].clone() }),
        None => None,
    };
    let mut updates = json!({ "accessToken": token, "tokenExpiry": expiry(&data), "user": user.unwrap_or(Value::Null) });
    if truthy(&data["refresh_token"]) {
        updates["refreshToken"] = data["refresh_token"].clone();
    }
    save(state, updates).await.map_err(text)
}

/// `GET /api/admin/gdrive/callback`
pub async fn callback(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    let origin = oauth::public_origin(&headers, &site_url());
    // Clearing the cookie makes the handshake single-use.
    let back = |query: &[(&str, &str)]| redirect(&format!("{origin}/admin/database?{}", form(query)), &state_cookie("", 0));
    let params = query_map(&q);
    let param = |k: &str| params.get(k).map(String::as_str).unwrap_or("");
    let (error, code) = (param("error"), param("code"));
    if !error.is_empty() || code.is_empty() {
        return back(&[("gdrive_error", if error.is_empty() { "missing_code" } else { error })]);
    }
    let cookies = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()).unwrap_or("");
    let expected = cookies.split(';').filter_map(|c| c.trim().split_once('=')).find(|(k, _)| *k == STATE_COOKIE).map_or("", |(_, v)| v);
    if expected.is_empty() || !constant_time_eq(param("state"), expected) {
        return back(&[("gdrive_error", "invalid_state")]);
    }
    match connect(&state, code, &format!("{origin}/api/admin/gdrive/callback")).await {
        Ok(()) => back(&[("gdrive", "connected")]),
        Err(why) => back(&[("gdrive_error", &why)]),
    }
}

/// `GET /api/admin/gdrive/list`
pub async fn list_backups(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    reply("/api/admin/gdrive/list", list(&state).await.map(|files| json!({ "success": true, "files": files })))
}

/// `POST /api/admin/gdrive/disconnect`
pub async fn disconnect(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    reply("/api/admin/gdrive/disconnect", clear_tokens(&state).await.map(|()| json!({ "success": true })).map_err(DriveError::from))
}

/// `POST /api/admin/gdrive/backup?...`: the export's query options choose what goes in.
pub async fn run_backup(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let query = export::url_pairs(&q.unwrap_or_default());
    let name = format!("backup_{}.zip", Utc::now().format("%Y-%m-%d_%H-%M-%S"));
    reply("/api/admin/gdrive/backup", backup(&state, &query, &name).await.map(|file| json!({ "success": true, "file": file })))
}

fn file_id(body: &Option<Value>) -> Option<String> {
    let id = &body.as_ref()?["fileId"];
    truthy(id).then(|| js_string(id))
}

/// `POST /api/admin/gdrive/delete` with `{ fileId }`.
pub async fn remove(State(state): State<AppState>, req: Request) -> Response {
    let Some(body) = admin_body(&state, req).await else { return unauthorized() };
    let Some(id) = file_id(&body) else { return failure(StatusCode::BAD_REQUEST, "fileId is required") };
    reply("/api/admin/gdrive/delete", delete(&state, &id).await.map(|()| json!({ "success": true })))
}

/// `POST /api/admin/gdrive/restore` with `{ fileId }`: download and restore.
pub async fn restore_backup(State(state): State<AppState>, req: Request) -> Response {
    let Some(body) = admin_body(&state, req).await else { return unauthorized() };
    let Some(id) = file_id(&body) else { return failure(StatusCode::BAD_REQUEST, "fileId is required") };
    match download(&state, &id).await {
        Ok(file) => restore::reply(restore::restore_file(&state, &file.0).await),
        Err(err) => reply("/api/admin/gdrive/restore", Err(err)),
    }
}

// ── the two scheduled jobs ─────────────────────────────────────────────────────────────────────────────

fn job_json(job: Option<&Value>, default_schedule: &str) -> Value {
    let get = |k: &str, fallback: Value| job.map_or(fallback, |j| j[k].clone());
    json!({
        "enabled": get("enabled", false.into()), "schedule": get("schedule", default_schedule.into()),
        "lastRun": get("lastRun", Value::Null), "nextRun": get("nextRun", Value::Null), "cronId": get("_id", Value::Null),
    })
}

async fn job(state: &AppState, action: &str) -> anyhow::Result<Option<Value>> {
    let sql = format!(r#"SELECT {} FROM "Cron" WHERE action = $1 LIMIT 1"#, db::row_json("Cron"));
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(action).fetch_optional(&state.db).await?;
    raw.map(|r| Ok(pages::to_client_row(serde_json::from_str(&r)?))).transpose()
}

/// `GET /api/admin/gdrive/cron`
pub async fn schedules(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result: Result<Value, DriveError> = async {
        let backup = job_json(job(&state, "gdrive_backup").await?.as_ref(), "0 0 * * *");
        let purge = job_json(job(&state, "gdrive_purge").await?.as_ref(), "0 3 * * *");
        // The flat keys are the backup job's, for older clients.
        let mut out = json!({ "success": true, "backup": backup, "purge": purge });
        for (k, v) in backup.as_object().cloned().unwrap_or_default() {
            out[k.as_str()] = v;
        }
        Ok(out)
    }
    .await;
    reply("/api/admin/gdrive/cron", result)
}

/// `POST /api/admin/gdrive/cron` with `{ action, enabled, schedule }`.
pub async fn save_schedule(State(state): State<AppState>, req: Request) -> Response {
    let Some(body) = admin_body(&state, req).await else { return unauthorized() };
    let body = body.unwrap_or(Value::Null);
    let purge = body["action"] == "gdrive_purge";
    let (action, default_schedule, name) = if purge {
        ("gdrive_purge", "0 3 * * *", "Google Drive Auto-Delete Purge")
    } else {
        ("gdrive_backup", "0 0 * * *", "Google Drive Automated Backup")
    };
    let result: Result<Value, DriveError> = async {
        let existing = job(&state, action).await?;
        let config = pages::try_singleton(&state.db, "Config", false).await?;
        let zone = config["defaultTimezone"].as_str().and_then(cron::zone).unwrap_or(chrono_tz::UTC);
        let schedule = if truthy(&body["schedule"]) {
            body["schedule"].as_str().ok_or_else(|| failed("schedule must be a string"))?.to_string()
        } else {
            existing.as_ref().and_then(|j| j["schedule"].as_str().filter(|s| !s.is_empty())).unwrap_or(default_schedule).to_string()
        };
        let enabled = body.get("enabled").map(truthy).unwrap_or_else(|| existing.as_ref().is_some_and(|j| j["enabled"] == true));
        let next = enabled.then(|| cron::next_run(&schedule, Utc::now(), zone)).flatten().map(|t| Stamp(t.naive_utc()));
        let now = Stamp(Utc::now().naive_utc());
        match existing.as_ref().and_then(|j| j["_id"].as_str()) {
            Some(id) => {
                sqlx::query(r#"UPDATE "Cron" SET schedule = $1, enabled = $2, "nextRun" = $3, "updatedAt" = $4 WHERE id = $5"#)
                    .bind(&schedule)
                    .bind(enabled)
                    .bind(next)
                    .bind(now)
                    .bind(id)
                    .execute(&state.db)
                    .await?;
            }
            None => {
                sqlx::query(r#"INSERT INTO "Cron" (id, name, type, schedule, enabled, action, "nextRun", "createdAt", "updatedAt") VALUES ($1, $2, 'system', $3, $4, $5, $6, $7, $7)"#)
                    .bind(new_id())
                    .bind(name)
                    .bind(&schedule)
                    .bind(enabled)
                    .bind(action)
                    .bind(next)
                    .bind(now)
                    .execute(&state.db)
                    .await?;
            }
        }
        let saved = job(&state, action).await?.ok_or_else(|| failed("job disappeared"))?;
        let mut out = job_json(Some(&saved), default_schedule);
        out["success"] = true.into();
        out["action"] = action.into();
        Ok(out)
    }
    .await;
    reply("/api/admin/gdrive/cron", result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_ids_cannot_change_the_path() {
        assert!(file_url("1aB-_x").is_ok());
        for bad in ["", "a/b", "../about", "a?alt=x", "a%2f"] {
            assert!(file_url(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn jobs_without_a_row_show_defaults() {
        assert_eq!(job_json(None, "0 3 * * *"), json!({ "enabled": false, "schedule": "0 3 * * *", "lastRun": null, "nextRun": null, "cronId": null }));
        assert_eq!(months(&json!("30")), 12);
        assert_eq!(months(&json!("x")), 1);
    }
}
