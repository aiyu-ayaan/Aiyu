//! Code Mode: catalog, OpenAPI generation, sandboxed JavaScript execution, and agent tokens.

pub mod catalog;
pub mod sandbox;
pub mod token;

use axum::{
    Json,
    body::Body,
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, header, request::Parts},
    response::{IntoResponse, Response},
};
use base64::Engine;
use chrono::Utc;
use serde::Deserialize;
use serde_json::{Value, json};
use std::net::SocketAddr;
use tower::ServiceExt;

use crate::{
    AppState,
    codemode::{
        catalog::{Scope, apply_redactions, match_entry, openapi_document, validate_path},
        sandbox::{MAX_REPLY_BYTES, MAX_SCRIPT_BYTES, SandboxError, SandboxMode, SandboxResponse},
        token::{VerifiedToken, verify_agent_token},
    },
    db::{Stamp, new_id},
    images, limit,
};

/// In-process authentication header for `codemode.request` dispatches.
/// Stripped from every inbound HTTP request by the outermost router layer.
pub const INTERNAL_AUTH_HEADER: &str = "x-aiyu-codemode-internal";

/// Headers copied from the caller into in-process `codemode.request` calls so client IP
/// resolution and host handling match the external caller.
const FORWARDED_CLIENT_HEADERS: &[&str] = &[
    "host",
    "x-forwarded-for",
    "cf-connecting-ip",
    "x-real-ip",
    "x-client-ip",
];

#[derive(Deserialize)]
struct CodeRequest {
    code: String,
}

#[derive(Clone)]
struct CallerContext {
    peer: Option<ConnectInfo<SocketAddr>>,
    forwarded: Vec<(HeaderName, HeaderValue)>,
    ip: String,
    user_agent: String,
}

impl CallerContext {
    fn from_parts(state: &AppState, parts: &Parts) -> Self {
        let peer = parts.extensions.get::<ConnectInfo<SocketAddr>>().cloned();
        let mut forwarded = Vec::new();
        for &name in FORWARDED_CLIENT_HEADERS {
            if let Some(val) = parts.headers.get(name) {
                if let Ok(header_name) = HeaderName::from_bytes(name.as_bytes()) {
                    forwarded.push((header_name, val.clone()));
                }
            }
        }
        let ip = limit::client_ip(state, parts);
        let user_agent = limit::header_str(&parts.headers, "user-agent");
        Self {
            peer,
            forwarded,
            ip,
            user_agent,
        }
    }
}

async fn record_write_audit(
    state: &AppState,
    caller: &CallerContext,
    token_name: &str,
    method: &str,
    path: &str,
) {
    let details = format!("token={token_name} {method} {path}");
    let written = sqlx::query(
        r#"INSERT INTO "AuditLog" (id, action, category, details, "ipAddress", "userAgent", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
    )
    .bind(new_id())
    .bind("CODEMODE_WRITE")
    .bind("codemode")
    .bind(details.chars().take(2000).collect::<String>())
    .bind(&caller.ip)
    .bind(&caller.user_agent)
    .bind(Stamp(Utc::now().naive_utc()))
    .execute(&state.db)
    .await;
    if let Err(err) = written {
        tracing::error!(error = %err, "codemode audit log write failed");
    }
}

async fn parse_code_body(body: Body) -> Result<String, Response> {
    let body_cap = MAX_SCRIPT_BYTES * 2 + 16 * 1024;
    let bytes = axum::body::to_bytes(body, body_cap).await.map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(SandboxResponse::err(
                format!("script exceeds {} KB limit", MAX_SCRIPT_BYTES / 1024),
                vec![],
            )),
        )
            .into_response()
    })?;

    let req: CodeRequest = serde_json::from_slice(&bytes).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(SandboxResponse::err(
                "invalid request body: expected JSON with a `code` string",
                vec![],
            )),
        )
            .into_response()
    })?;

    if req.code.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(SandboxResponse::err("`code` must not be empty", vec![])),
        )
            .into_response());
    }
    Ok(req.code)
}

fn sandbox_result_response(result: Result<SandboxResponse, SandboxError>) -> Response {
    match result {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(SandboxError::ScriptTooLarge { limit, .. }) => (
            StatusCode::BAD_REQUEST,
            Json(SandboxResponse::err(
                format!("script exceeds {} KB limit", limit / 1024),
                vec![],
            )),
        )
            .into_response(),
        Err(SandboxError::TooManyConcurrent) => (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "success": false,
                "error": "Too many concurrent Code Mode runs. Please retry shortly.",
                "logs": [],
            })),
        )
            .into_response(),
    }
}

/// `POST /api/codemode/search`: runs a read-only script with `codemode.spec()` only.
/// Authenticated exclusively by an agent token (`Authorization: Bearer aiyu_agent_...`).
pub async fn search(State(state): State<AppState>, headers: HeaderMap, body: Body) -> Response {
    let verified = match verify_agent_token(&state, &headers).await {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let code = match parse_code_body(body).await {
        Ok(c) => c,
        Err(resp) => return resp,
    };
    let spec = openapi_document(verified.scope);
    let result = state
        .codemode
        .run(SandboxMode::Search, &code, spec, |_| async {
            Err("codemode.request is not available in search mode".into())
        })
        .await;
    sandbox_result_response(result)
}

/// `POST /api/codemode/execute`: runs a script with `codemode.spec()`, `codemode.request(...)`,
/// and (for write tokens) `codemode.upload(...)`.
/// Authenticated exclusively by an agent token (`Authorization: Bearer aiyu_agent_...`).
pub async fn execute(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let verified = match verify_agent_token(&state, &parts.headers).await {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let code = match parse_code_body(body).await {
        Ok(c) => c,
        Err(resp) => return resp,
    };

    let caller = CallerContext::from_parts(&state, &parts);
    let spec = openapi_document(verified.scope);

    let state_req = state.clone();
    let caller_req = caller.clone();
    let token_req = verified.clone();

    let state_up = state.clone();
    let caller_up = caller;
    let token_up = verified;

    let result = state
        .codemode
        .run_with_upload(
            SandboxMode::Execute,
            &code,
            spec,
            move |rpc_req| {
                let state = state_req.clone();
                let caller = caller_req.clone();
                let token = token_req.clone();
                async move { dispatch_request(&state, &caller, &token, rpc_req).await }
            },
            move |rpc_upload| {
                let state = state_up.clone();
                let caller = caller_up.clone();
                let token = token_up.clone();
                async move { dispatch_upload(&state, &caller, &token, rpc_upload).await }
            },
        )
        .await;
    sandbox_result_response(result)
}

fn encode_query(query: &Value) -> Result<String, String> {
    let Some(map) = query.as_object() else {
        return Err("`query` must be an object".into());
    };
    let mut ser = url::form_urlencoded::Serializer::new(String::new());
    for (k, v) in map {
        match v {
            Value::Null => {}
            Value::String(s) => {
                ser.append_pair(k, s);
            }
            Value::Bool(b) => {
                ser.append_pair(k, if *b { "true" } else { "false" });
            }
            Value::Number(n) => {
                ser.append_pair(k, &n.to_string());
            }
            Value::Array(items) => {
                for item in items {
                    match item {
                        Value::Null => {}
                        Value::String(s) => {
                            ser.append_pair(k, s);
                        }
                        Value::Bool(b) => {
                            ser.append_pair(k, if *b { "true" } else { "false" });
                        }
                        Value::Number(n) => {
                            ser.append_pair(k, &n.to_string());
                        }
                        _ => return Err(format!("query parameter `{k}` contains an unsupported value")),
                    }
                }
            }
            Value::Object(_) => {
                return Err(format!("query parameter `{k}` must be a scalar or array of scalars"));
            }
        }
    }
    Ok(ser.finish())
}

async fn dispatch_request(
    state: &AppState,
    caller: &CallerContext,
    token: &VerifiedToken,
    rpc_req: Value,
) -> Result<Value, String> {
    let Some(obj) = rpc_req.as_object() else {
        return Err("codemode.request expects an object { method, path, query?, body? }".into());
    };
    let method_str = obj
        .get("method")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "codemode.request requires a string `method`".to_string())?;
    let path = obj
        .get("path")
        .and_then(Value::as_str)
        .ok_or_else(|| "codemode.request requires a string `path`".to_string())?;

    // 1. Validate path strictly before matching.
    validate_path(path).map_err(|e| format!("invalid path: {e}"))?;

    // 2. Match against catalog & token scope (deny by default; never /api/codemode/*).
    let entry = match_entry(method_str, path, token.scope)
        .ok_or_else(|| format!("route not allowed: {} {}", method_str.to_ascii_uppercase(), path))?;

    // 3. Enforce allowed body fields (read routes and body-less writes accept no body).
    let req_body = match obj.get("body") {
        None | Some(Value::Null) => None,
        Some(v) => {
            if entry.allowed_body_fields.is_empty() {
                return Err(format!("request body is not allowed for {} {}", entry.method, entry.path));
            }
            let Some(map) = v.as_object() else {
                return Err("request `body` must be a JSON object".into());
            };
            for key in map.keys() {
                if !entry.allowed_body_fields.contains(&key.as_str()) {
                    return Err(format!("body field `{key}` is not allowed for {} {}", entry.method, entry.path));
                }
            }
            Some(v)
        }
    };

    // 4. Build URI with optional query parameters.
    let uri = match obj.get("query") {
        None | Some(Value::Null) => path.to_string(),
        Some(q) => {
            let encoded = encode_query(q)?;
            if encoded.is_empty() {
                path.to_string()
            } else {
                format!("{path}?{encoded}")
            }
        }
    };

    let method = Method::from_bytes(entry.method.as_bytes())
        .map_err(|_| format!("invalid HTTP method: {}", entry.method))?;
    let mut builder = Request::builder()
        .method(method)
        .uri(&uri)
        .header(INTERNAL_AUTH_HEADER, &state.codemode_internal_secret);

    for (name, val) in &caller.forwarded {
        builder = builder.header(name, val);
    }

    let body = match req_body {
        Some(v) => {
            builder = builder.header(header::CONTENT_TYPE, "application/json");
            Body::from(v.to_string())
        }
        None => Body::empty(),
    };

    let mut http_req = builder.body(body).map_err(|e| format!("failed to build request: {e}"))?;
    if let Some(peer) = caller.peer {
        http_req.extensions_mut().insert(peer);
    }

    // Dispatch directly to inner_router (bypassing only the external strip-internal-header layer).
    let res = crate::inner_router(state.clone())
        .oneshot(http_req)
        .await
        .map_err(|e| format!("internal dispatch error: {e}"))?;

    if entry.scope == Scope::Write {
        record_write_audit(state, caller, &token.name, entry.method, path).await;
    }

    let status = res.status().as_u16();
    let content_type = res
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();

    // 5. Read reply up to 2 MB.
    let bytes = axum::body::to_bytes(res.into_body(), MAX_REPLY_BYTES)
        .await
        .map_err(|_| "response exceeded 2 MB limit; use a narrower query".to_string())?;

    // 6. Apply redactions on JSON replies; return text for non-JSON (e.g. text/plain).
    if content_type.contains("json") {
        let mut data: Value = serde_json::from_slice(&bytes)
            .map_err(|e| format!("failed to parse JSON response: {e}"))?;
        apply_redactions(&mut data, entry.redactions);
        Ok(json!({ "status": status, "data": data }))
    } else if let Ok(mut data) = serde_json::from_slice::<Value>(&bytes) {
        apply_redactions(&mut data, entry.redactions);
        Ok(json!({ "status": status, "data": data }))
    } else {
        let text = String::from_utf8_lossy(&bytes).into_owned();
        Ok(json!({ "status": status, "text": text }))
    }
}

async fn dispatch_upload(
    state: &AppState,
    caller: &CallerContext,
    token: &VerifiedToken,
    rpc_upload: Value,
) -> Result<Value, String> {
    if !token.scope.allows(Scope::Write) {
        return Err("codemode.upload requires a write-scoped token".into());
    }
    let Some(obj) = rpc_upload.as_object() else {
        return Err("codemode.upload expects an object { name, type, base64 }".into());
    };
    let name = obj
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "codemode.upload requires a non-empty string `name`".to_string())?;
    let mime = obj
        .get("type")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "codemode.upload requires a non-empty string `type`".to_string())?;
    let b64 = obj
        .get("base64")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "codemode.upload requires a non-empty string `base64`".to_string())?;

    if name.contains(['\r', '\n', '"', '\\', '/']) || mime.contains(['\r', '\n', '"']) {
        return Err("codemode.upload `name` or `type` contains invalid characters".into());
    }
    let max_b64 = images::MAX_FILE_SIZE * 4 / 3 + 1024;
    if b64.len() > max_b64 {
        return Err(format!(
            "upload exceeds {} MB limit",
            images::MAX_FILE_SIZE / (1024 * 1024)
        ));
    }
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|_| "codemode.upload `base64` is not valid base64".to_string())?;
    if decoded.is_empty() || decoded.len() > images::MAX_FILE_SIZE {
        return Err(format!(
            "upload size must be between 1 byte and {} MB",
            images::MAX_FILE_SIZE / (1024 * 1024)
        ));
    }

    let boundary = format!("aiyu-cm-{}", new_id());
    let mut multipart = Vec::with_capacity(decoded.len() + 512);
    multipart.extend_from_slice(
        format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\nContent-Type: {mime}\r\n\r\n"
        )
        .as_bytes(),
    );
    multipart.extend_from_slice(&decoded);
    multipart.extend_from_slice(
        format!(
            "\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n{name}\r\n--{boundary}--\r\n"
        )
        .as_bytes(),
    );

    let mut builder = Request::builder()
        .method(Method::POST)
        .uri("/api/upload")
        .header(INTERNAL_AUTH_HEADER, &state.codemode_internal_secret)
        .header(header::CONTENT_TYPE, format!("multipart/form-data; boundary={boundary}"));

    for (hname, val) in &caller.forwarded {
        builder = builder.header(hname, val);
    }

    let mut http_req = builder
        .body(Body::from(multipart))
        .map_err(|e| format!("failed to build upload request: {e}"))?;
    if let Some(peer) = caller.peer {
        http_req.extensions_mut().insert(peer);
    }

    let res = crate::inner_router(state.clone())
        .oneshot(http_req)
        .await
        .map_err(|e| format!("internal upload dispatch error: {e}"))?;

    record_write_audit(state, caller, &token.name, "POST", "/api/upload").await;

    let status = res.status().as_u16();
    let bytes = axum::body::to_bytes(res.into_body(), MAX_REPLY_BYTES)
        .await
        .map_err(|_| "upload response exceeded 2 MB limit".to_string())?;
    let data: Value = serde_json::from_slice(&bytes)
        .unwrap_or_else(|_| json!({ "text": String::from_utf8_lossy(&bytes) }));
    Ok(json!({ "status": status, "data": data }))
}
