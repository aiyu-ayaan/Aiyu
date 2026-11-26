//! `/api/mcp`: standard MCP StreamableHTTP JSON-RPC endpoint (src/app/api/mcp/route.js, src/lib/mcp/*).

use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header, request::Parts},
    response::Response,
};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::{
    AppState, admin_ai, admin_blogs, admin_content, admin_site, ai, auth, limit, pages,
    session::constant_time_eq,
    site_api::{js_string, merge_mcp_config},
    write,
};

const SESSION_TTL: Duration = Duration::from_secs(30 * 60);
const LATEST_PROTOCOL_VERSION: &str = "2025-11-25";
const SUPPORTED_VERSIONS: &[&str] = &["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
const AI_SECTION_TYPES: &[&str] = &["hero", "skills", "recommendations", "credits", "stats", "prompts"];

const WRITE_TOOLS_LIST: &[&str] = &[
    "create_project",
    "update_project",
    "delete_project",
    "create_blog_post",
    "create_deployment",
    "create_ai_skill_category",
    "update_ai_skill_category",
    "delete_ai_skill_category",
    "create_ai_skill",
    "update_ai_skill",
    "delete_ai_skill",
    "create_ai_recommendation",
    "update_ai_recommendation",
    "delete_ai_recommendation",
    "create_ai_credit",
    "update_ai_credit",
    "delete_ai_credit",
    "create_ai_prompt",
    "update_ai_prompt",
    "delete_ai_prompt",
];

#[derive(Clone)]
struct Session {
    config: Value,
    last_seen: Instant,
}

static SESSIONS: LazyLock<Mutex<HashMap<String, Session>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

fn sweep_sessions() {
    let now = Instant::now();
    SESSIONS.lock().unwrap_or_else(|e| e.into_inner()).retain(|_, s| now.duration_since(s.last_seen) <= SESSION_TTL);
}

fn with_cors(mut res: Response, session_id: Option<&str>) -> Response {
    let h = res.headers_mut();
    h.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    h.insert(header::ACCESS_CONTROL_ALLOW_METHODS, HeaderValue::from_static("GET, POST, DELETE, OPTIONS"));
    h.insert(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        HeaderValue::from_static("Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID"),
    );
    h.insert(header::ACCESS_CONTROL_EXPOSE_HEADERS, HeaderValue::from_static("Mcp-Session-Id"));
    h.insert(header::ACCESS_CONTROL_MAX_AGE, HeaderValue::from_static("86400"));
    if let Some(sid) = session_id.and_then(|s| HeaderValue::from_str(s).ok()) {
        h.insert("mcp-session-id", sid);
    }
    res
}

fn json_response(payload: Value, status: StatusCode, session_id: Option<&str>) -> Response {
    let mut res = Response::new(Body::from(payload.to_string()));
    *res.status_mut() = status;
    res.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static("application/json"));
    with_cors(res, session_id)
}

fn rpc_error_res(id: Value, code: i64, message: &str, status: StatusCode) -> Response {
    json_response(json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } }), status, None)
}

fn rpc_ok(id: Value, result: Value) -> Value {
    json!({ "result": result, "jsonrpc": "2.0", "id": id })
}

fn rpc_err(id: Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

async fn verify_mcp_token(state: &AppState, headers: &HeaderMap) -> bool {
    let value = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).unwrap_or("");
    let mut parts = value.split(' ');
    let (scheme, token) = (parts.next().unwrap_or(""), parts.next().unwrap_or(""));
    if !scheme.eq_ignore_ascii_case("bearer") || token.is_empty() {
        return false;
    }
    let provided = hex::encode(Sha256::digest(token.trim().as_bytes()));
    let stored: Option<Option<String>> = sqlx::query_scalar(r#"SELECT "mcpTokenHash" FROM "McpConfig" LIMIT 1"#)
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten();
    stored.flatten().is_some_and(|h| !h.is_empty() && constant_time_eq(&h.to_ascii_lowercase(), &provided))
}

async fn load_mcp_config(state: &AppState) -> Value {
    let defaults = state.web.as_ref().map(|w| &w.discovery["mcpDefaults"]).cloned().unwrap_or(Value::Null);
    let stored = pages::try_singleton(&state.db, "McpConfig", true).await.unwrap_or(Value::Null);
    merge_mcp_config(&stored, &defaults)
}

/// `GET /api/mcp`
pub async fn get_mcp() -> Response {
    let mut res = json_response(
        json!({ "jsonrpc": "2.0", "id": null, "error": { "code": -32000, "message": "Method Not Allowed. Use POST for MCP messages." } }),
        StatusCode::METHOD_NOT_ALLOWED,
        None,
    );
    res.headers_mut().insert(header::ALLOW, HeaderValue::from_static("POST, DELETE, OPTIONS"));
    res
}

/// `OPTIONS /api/mcp`
pub async fn options_mcp() -> Response {
    let mut res = Response::new(Body::empty());
    *res.status_mut() = StatusCode::NO_CONTENT;
    with_cors(res, None)
}

/// `DELETE /api/mcp`
pub async fn delete_mcp(headers: HeaderMap) -> Response {
    if let Some(sid) = headers.get("mcp-session-id").and_then(|v| v.to_str().ok()).filter(|s| !s.is_empty()) {
        SESSIONS.lock().unwrap_or_else(|e| e.into_inner()).remove(sid);
    }
    let mut res = Response::new(Body::empty());
    *res.status_mut() = StatusCode::NO_CONTENT;
    with_cors(res, None)
}

struct AuthCtx<'a> {
    authed: bool,
    write_enabled: bool,
    parts: &'a Parts,
}

impl<'a> AuthCtx<'a> {
    fn assert_write(&self) -> anyhow::Result<()> {
        if !self.write_enabled {
            anyhow::bail!("Write access is disabled for this MCP server.");
        }
        if !self.authed {
            anyhow::bail!("Unauthorized: a valid bearer token is required for write operations.");
        }
        Ok(())
    }
}

/// `POST /api/mcp`
pub async fn post_mcp(State(state): State<AppState>, req: Request) -> Response {
    let config = load_mcp_config(&state).await;
    if config["enabled"] == Value::Bool(false) {
        return rpc_error_res(Value::Null, -32000, "MCP server is disabled.", StatusCode::SERVICE_UNAVAILABLE);
    }
    let (parts, body) = req.into_parts();
    let Some(body) = write::json_body(body).await else {
        return rpc_error_res(Value::Null, -32700, "Parse error: invalid JSON.", StatusCode::BAD_REQUEST);
    };
    let is_batch = body.is_array();
    let messages = match &body {
        Value::Array(a) => a.clone(),
        other => vec![other.clone()],
    };
    let first_id = messages.first().and_then(|m| m.get("id")).cloned().unwrap_or(Value::Null);
    let requested_sid = parts.headers.get("mcp-session-id").and_then(|v| v.to_str().ok()).filter(|s| !s.is_empty()).map(str::to_string);
    let has_initialize = messages.iter().any(|m| m["method"] == "initialize");

    let ip = limit::client_ip(&state, &parts);
    let auth_ctx = AuthCtx {
        authed: verify_mcp_token(&state, &parts.headers).await,
        write_enabled: config["write"]["enabled"] == Value::Bool(true),
        parts: &parts,
    };

    let invokes_write = messages.iter().any(|m| {
        m["method"] == "tools/call" && m["params"]["name"].as_str().is_some_and(|n| WRITE_TOOLS_LIST.contains(&n))
    });
    if invokes_write && !limit::check(&format!("mcp-write:{ip}"), 20, Duration::from_secs(60)) {
        return rpc_error_res(first_id, -32000, "Rate limit exceeded for write operations. Try again shortly.", StatusCode::TOO_MANY_REQUESTS);
    }

    let (session_config, session_id) = {
        let mut map = SESSIONS.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(ref sid) = requested_sid {
            if let Some(s) = map.get_mut(sid) {
                s.last_seen = Instant::now();
                (s.config.clone(), Some(sid.clone()))
            } else if !has_initialize {
                return rpc_error_res(first_id, -32001, "Session not found. Re-initialize.", StatusCode::NOT_FOUND);
            } else {
                let new_sid = auth::uuid_v4();
                map.insert(new_sid.clone(), Session { config: config.clone(), last_seen: Instant::now() });
                (config, Some(new_sid))
            }
        } else if has_initialize {
            let new_sid = auth::uuid_v4();
            map.insert(new_sid.clone(), Session { config: config.clone(), last_seen: Instant::now() });
            (config, Some(new_sid))
        } else {
            (config, None)
        }
    };

    let mut responses = Vec::new();
    for msg in &messages {
        let is_request = msg.is_object() && msg.get("method").is_some_and(|m| !m.is_null()) && msg.get("id").is_some_and(|i| !i.is_null());
        if !is_request {
            continue;
        }
        let id = msg["id"].clone();
        let method = msg["method"].as_str().unwrap_or("");
        let params = &msg["params"];
        let reply = dispatch(&state, &session_config, &auth_ctx, id, method, params).await;
        responses.push(reply);
    }

    sweep_sessions();

    if responses.is_empty() {
        let mut res = Response::new(Body::empty());
        *res.status_mut() = StatusCode::ACCEPTED;
        return with_cors(res, session_id.as_deref());
    }

    let payload = if is_batch { Value::Array(responses) } else { responses.into_iter().next().unwrap_or(Value::Null) };
    json_response(payload, StatusCode::OK, session_id.as_deref())
}

async fn dispatch(state: &AppState, config: &Value, auth_ctx: &AuthCtx<'_>, id: Value, method: &str, params: &Value) -> Value {
    let caps = &config["capabilities"];
    let tools_on = caps["tools"]["enabled"] == Value::Bool(true);
    let resources_on = caps["resources"]["enabled"] == Value::Bool(true);
    let prompts_on = caps["prompts"]["enabled"] == Value::Bool(true);
    let logging_on = caps["logging"]["enabled"] == Value::Bool(true);

    match method {
        "initialize" => {
            let requested = params["protocolVersion"].as_str().unwrap_or("");
            let protocol_version = if SUPPORTED_VERSIONS.contains(&requested) { requested } else { LATEST_PROTOCOL_VERSION };
            let mut capabilities = Map::new();
            if tools_on {
                capabilities.insert("tools".into(), json!({}));
            }
            if resources_on {
                capabilities.insert("resources".into(), json!({}));
            }
            if prompts_on {
                capabilities.insert("prompts".into(), json!({}));
            }
            if logging_on {
                capabilities.insert("logging".into(), json!({}));
            }
            let srv = &config["server"];
            let name = srv["name"].as_str().filter(|s| !s.is_empty()).unwrap_or("aiyu");
            let version = srv["version"].as_str().filter(|s| !s.is_empty()).unwrap_or("1.0.0");
            let mut server_info = json!({ "name": name, "version": version });
            if let Some(title) = srv["title"].as_str().filter(|s| !s.is_empty()) {
                server_info["title"] = title.into();
            }
            let mut result = json!({
                "protocolVersion": protocol_version,
                "capabilities": capabilities,
                "serverInfo": server_info,
            });
            if let Some(instructions) = srv["instructions"].as_str().filter(|s| !s.is_empty()) {
                result["instructions"] = instructions.into();
            }
            rpc_ok(id, result)
        }
        "ping" => rpc_ok(id, json!({})),
        "tools/list" if tools_on => {
            let write_enabled = config["write"]["enabled"] == Value::Bool(true);
            let mut tools = read_tool_schemas();
            if write_enabled && auth_ctx.authed {
                tools.extend(write_tool_schemas());
            }
            rpc_ok(id, json!({ "tools": tools }))
        }
        "tools/call" if tools_on => {
            let write_enabled = config["write"]["enabled"] == Value::Bool(true);
            let name = params["name"].as_str().unwrap_or("");
            let args = params.get("arguments").filter(|v| v.is_object()).cloned().unwrap_or_else(|| json!({}));
            let is_read = read_tool_schemas().iter().any(|t| t["name"] == name);
            let is_write = write_enabled && WRITE_TOOLS_LIST.contains(&name);
            if !is_read && !is_write {
                return rpc_ok(id, json!({ "isError": true, "content": [{ "type": "text", "text": format!("Unknown tool: {name}") }] }));
            }
            match call_tool(state, auth_ctx, name, &args).await {
                Ok(val) => {
                    let text = match val {
                        Value::String(s) => s,
                        other => serde_json::to_string_pretty(&other).unwrap_or_default(),
                    };
                    rpc_ok(id, json!({ "content": [{ "type": "text", "text": text }] }))
                }
                Err(err) => rpc_ok(id, json!({ "isError": true, "content": [{ "type": "text", "text": format!("Error: {err}") }] })),
            }
        }
        "resources/list" if resources_on => rpc_ok(id, json!({ "resources": resource_schemas() })),
        "resources/read" if resources_on => {
            let uri = params["uri"].as_str().unwrap_or("");
            match read_resource(state, uri).await {
                Ok(val) => {
                    let text = match val {
                        Value::String(s) => s,
                        other => serde_json::to_string_pretty(&other).unwrap_or_default(),
                    };
                    rpc_ok(id, json!({ "contents": [{ "uri": uri, "mimeType": "application/json", "text": text }] }))
                }
                Err(err) => rpc_err(id, -32603, &err.to_string()),
            }
        }
        "prompts/list" if prompts_on => rpc_ok(id, json!({ "prompts": prompt_schemas() })),
        "prompts/get" if prompts_on => {
            let name = params["name"].as_str().unwrap_or("");
            if name != "introduce_developer" {
                return rpc_err(id, -32603, &format!("Unknown prompt: {name}"));
            }
            let tone = params["arguments"]["tone"].as_str().filter(|s| !s.is_empty());
            let tone_str = tone.map(|t| format!(" {t}")).unwrap_or_default();
            rpc_ok(
                id,
                json!({
                    "description": "Introduce the developer",
                    "messages": [{
                        "role": "user",
                        "content": {
                            "type": "text",
                            "text": format!("Read the aiyu://profile resource and call the list_projects tool, then write a concise{tone_str} introduction of the developer that highlights their key skills and most notable projects."),
                        }
                    }]
                }),
            )
        }
        _ => rpc_err(id, -32601, "Method not found"),
    }
}

// ── Data helpers for tools & resources ─────────────────────────────────────────────────────────────────

async fn published_blogs_full(state: &AppState) -> Vec<Value> {
    let rows = pages::client_rows(&state.db, "Blog", r#"WHERE published ORDER BY "createdAt" DESC"#).await.unwrap_or_default();
    rows.into_iter()
        .map(|mut b| {
            if let Some(o) = b.as_object_mut() {
                o.shift_remove("searchVector");
                let content = o.get("content").and_then(Value::as_str).unwrap_or("").to_string();
                o.insert("readTime".into(), pages::read_time(&content).into());
                let cut: Vec<u16> = content.encode_utf16().take(500).collect();
                o.insert("content".into(), String::from_utf16_lossy(&cut).into());
            }
            b
        })
        .collect()
}

fn blog_summary(b: &Value) -> Value {
    json!({
        "id": b["_id"],
        "title": b["title"],
        "slug": b["slug"],
        "excerpt": b["excerpt"],
        "date": b["date"],
        "tags": if b["tags"].is_array() { b["tags"].clone() } else { json!([]) },
    })
}

async fn resolve_published_blog(state: &AppState, ident: &str) -> anyhow::Result<Option<Value>> {
    let ident = ident.trim();
    if ident.is_empty() {
        return Ok(None);
    }
    let one = |cond: &str| format!(r#"SELECT row_to_json(t)::text FROM "Blog" t WHERE {cond} LIMIT 1"#);
    let mut found = None;
    for cond in ["slug = $1", "lower(slug) = lower($1)", "id = $1"] {
        if let Some(raw) = sqlx::query_scalar::<_, String>(&one(cond)).bind(ident).fetch_optional(&state.db).await? {
            found = Some(pages::to_client_row(serde_json::from_str(&raw)?));
            break;
        }
    }
    if found.is_none() {
        let all: Vec<(String, String, String)> = sqlx::query_as(r#"SELECT id, slug, title FROM "Blog""#).fetch_all(&state.db).await?;
        let hit = all.into_iter().find(|(bid, slug, title)| {
            let derived = pages::entity_slug(&json!({ "_id": bid, "slug": slug, "name": title }), "blog");
            derived == ident
                || slug == ident
                || bid == ident
                || pages::generate_slug(title) == ident
                || (!slug.is_empty() && (ident.starts_with(slug.as_str()) || slug.starts_with(ident)))
        });
        if let Some((bid, ..)) = hit {
            if let Some(raw) = sqlx::query_scalar::<_, String>(&one("id = $1")).bind(bid).fetch_optional(&state.db).await? {
                found = Some(pages::to_client_row(serde_json::from_str(&raw)?));
            }
        }
    }
    let Some(mut b) = found else { return Ok(None) };
    if b["published"] == Value::Bool(false) {
        return Ok(None);
    }
    if let Some(o) = b.as_object_mut() {
        o.shift_remove("searchVector");
    }
    Ok(Some(b))
}

async fn load_ai_page(state: &AppState) -> Value {
    let defaults = state.web.as_ref().map(|w| &w.ai_defaults).cloned().unwrap_or_else(|| json!({ "sections": [] }));
    ai::hydrated(&state.db, &defaults).await.unwrap_or(defaults)
}

async fn read_resource(state: &AppState, uri: &str) -> anyhow::Result<Value> {
    Ok(match uri {
        "aiyu://profile" => {
            let v = pages::singleton(&state.db, "About", false).await;
            if v.is_null() { json!({}) } else { v }
        }
        "aiyu://projects" => Value::Array(pages::projects(&state.db, false).await.unwrap_or_default()),
        "aiyu://blogs" => Value::Array(published_blogs_full(state).await.iter().map(blog_summary).collect()),
        "aiyu://deployments" => Value::Array(pages::deployments(&state.db).await.unwrap_or_default()),
        "aiyu://api-catalog" => state.web.as_ref().map(|w| w.discovery["apiCatalog"].clone()).unwrap_or_else(|| json!({})),
        "aiyu://ai-page" => load_ai_page(state).await,
        "aiyu://ai-skills" => ai::section(&state.db, "skills").await?,
        "aiyu://ai-recommendations" => ai::section(&state.db, "recommendations").await?,
        "aiyu://ai-credits" => ai::section(&state.db, "credits").await?,
        "aiyu://ai-prompts" => ai::section(&state.db, "prompts").await?,
        _ => anyhow::bail!("Unknown resource: {uri}"),
    })
}

// ── Tool handlers ──────────────────────────────────────────────────────────────────────────────────────

fn str_field(args: &Value, field: &str, required: bool, max: usize) -> anyhow::Result<Option<String>> {
    admin_ai::string(args.get(field), field, required, max)
}

fn str_array_field(args: &Value, field: &str, max: usize) -> anyhow::Result<Option<Vec<String>>> {
    let Some(val) = args.get(field).filter(|v| !v.is_null()) else { return Ok(None) };
    let Some(arr) = val.as_array() else { anyhow::bail!("Field \"{field}\" must be an array of strings.") };
    if arr.len() > max {
        anyhow::bail!("Field \"{field}\" has too many items (max {max}).");
    }
    Ok(Some(
        arr.iter()
            .map(|v| String::from_utf16_lossy(&js_string(v).encode_utf16().take(200).collect::<Vec<_>>()))
            .collect(),
    ))
}

fn mcp_slugify(value: &str) -> String {
    let lower = value.to_lowercase();
    let trimmed = lower.trim();
    let mut out = String::new();
    let mut in_dash = false;
    for c in trimmed.chars() {
        if c.is_ascii_lowercase() || c.is_ascii_digit() {
            if in_dash && !out.is_empty() {
                out.push('-');
            }
            in_dash = false;
            out.push(c);
        } else {
            in_dash = true;
        }
    }
    out.chars().take(120).collect()
}

async fn next_display_order(state: &AppState, table: &str) -> anyhow::Result<i64> {
    let max: Option<i32> = sqlx::query_scalar(&format!(r#"SELECT "displayOrder" FROM "{table}" ORDER BY "displayOrder" DESC LIMIT 1"#))
        .fetch_optional(&state.db)
        .await?;
    Ok(max.map_or(0, |m| i64::from(m) + 1))
}

async fn call_tool(state: &AppState, auth_ctx: &AuthCtx<'_>, name: &str, args: &Value) -> anyhow::Result<Value> {
    match name {
        "search_portfolio" => {
            let query_raw = args.get("query").filter(|v| !v.is_null()).map(js_string).unwrap_or_default();
            let q = query_raw.to_lowercase().trim().to_string();
            if q.is_empty() {
                return Ok(json!({ "query": "", "count": 0, "results": [] }));
            }
            let projects = pages::projects(&state.db, false).await.unwrap_or_default();
            let blogs = published_blogs_full(state).await;
            let deployments = pages::deployments(&state.db).await.unwrap_or_default();
            let has = |v: &Value| v.as_str().unwrap_or("").to_lowercase().contains(&q);
            let any_has = |v: &Value| v.as_array().is_some_and(|a| a.iter().any(has));
            let mut results = Vec::new();
            for p in &projects {
                if has(&p["name"]) || has(&p["description"]) || any_has(&p["techStack"]) {
                    results.push(json!({
                        "type": "project", "title": p["name"], "slug": p["slug"],
                        "description": p["description"], "codeLink": p["codeLink"],
                    }));
                }
            }
            for b in &blogs {
                if has(&b["title"]) || has(&b["excerpt"]) || any_has(&b["tags"]) {
                    results.push(json!({
                        "type": "blog", "title": b["title"], "slug": b["slug"], "excerpt": b["excerpt"],
                    }));
                }
            }
            for d in &deployments {
                if has(&d["name"]) || has(&d["description"]) {
                    results.push(json!({
                        "type": "deployment", "title": d["name"], "url": d["hostedUrl"], "description": d["description"],
                    }));
                }
            }
            Ok(json!({ "query": args.get("query"), "count": results.len(), "results": results }))
        }
        "list_projects" => Ok(Value::Array(pages::projects(&state.db, false).await.unwrap_or_default())),
        "list_blogs" => Ok(Value::Array(published_blogs_full(state).await.iter().map(blog_summary).collect())),
        "get_blog" => {
            let id = args.get("id").filter(|v| !v.is_null()).map(js_string).unwrap_or_default();
            match resolve_published_blog(state, &id).await? {
                Some(b) => Ok(b),
                None => anyhow::bail!("Blog post not found."),
            }
        }
        "list_deployments" => Ok(Value::Array(pages::deployments(&state.db).await.unwrap_or_default())),
        "get_profile" => {
            let v = pages::singleton(&state.db, "About", false).await;
            Ok(if v.is_null() { json!({}) } else { v })
        }
        "get_api_catalog" => Ok(state.web.as_ref().map(|w| w.discovery["apiCatalog"].clone()).unwrap_or_else(|| json!({}))),
        "get_ai_page" => {
            let config = load_ai_page(state).await;
            let sections = config["sections"].as_array().cloned().unwrap_or_default();
            Ok(json!({ "sectionTypes": AI_SECTION_TYPES, "sections": sections }))
        }
        "list_ai_sections" => {
            let config = load_ai_page(state).await;
            let sections = config["sections"]
                .as_array()
                .into_iter()
                .flatten()
                .enumerate()
                .map(|(i, s)| {
                    json!({
                        "id": s["id"],
                        "type": s["type"],
                        "title": s["title"],
                        "enabled": s["enabled"] != Value::Bool(false),
                        "order": i,
                    })
                })
                .collect::<Vec<_>>();
            Ok(Value::Array(sections))
        }
        "get_ai_section" => {
            let wanted = args.get("id").filter(|v| !v.is_null()).map(js_string).unwrap_or_default();
            let config = load_ai_page(state).await;
            let found = config["sections"].as_array().into_iter().flatten().find(|s| s["id"].as_str() == Some(wanted.as_str())).cloned();
            match found {
                Some(s) => Ok(s),
                None => anyhow::bail!("AI Hub section not found: \"{wanted}\"."),
            }
        }
        "list_ai_skills" => ai::section(&state.db, "skills").await,
        "list_ai_recommendations" => ai::section(&state.db, "recommendations").await,
        "list_ai_credits" => ai::section(&state.db, "credits").await,
        "list_ai_prompts" => ai::section(&state.db, "prompts").await,

        // ── Write tools ──
        "create_project" => {
            auth_ctx.assert_write()?;
            let name = str_field(args, "name", true, 200)?.unwrap();
            let mut doc = json!({
                "name": name,
                "year": str_field(args, "year", true, 40)?.unwrap(),
                "status": str_field(args, "status", true, 60)?.unwrap(),
                "projectType": str_field(args, "projectType", true, 60)?.unwrap(),
                "description": str_field(args, "description", true, 5000)?.unwrap(),
                "displayOrder": next_display_order(state, "Project").await?,
            });
            if let Some(ts) = str_array_field(args, "techStack", 60)? {
                doc["techStack"] = ts.into();
            }
            for k in ["codeLink", "blogLink", "image"] {
                if let Some(v) = str_field(args, k, false, 1000)?.filter(|s| !s.is_empty()) {
                    doc[k] = v.into();
                }
            }
            let client = write::insert(&state.db, &admin_content::PROJECT, write::prepare(&admin_content::PROJECT, &doc)?).await?;
            write::notify(state, json!({ "prefixes": ["db:projects"] })).await;
            auth::audit(state, auth_ctx.parts, "MCP_CREATE_PROJECT", "content", &format!("Created project \"{}\" ({})", doc["name"].as_str().unwrap_or(""), client["_id"].as_str().unwrap_or(""))).await;
            Ok(json!({ "ok": true, "project": client }))
        }
        "update_project" => {
            auth_ctx.assert_write()?;
            let id = str_field(args, "id", true, 120)?.unwrap();
            if write::find(&state.db, "Project", &id).await?.is_none() {
                anyhow::bail!("Project not found.");
            }
            let mut patch = Map::new();
            let mut keys = Vec::new();
            for k in ["name", "year", "status", "projectType", "description", "codeLink", "blogLink", "image"] {
                if let Some(v) = str_field(args, k, false, 5000)? {
                    patch.insert(k.into(), v.into());
                    keys.push(k);
                }
            }
            if args.get("techStack").is_some() {
                patch.insert("techStack".into(), str_array_field(args, "techStack", 60)?.unwrap_or_default().into());
                keys.push("techStack");
            }
            if let Some(order_val) = args.get("displayOrder") {
                let n = admin_site::number(order_val);
                if !n.is_finite() {
                    anyhow::bail!("Field \"displayOrder\" must be a number.");
                }
                patch.insert("displayOrder".into(), (n as i64).into());
                keys.push("displayOrder");
            }
            if patch.is_empty() {
                anyhow::bail!("No updatable fields provided.");
            }
            let updated = write::update(&state.db, &admin_content::PROJECT, &id, write::prepare(&admin_content::PROJECT, &Value::Object(patch))?)
                .await?
                .ok_or_else(|| anyhow::anyhow!("Project not found."))?;
            write::notify(state, json!({ "prefixes": ["db:projects"] })).await;
            auth::audit(state, auth_ctx.parts, "MCP_UPDATE_PROJECT", "content", &format!("Updated project {id} [{}]", keys.join(", "))).await;
            Ok(json!({ "ok": true, "project": updated }))
        }
        "delete_project" => {
            auth_ctx.assert_write()?;
            let id = str_field(args, "id", true, 120)?.unwrap();
            let Some(existing) = write::find(&state.db, "Project", &id).await? else {
                anyhow::bail!("Project not found.");
            };
            write::delete(&state.db, "Project", &id).await?;
            write::notify(state, json!({ "prefixes": ["db:projects"] })).await;
            auth::audit(state, auth_ctx.parts, "MCP_DELETE_PROJECT", "content", &format!("Deleted project \"{}\" ({id})", existing["name"].as_str().unwrap_or(""))).await;
            Ok(json!({ "ok": true, "deletedId": id }))
        }
        "create_blog_post" => {
            auth_ctx.assert_write()?;
            let title = str_field(args, "title", true, 300)?.unwrap();
            let content = str_field(args, "content", true, 100_000)?.unwrap();
            let excerpt = str_field(args, "excerpt", false, 1000)?.unwrap_or_default();
            let published = args.get("published") == Some(&Value::Bool(true));
            let mut doc = json!({
                "title": title,
                "content": content,
                "excerpt": excerpt,
                "date": chrono::Utc::now().format("%Y-%m-%d").to_string(),
                "published": published,
                "slug": mcp_slugify(&title),
            });
            if let Some(tags) = str_array_field(args, "tags", 60)? {
                doc["tags"] = tags.into();
            }
            if let Some(img) = str_field(args, "image", false, 1000)?.filter(|s| !s.is_empty()) {
                doc["image"] = img.into();
            }
            if let Some(alt) = str_field(args, "imageAlt", false, 300)?.filter(|s| !s.is_empty()) {
                doc["imageAlt"] = alt.into();
            }
            let client = write::insert(&state.db, &admin_blogs::BLOG, write::prepare(&admin_blogs::BLOG, &doc)?).await?;
            write::notify(state, json!({ "prefixes": ["db:blogs"] })).await;
            auth::audit(
                state,
                auth_ctx.parts,
                "MCP_CREATE_BLOG",
                "content",
                &format!("Created blog \"{title}\" ({}) published={published}", client["_id"].as_str().unwrap_or("")),
            )
            .await;
            Ok(json!({ "ok": true, "blog": { "id": client["_id"], "title": client["title"], "slug": client["slug"], "published": client["published"] } }))
        }
        "create_deployment" => {
            auth_ctx.assert_write()?;
            let name = str_field(args, "name", true, 200)?.unwrap();
            let mut doc = json!({
                "name": name,
                "appType": str_field(args, "appType", true, 80)?.unwrap(),
                "hostingProvider": str_field(args, "hostingProvider", true, 120)?.unwrap(),
                "description": str_field(args, "description", true, 5000)?.unwrap(),
                "status": str_field(args, "status", false, 40)?.filter(|s| !s.is_empty()).unwrap_or_else(|| "Live".into()),
                "environment": str_field(args, "environment", false, 60)?.filter(|s| !s.is_empty()).unwrap_or_else(|| "Production".into()),
                "displayOrder": next_display_order(state, "Deployment").await?,
            });
            if let Some(u) = str_field(args, "hostedUrl", false, 500)?.filter(|s| !s.is_empty()) {
                doc["hostedUrl"] = u.into();
            }
            if let Some(ts) = str_array_field(args, "techStack", 60)? {
                doc["techStack"] = ts.into();
            }
            if let Some(img) = str_field(args, "image", false, 1000)?.filter(|s| !s.is_empty()) {
                doc["image"] = img.into();
            }
            let client = write::insert(&state.db, &admin_content::DEPLOYMENT, write::prepare(&admin_content::DEPLOYMENT, &doc)?).await?;
            write::notify(state, json!({ "prefixes": ["db:deployments"] })).await;
            auth::audit(state, auth_ctx.parts, "MCP_CREATE_DEPLOYMENT", "content", &format!("Created deployment \"{name}\" ({})", client["_id"].as_str().unwrap_or(""))).await;
            Ok(json!({ "ok": true, "deployment": client }))
        }
        "create_ai_skill_category" => ai_create(state, auth_ctx, &admin_ai::CATEGORIES, args, "MCP_CREATE_AI_SKILL_CATEGORY", "AI skill category", "label").await,
        "update_ai_skill_category" => ai_update(state, auth_ctx, &admin_ai::CATEGORIES, args, "MCP_UPDATE_AI_SKILL_CATEGORY", "AI skill category").await,
        "delete_ai_skill_category" => ai_delete(state, auth_ctx, &admin_ai::CATEGORIES, args, "MCP_DELETE_AI_SKILL_CATEGORY", "AI skill category").await,
        "create_ai_skill" => ai_create(state, auth_ctx, &admin_ai::SKILLS, args, "MCP_CREATE_AI_SKILL", "AI skill", "name").await,
        "update_ai_skill" => ai_update(state, auth_ctx, &admin_ai::SKILLS, args, "MCP_UPDATE_AI_SKILL", "AI skill").await,
        "delete_ai_skill" => ai_delete(state, auth_ctx, &admin_ai::SKILLS, args, "MCP_DELETE_AI_SKILL", "AI skill").await,
        "create_ai_recommendation" => ai_create(state, auth_ctx, &admin_ai::RECOMMENDATIONS, args, "MCP_CREATE_AI_RECOMMENDATION", "AI recommendation", "name").await,
        "update_ai_recommendation" => ai_update(state, auth_ctx, &admin_ai::RECOMMENDATIONS, args, "MCP_UPDATE_AI_RECOMMENDATION", "AI recommendation").await,
        "delete_ai_recommendation" => ai_delete(state, auth_ctx, &admin_ai::RECOMMENDATIONS, args, "MCP_DELETE_AI_RECOMMENDATION", "AI recommendation").await,
        "create_ai_credit" => ai_create(state, auth_ctx, &admin_ai::CREDITS, args, "MCP_CREATE_AI_CREDIT", "AI credit", "name").await,
        "update_ai_credit" => ai_update(state, auth_ctx, &admin_ai::CREDITS, args, "MCP_UPDATE_AI_CREDIT", "AI credit").await,
        "delete_ai_credit" => ai_delete(state, auth_ctx, &admin_ai::CREDITS, args, "MCP_DELETE_AI_CREDIT", "AI credit").await,
        "create_ai_prompt" => ai_create(state, auth_ctx, &admin_ai::PROMPTS, args, "MCP_CREATE_AI_PROMPT", "AI prompt", "title").await,
        "update_ai_prompt" => ai_update(state, auth_ctx, &admin_ai::PROMPTS, args, "MCP_UPDATE_AI_PROMPT", "AI prompt").await,
        "delete_ai_prompt" => ai_delete(state, auth_ctx, &admin_ai::PROMPTS, args, "MCP_DELETE_AI_PROMPT", "AI prompt").await,
        _ => anyhow::bail!("Unknown tool: {name}"),
    }
}

async fn ai_create(state: &AppState, auth_ctx: &AuthCtx<'_>, entry: &admin_ai::Entry, args: &Value, action: &str, label: &str, name_field: &str) -> anyhow::Result<Value> {
    auth_ctx.assert_write()?;
    let res = admin_ai::create(state, entry, args.clone()).await?;
    let item = &res[entry.reply];
    auth::audit(
        state,
        auth_ctx.parts,
        action,
        "content",
        &format!("Created {label} \"{}\" ({})", item[name_field].as_str().unwrap_or(""), item["_id"].as_str().unwrap_or("")),
    )
    .await;
    Ok(json!({ "ok": true, entry.reply: item }))
}

async fn ai_update(state: &AppState, auth_ctx: &AuthCtx<'_>, entry: &admin_ai::Entry, args: &Value, action: &str, label: &str) -> anyhow::Result<Value> {
    auth_ctx.assert_write()?;
    let id = args.get("id").filter(|v| !v.is_null()).map(js_string).unwrap_or_default();
    let mut patch = args.as_object().cloned().unwrap_or_default();
    patch.shift_remove("id");
    let res = admin_ai::update(state, entry, &id, Value::Object(patch)).await?;
    auth::audit(state, auth_ctx.parts, action, "content", &format!("Updated {label} {id}")).await;
    Ok(json!({ "ok": true, entry.reply: res[entry.reply] }))
}

async fn ai_delete(state: &AppState, auth_ctx: &AuthCtx<'_>, entry: &admin_ai::Entry, args: &Value, action: &str, label: &str) -> anyhow::Result<Value> {
    auth_ctx.assert_write()?;
    let id = args.get("id").filter(|v| !v.is_null()).map(js_string).unwrap_or_default();
    let res = admin_ai::remove(state, entry, &id).await?;
    auth::audit(state, auth_ctx.parts, action, "content", &format!("Deleted {label} {id}")).await;
    Ok(json!({ "ok": true, "deletedId": res["deletedId"] }))
}

// ── Wire definitions ───────────────────────────────────────────────────────────────────────────────────

fn no_args() -> Value {
    json!({ "type": "object", "properties": {}, "additionalProperties": false })
}

fn read_tool_schemas() -> Vec<Value> {
    let ro = || json!({ "readOnlyHint": true });
    let ro_idem = || json!({ "readOnlyHint": true, "idempotentHint": true });
    vec![
        json!({
            "name": "search_portfolio",
            "title": "Search Portfolio",
            "description": "Search across projects, blog posts, and live deployments by keyword.",
            "inputSchema": {
                "type": "object",
                "properties": { "query": { "type": "string", "description": "Keyword(s) to search for." } },
                "required": ["query"],
                "additionalProperties": false,
            },
            "annotations": { "readOnlyHint": true, "openWorldHint": false },
        }),
        json!({
            "name": "list_projects",
            "title": "List Projects",
            "description": "List all portfolio projects with tech stack, type, and links.",
            "inputSchema": no_args(),
            "annotations": ro(),
        }),
        json!({
            "name": "list_blogs",
            "title": "List Blog Posts",
            "description": "List published blog posts as summaries (title, slug, excerpt, date, tags).",
            "inputSchema": no_args(),
            "annotations": ro(),
        }),
        json!({
            "name": "get_blog",
            "title": "Get Blog Post",
            "description": "Fetch the full content of a single published blog post by id or slug.",
            "inputSchema": {
                "type": "object",
                "properties": { "id": { "type": "string", "description": "Blog post id or slug." } },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ro(),
        }),
        json!({
            "name": "list_deployments",
            "title": "List Deployments",
            "description": "List live deployments / hosted apps with status and URLs.",
            "inputSchema": no_args(),
            "annotations": ro(),
        }),
        json!({
            "name": "get_profile",
            "title": "Get Profile",
            "description": "Get the developer's about / resume profile (bio, skills, experience).",
            "inputSchema": no_args(),
            "annotations": ro(),
        }),
        json!({
            "name": "get_api_catalog",
            "title": "Get API Catalog",
            "description": "Get the machine-readable catalog of the public REST API.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
        json!({
            "name": "get_ai_page",
            "title": "Get AI Hub Page",
            "description": "Get the full AI Hub (/ai) configuration: the ordered array of section objects that drive the page. Falls back to bundled defaults if nothing is stored yet.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
        json!({
            "name": "list_ai_sections",
            "title": "List AI Hub Sections",
            "description": "List the AI Hub (/ai) sections as compact summaries (id, type, title, enabled, order). Use get_ai_section for a full section.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
        json!({
            "name": "get_ai_section",
            "title": "Get AI Hub Section",
            "description": "Get one AI Hub (/ai) section by id, including its full type-specific `data` payload. Section shape: { id, type, enabled, eyebrow, title, subtitle, accent, data }.",
            "inputSchema": {
                "type": "object",
                "properties": { "id": { "type": "string", "description": "The section id (see list_ai_sections)." } },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ro_idem(),
        }),
        json!({
            "name": "list_ai_skills",
            "title": "List AI Skills",
            "description": "List the AI Hub skills grouped by category: { categories: [{ id, label, accent, items: [{ id, name, description, url? }] }] }.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
        json!({
            "name": "list_ai_recommendations",
            "title": "List AI Recommendations",
            "description": "List the recommended-stack cards: { cards: [{ id, name, url, rating, accent, blurb, tags }] }.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
        json!({
            "name": "list_ai_credits",
            "title": "List AI Free Credits",
            "description": "List the free-credits / free-tier rows: { rows: [{ id, name, offer, url, noCard, freeApi, note }] }.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
        json!({
            "name": "list_ai_prompts",
            "title": "List AI Prompts",
            "description": "List the prompt-library entries: { items: [{ id, title, role, prompt }] }.",
            "inputSchema": no_args(),
            "annotations": ro_idem(),
        }),
    ]
}

fn write_tool_schemas() -> Vec<Value> {
    let ann_create = || json!({ "readOnlyHint": false, "destructiveHint": false, "idempotentHint": false, "openWorldHint": false });
    let ann_update = || json!({ "readOnlyHint": false, "destructiveHint": false, "idempotentHint": true, "openWorldHint": false });
    let ann_delete = || json!({ "readOnlyHint": false, "destructiveHint": true, "idempotentHint": true, "openWorldHint": false });
    let id_only = || json!({ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"], "additionalProperties": false });

    vec![
        json!({
            "name": "create_project",
            "title": "Create Project",
            "description": "Create a new portfolio project. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "year": { "type": "string", "description": "e.g. \"2025\"." },
                    "status": { "type": "string", "description": "e.g. \"Completed\", \"In Progress\"." },
                    "projectType": { "type": "string" },
                    "description": { "type": "string" },
                    "techStack": { "type": "array", "items": { "type": "string" } },
                    "codeLink": { "type": "string" },
                    "blogLink": { "type": "string" },
                    "image": { "type": "string" },
                },
                "required": ["name", "year", "status", "projectType", "description"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "update_project",
            "title": "Update Project",
            "description": "Update fields of an existing project by id. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "year": { "type": "string" },
                    "status": { "type": "string" },
                    "projectType": { "type": "string" },
                    "description": { "type": "string" },
                    "techStack": { "type": "array", "items": { "type": "string" } },
                    "codeLink": { "type": "string" },
                    "blogLink": { "type": "string" },
                    "image": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ann_update(),
        }),
        json!({
            "name": "delete_project",
            "title": "Delete Project",
            "description": "Permanently delete a project by id. Destructive. Requires write authorization.",
            "inputSchema": id_only(),
            "annotations": ann_delete(),
        }),
        json!({
            "name": "create_blog_post",
            "title": "Create Blog Post",
            "description": "Create a new blog post (defaults to an unpublished draft). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": { "type": "string" },
                    "content": { "type": "string", "description": "Markdown body." },
                    "excerpt": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } },
                    "published": { "type": "boolean", "description": "Defaults to false (draft)." },
                    "image": { "type": "string" },
                    "imageAlt": { "type": "string" },
                },
                "required": ["title", "content"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "create_deployment",
            "title": "Create Deployment",
            "description": "Create a new live deployment / hosted app entry. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "appType": { "type": "string" },
                    "hostingProvider": { "type": "string" },
                    "description": { "type": "string" },
                    "status": { "type": "string", "description": "Defaults to \"Live\"." },
                    "environment": { "type": "string", "description": "Defaults to \"Production\"." },
                    "hostedUrl": { "type": "string" },
                    "techStack": { "type": "array", "items": { "type": "string" } },
                    "image": { "type": "string" },
                },
                "required": ["name", "appType", "hostingProvider", "description"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "create_ai_skill_category",
            "title": "Create AI Skill Category",
            "description": "Add a skill filter category (e.g. \"Motion & Animation\"). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "label": { "type": "string" },
                    "accent": { "type": "string", "description": "CSS color, e.g. \"var(--accent-cyan)\"." },
                    "displayOrder": { "type": "number" },
                },
                "required": ["label"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "update_ai_skill_category",
            "title": "Update AI Skill Category",
            "description": "Update a skill category by id. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "label": { "type": "string" },
                    "accent": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ann_update(),
        }),
        json!({
            "name": "delete_ai_skill_category",
            "title": "Delete AI Skill Category",
            "description": "Delete a skill category and all its skills by id. Destructive. Requires write authorization.",
            "inputSchema": id_only(),
            "annotations": ann_delete(),
        }),
        json!({
            "name": "create_ai_skill",
            "title": "Create AI Skill",
            "description": "Add a skill to a category ({ categoryId, name, description?, url? }). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "categoryId": { "type": "string" },
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "url": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["categoryId", "name"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "update_ai_skill",
            "title": "Update AI Skill",
            "description": "Update a skill by id (fields: categoryId, name, description, url, displayOrder). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "categoryId": { "type": "string" },
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "url": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ann_update(),
        }),
        json!({
            "name": "delete_ai_skill",
            "title": "Delete AI Skill",
            "description": "Delete a skill by id. Destructive. Requires write authorization.",
            "inputSchema": id_only(),
            "annotations": ann_delete(),
        }),
        json!({
            "name": "create_ai_recommendation",
            "title": "Create AI Recommendation",
            "description": "Add a recommended-stack card ({ name, url?, rating?, accent?, blurb?, tags? }). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "url": { "type": "string" },
                    "rating": { "type": "number", "description": "0–5." },
                    "accent": { "type": "string" },
                    "blurb": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } },
                    "displayOrder": { "type": "number" },
                },
                "required": ["name"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "update_ai_recommendation",
            "title": "Update AI Recommendation",
            "description": "Update a recommendation card by id. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "url": { "type": "string" },
                    "rating": { "type": "number" },
                    "accent": { "type": "string" },
                    "blurb": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } },
                    "displayOrder": { "type": "number" },
                },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ann_update(),
        }),
        json!({
            "name": "delete_ai_recommendation",
            "title": "Delete AI Recommendation",
            "description": "Delete a recommendation card by id. Destructive. Requires write authorization.",
            "inputSchema": id_only(),
            "annotations": ann_delete(),
        }),
        json!({
            "name": "create_ai_credit",
            "title": "Create AI Free Credit",
            "description": "Add a free-credits row ({ name, offer?, url?, noCard?, freeApi?, note? }). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "offer": { "type": "string" },
                    "url": { "type": "string" },
                    "noCard": { "type": "boolean" },
                    "freeApi": { "type": "boolean" },
                    "note": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["name"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "update_ai_credit",
            "title": "Update AI Free Credit",
            "description": "Update a free-credits row by id. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "offer": { "type": "string" },
                    "url": { "type": "string" },
                    "noCard": { "type": "boolean" },
                    "freeApi": { "type": "boolean" },
                    "note": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ann_update(),
        }),
        json!({
            "name": "delete_ai_credit",
            "title": "Delete AI Free Credit",
            "description": "Delete a free-credits row by id. Destructive. Requires write authorization.",
            "inputSchema": id_only(),
            "annotations": ann_delete(),
        }),
        json!({
            "name": "create_ai_prompt",
            "title": "Create AI Prompt",
            "description": "Add a prompt-library entry ({ title, prompt, role? }). Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": { "type": "string" },
                    "role": { "type": "string" },
                    "prompt": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["title", "prompt"],
                "additionalProperties": false,
            },
            "annotations": ann_create(),
        }),
        json!({
            "name": "update_ai_prompt",
            "title": "Update AI Prompt",
            "description": "Update a prompt-library entry by id. Requires write authorization.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "title": { "type": "string" },
                    "role": { "type": "string" },
                    "prompt": { "type": "string" },
                    "displayOrder": { "type": "number" },
                },
                "required": ["id"],
                "additionalProperties": false,
            },
            "annotations": ann_update(),
        }),
        json!({
            "name": "delete_ai_prompt",
            "title": "Delete AI Prompt",
            "description": "Delete a prompt-library entry by id. Destructive. Requires write authorization.",
            "inputSchema": id_only(),
            "annotations": ann_delete(),
        }),
    ]
}

fn resource_schemas() -> Vec<Value> {
    vec![
        json!({ "uri": "aiyu://profile", "name": "profile", "title": "Developer Profile", "description": "About / resume profile data.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://projects", "name": "projects", "title": "Projects", "description": "All portfolio projects.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://blogs", "name": "blogs", "title": "Blog Posts", "description": "Published blog post summaries.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://deployments", "name": "deployments", "title": "Deployments", "description": "Live deployments / hosted apps.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://api-catalog", "name": "api-catalog", "title": "API Catalog", "description": "Public REST API catalog.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://ai-page", "name": "ai-page", "title": "AI Hub Page Config", "description": "Schema-driven section config for the /ai page.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://ai-skills", "name": "ai-skills", "title": "AI Skills", "description": "AI skills grouped by category.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://ai-recommendations", "name": "ai-recommendations", "title": "AI Recommendations", "description": "Recommended AI stack cards.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://ai-credits", "name": "ai-credits", "title": "AI Free Credits", "description": "Free credits & free-tier providers.", "mimeType": "application/json" }),
        json!({ "uri": "aiyu://ai-prompts", "name": "ai-prompts", "title": "AI Prompt Library", "description": "Reusable system prompts.", "mimeType": "application/json" }),
    ]
}

fn prompt_schemas() -> Vec<Value> {
    vec![json!({
        "name": "introduce_developer",
        "title": "Introduce the developer",
        "description": "Draft a concise introduction of the developer using the profile and projects.",
        "arguments": [{ "name": "tone", "description": "Optional tone, e.g. \"formal\" or \"casual\".", "required": false }],
    })]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_matches_node_mcp() {
        assert_eq!(mcp_slugify("  Hello, World!! 2026 -- "), "hello-world-2026");
        assert_eq!(mcp_slugify("Ünïcode Post"), "n-code-post");
    }
}
