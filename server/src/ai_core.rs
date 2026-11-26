//! The AI Core: provider settings, model lists, key checks, text and caption generation, and the health analyzer
//! (src/app/api/admin/ai/*, src/app/api/admin/health/analyze, src/lib/aiText.js).

use std::{sync::LazyLock, time::Duration};

use axum::{
    extract::{FromRequest, Multipart, RawQuery, Request, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use base64::Engine;
use regex::{Captures, Regex};
use reqwest::RequestBuilder;
use serde_json::{Map, Value, json};

use crate::{
    AppState,
    admin_settings::{failed, failure, unauthorized, unauthorized_with_message},
    admin_site::CONFIG,
    ai_modes, images,
    api::{json_status, log_error, query_map, signed_in, truthy},
    pages,
    site_api::js_string,
    uploads, write,
    write::{Kind, Table},
};

const LOG: Table = Table {
    name: "AiLog",
    columns: &[
        ("provider", Kind::Text), ("model", Kind::Text), ("mode", Kind::Text), ("prompt", Kind::OptText), ("response", Kind::OptText),
        ("inputTokens", Kind::Int), ("outputTokens", Kind::Int), ("totalTokens", Kind::Int),
    ],
    created_at: true,
    updated_at: true,
};

/// What the settings page sends back for a key it was never shown.
const MASK: &str = "•••• •••• •••• ••••";
const DEFAULT_INSTRUCTION: &str = "You are a helpful assistant for the portfolio admin.";
const NAMES: &[(&str, &str)] = &[
    ("google", "Google API"), ("openai", "OpenAI API"), ("groq", "Groq API"), ("openrouter", "OpenRouter API"),
    ("anthropic", "Anthropic API"), ("cohere", "Cohere API"), ("perplexity", "Perplexity API"), ("replicate", "Replicate API"),
    ("together", "Together API"), ("mistral", "Mistral API"), ("deepseek", "DeepSeek API"), ("fireworks", "Fireworks API"),
    ("xai", "xAI API"), ("stabilityai", "Stability API"), ("aws", "AWS API"), ("azure", "Azure API"),
];

// ── shared ─────────────────────────────────────────────────────────────────────────────────────────────

/// A provider's address, or the same one under `AI_API_BASE_URL/<host>` (a local stand-in used by the tests).
fn address(url: &str) -> String {
    match (std::env::var("AI_API_BASE_URL").ok().filter(|v| !v.is_empty()), url.strip_prefix("https://")) {
        (Some(base), Some(rest)) => format!("{}/{rest}", base.trim_end_matches('/')),
        _ => url.to_string(),
    }
}

/// `value || fallback`
fn or(value: &Value, fallback: &str) -> Value {
    if truthy(value) { value.clone() } else { fallback.into() }
}

fn list(value: &Value) -> Value {
    if value.is_array() { value.clone() } else { json!([]) }
}

fn items(value: &Value) -> &[Value] {
    value.as_array().map(Vec::as_slice).unwrap_or_default()
}

/// `text.substring(0, units)`, counted in UTF-16 units like JavaScript.
fn head(text: &str, units: usize) -> String {
    let wide: Vec<u16> = text.encode_utf16().take(units).collect();
    String::from_utf16_lossy(&wide)
}

/// The stored configuration with its secret columns (`getSingleton(..., { withSecrets: true })`), or null.
pub(crate) async fn stored_config(state: &AppState) -> anyhow::Result<Value> {
    let raw: Option<String> = sqlx::query_scalar(r#"SELECT row_to_json(t)::text FROM "Config" t LIMIT 1"#).fetch_optional(&state.db).await?;
    let Some(raw) = raw else { return Ok(Value::Null) };
    let mut row: Map<String, Value> = serde_json::from_str(&raw)?;
    let mut out = match row.shift_remove("data") {
        Some(Value::Object(data)) => data,
        _ => Map::new(),
    };
    for &secret in CONFIG.secrets {
        if let Some(v) = row.shift_remove(secret).filter(|v| !v.is_null()) {
            out.insert(secret.into(), v);
        }
    }
    Ok(Value::Object(out))
}

fn open(state: &AppState, stored: &Value) -> Option<String> {
    stored.as_str().and_then(|s| state.cipher.decrypt(s)).filter(|s| !s.is_empty())
}

/// Sends a request and reads the reply: the status and the body text. The error says nothing about the address,
/// which holds the key for Google.
async fn send(request: RequestBuilder, timeout: Duration) -> anyhow::Result<(StatusCode, String)> {
    let failed = |err: reqwest::Error| {
        if err.is_timeout() {
            anyhow::anyhow!("Upstream request timed out after {}ms", timeout.as_millis())
        } else {
            anyhow::anyhow!("fetch failed")
        }
    };
    let response = request.timeout(timeout).send().await.map_err(failed)?;
    let status = response.status();
    Ok((status, response.text().await.map_err(failed)?))
}

// ── settings ───────────────────────────────────────────────────────────────────────────────────────────

/// The settings as the page sees them: keys are only reported as present.
fn shown(ai: &Value, instruction: &str) -> Map<String, Value> {
    let providers: Vec<Value> = items(&ai["providers"])
        .iter()
        .map(|p| {
            let mut out: Map<String, Value> = ["id", "name", "type"].iter().filter_map(|&k| Some((k.to_string(), p.get(k)?.clone()))).collect();
            out.insert("hasKey".into(), truthy(&p["apiKey"]).into());
            Value::Object(out)
        })
        .collect();
    let enabled = if ai["enabled"].is_null() { Value::Bool(false) } else { ai["enabled"].clone() };
    let Value::Object(out) = json!({
        "enabled": enabled,
        "systemInstruction": or(&ai["systemInstruction"], instruction),
        "gatewayUrl": or(&ai["gatewayUrl"], ""),
        "hasGatewayApiKey": truthy(&ai["gatewayApiKey"]),
        "providers": providers,
        "models": list(&ai["models"]),
        "textPriority": list(&ai["textPriority"]),
        "imagePriority": list(&ai["imagePriority"]),
    }) else { unreachable!() };
    out
}

/// `GET /api/admin/ai/config`
pub async fn config(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized_with_message();
    }
    let result: anyhow::Result<Value> = async {
        let mut config = stored_config(&state).await?;
        if config.is_null() {
            config = write::upsert_singleton(&state.db, &CONFIG, &Map::new()).await?;
        }
        let ai = &config["ai"];
        let mut data = shown(ai, DEFAULT_INSTRUCTION);
        // Fields older clients read.
        data.insert("provider".into(), or(&ai["provider"], "gemini"));
        data.insert("model".into(), or(&ai["model"], "gemini-1.5-flash"));
        data.insert("enabledProviders".into(), if truthy(&ai["enabledProviders"]) { ai["enabledProviders"].clone() } else { json!(["gemini"]) });
        data.insert("hasKey".into(), json!({
            "gemini": truthy(&config["encryptedGeminiApiKey"]),
            "groq": truthy(&config["encryptedGroqApiKey"]),
            "openrouter": truthy(&config["encryptedOpenRouterApiKey"]),
        }));
        Ok(json!({ "success": true, "data": data }))
    }
    .await;
    result.map(|v| json_status(StatusCode::OK, v)).unwrap_or_else(|err| {
        log_error("/api/admin/ai/config", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch configuration")
    })
}

/// The first of `Google API`, `Google API 1`, ... that no other provider uses.
fn provider_name(kind: &Value, existing: &[&Value], own: Option<&Value>) -> String {
    let base = NAMES.iter().find(|(k, _)| kind.as_str() == Some(k)).map_or("AI API", |(_, name)| name);
    let taken = |name: &str| existing.iter().any(|p| p.get("id") != own && p["name"].as_str() == Some(name));
    let mut candidate = base.to_string();
    let mut counter = 1;
    while taken(&candidate) {
        candidate = format!("{base} {counter}");
        counter += 1;
    }
    candidate
}

/// A key as it is stored: sealed, or null for an empty one. Node's cipher refuses anything but a string.
fn seal(state: &AppState, key: &Value) -> anyhow::Result<Value> {
    if !truthy(key) {
        return Ok(Value::Null);
    }
    let Some(key) = key.as_str() else { anyhow::bail!("API keys must be strings") };
    Ok(state.cipher.encrypt(key).map_or(Value::Null, Value::String))
}

async fn save_config(state: &AppState, body: Value) -> anyhow::Result<Value> {
    anyhow::ensure!(!body.is_null(), "Cannot read a null body");
    let current = stored_config(state).await?;
    let mut ai = current["ai"].as_object().cloned().unwrap_or_default();
    for key in ["enabled", "systemInstruction", "gatewayUrl"] {
        if let Some(v) = body.get(key) {
            ai.insert(key.into(), v.clone());
        }
    }
    if let Some(key) = body.get("gatewayApiKey") {
        if key.as_str() == Some("") {
            ai.insert("gatewayApiKey".into(), Value::Null);
        } else if key.as_str() != Some(MASK) {
            ai.insert("gatewayApiKey".into(), seal(state, key)?);
        }
    }

    let existing = items(ai.get("providers").unwrap_or(&Value::Null)).to_vec();
    let given = match body.get("providers") {
        Some(v) => v.as_array().cloned().ok_or_else(|| anyhow::anyhow!("providers is not iterable"))?,
        None => Vec::new(),
    };
    let mut providers: Vec<Value> = Vec::new();
    for provider in &given {
        anyhow::ensure!(!provider.is_null(), "a provider is null");
        let id = provider.get("id");
        let old = existing.iter().find(|p| p.get("id") == id);
        let mut key = old.map(|p| p["apiKey"].clone()).filter(truthy).unwrap_or(Value::Null);
        match provider.get("apiKey") {
            Some(v) if v.as_str() == Some("") => key = Value::Null,
            Some(v) if v.as_str() != Some(MASK) => key = seal(state, v)?,
            _ => {}
        }
        let name = &provider["name"];
        let name = if !truthy(name) || name.as_str().is_some_and(|n| n.trim().is_empty()) {
            provider_name(&provider["type"], &providers.iter().chain(&existing).collect::<Vec<_>>(), id)
        } else {
            name.as_str().ok_or_else(|| anyhow::anyhow!("provider names must be strings"))?.to_string()
        };
        let mut next = Map::new();
        if let Some(id) = id {
            next.insert("id".into(), id.clone());
        }
        next.insert("name".into(), name.trim().into());
        if let Some(kind) = provider.get("type") {
            next.insert("type".into(), kind.clone());
        }
        next.insert("apiKey".into(), key);
        providers.push(Value::Object(next));
    }

    let mut patch = Map::new();
    // The old per-provider columns follow the first provider of each kind.
    for (kind, column) in [("google", "encryptedGeminiApiKey"), ("groq", "encryptedGroqApiKey"), ("openrouter", "encryptedOpenRouterApiKey")] {
        if let Some(p) = providers.iter().find(|p| p["type"].as_str() == Some(kind)).filter(|p| truthy(&p["apiKey"])) {
            patch.insert(column.into(), p["apiKey"].clone());
        }
    }
    ai.insert("providers".into(), providers.into());
    for key in ["models", "textPriority", "imagePriority"] {
        ai.insert(key.into(), body.get(key).cloned().unwrap_or_else(|| json!([])));
    }
    patch.insert("ai".into(), Value::Object(ai));
    let updated = write::upsert_singleton(&state.db, &CONFIG, &patch).await?;
    Ok(json!({ "success": true, "data": shown(&updated["ai"], "") }))
}

/// `PUT /api/admin/ai/config`
pub async fn put_config(State(state): State<AppState>, req: Request) -> Response {
    const ROUTE: &str = "/api/admin/ai/config";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized_with_message();
    }
    let Some(body) = write::json_body(body).await else { return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body") };
    save_config(&state, body)
        .await
        .map(|v| json_status(StatusCode::OK, v))
        .unwrap_or_else(|err| failed(ROUTE, StatusCode::INTERNAL_SERVER_ERROR, err))
}

// ── model lists ────────────────────────────────────────────────────────────────────────────────────────

/// A provider's reply to a model listing, as the picker shows it. None when it does not look as expected.
fn listed(kind: &str, reply: &Value) -> Option<Vec<Value>> {
    let model = |id: &Value, name: Value, desc: String, free: bool| json!({ "id": id, "name": name, "desc": desc, "provider": kind, "isFree": free });
    if kind == "google" {
        let mut out = Vec::new();
        for m in reply["models"].as_array()? {
            let full = m["name"].as_str()?;
            if !full.contains("gemini") || !m["supportedGenerationMethods"].as_array()?.iter().any(|v| v == "generateContent") {
                continue;
            }
            let id = full.replacen("models/", "", 1);
            let free = id.contains("flash") || id.contains("lite");
            let label = if truthy(&m["displayName"]) { js_string(&m["displayName"]) } else { id.clone() };
            let label = if free { format!("[Free] {label}") } else { label };
            let desc = if truthy(&m["description"]) { js_string(&m["description"]) } else { "Google Gemini Model".into() };
            out.push(model(&id.into(), label.into(), desc, free));
        }
        return Some(out);
    }
    let data = reply["data"].as_array()?;
    let mut out = Vec::new();
    for m in data {
        out.push(match kind {
            "openai" => {
                let id = m["id"].as_str()?;
                if !["gpt-", "o1", "o3"].iter().any(|p| id.starts_with(p)) {
                    continue;
                }
                model(&m["id"], m["id"].clone(), "OpenAI GPT Model".into(), false)
            }
            "groq" => {
                let id = m["id"].as_str()?;
                if id.contains("whisper") {
                    continue;
                }
                let owner = m.get("owned_by").map_or_else(|| "undefined".into(), js_string);
                model(&m["id"], format!("[Free] {id}").into(), format!("Owned by {owner}"), true)
            }
            "openrouter" => {
                let zero = |v: &Value| js_string(v).trim().parse::<f64>().is_ok_and(|n| n == 0.0);
                let price = &m["pricing"];
                let free = !truthy(price) || (zero(&price["prompt"]) && zero(&price["completion"]));
                let label = if truthy(&m["name"]) { &m["name"] } else { &m["id"] };
                let label = if free { Value::String(format!("[Free] {}", js_string(label))) } else { label.clone() };
                let desc = match m["description"].as_str().filter(|d| !d.is_empty()) {
                    Some(d) => format!("{}...", head(d, 100)),
                    None => format!("Provider: {}", if free { "Free" } else { "Paid" }),
                };
                model(&m["id"], label, desc, free)
            }
            _ => model(&m["id"], m["id"].clone(), format!("{} Model", kind.to_uppercase()), false),
        });
    }
    Some(out)
}

/// The models a key can use; an unreachable or unfamiliar provider lists none.
async fn models_of(state: &AppState, kind: &str, key: &str) -> Vec<Value> {
    let url = match kind {
        "google" => format!("https://generativelanguage.googleapis.com/v1beta/models?key={key}"),
        "openai" => "https://api.openai.com/v1/models".into(),
        "groq" => "https://api.groq.com/openai/v1/models".into(),
        "openrouter" => "https://openrouter.ai/api/v1/models".into(),
        "mistral" => "https://api.mistral.ai/v1/models".into(),
        "deepseek" => "https://api.deepseek.com/v1/models".into(),
        "together" => "https://api.together.xyz/v1/models".into(),
        "fireworks" => "https://api.fireworks.ai/inference/v1/models".into(),
        "xai" => "https://api.x.ai/v1/models".into(),
        _ => return Vec::new(),
    };
    let mut request = state.http.get(address(&url));
    // Google takes the key in the address; OpenRouter's list is public.
    if !matches!(kind, "google" | "openrouter") {
        request = request.bearer_auth(key);
    }
    match send(request, Duration::from_secs(30)).await {
        Ok((status, text)) if status.is_success() => serde_json::from_str(&text).ok().and_then(|v| listed(kind, &v)).unwrap_or_default(),
        Ok((status, _)) => {
            tracing::warn!(kind, %status, "model list refused");
            Vec::new()
        }
        Err(err) => {
            tracing::warn!(kind, error = %err, "model list failed");
            Vec::new()
        }
    }
}

/// `GET /api/admin/ai/models?providerId=`: the models of the stored providers.
pub async fn models(State(state): State<AppState>, headers: HeaderMap, RawQuery(query): RawQuery) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized_with_message();
    }
    let wanted = query_map(&query).get("providerId").filter(|v| !v.is_empty()).cloned().unwrap_or_else(|| "all".into());
    let result: anyhow::Result<Vec<Value>> = async {
        let config = stored_config(&state).await?;
        let providers = items(&config["ai"]["providers"]);
        let chosen: Vec<&Value> = if wanted == "all" {
            providers.iter().collect()
        } else {
            providers.iter().find(|p| p["id"].as_str() == Some(&wanted)).into_iter().collect()
        };
        let mut out = Vec::new();
        for p in chosen {
            let Some(key) = open(&state, &p["apiKey"]) else { continue };
            for mut model in models_of(&state, p["type"].as_str().unwrap_or(""), &key).await {
                if let (Some(fields), Some(id)) = (model.as_object_mut(), p.get("id")) {
                    fields.insert("providerInstanceId".into(), id.clone());
                }
                out.push(model);
            }
        }
        Ok(out)
    }
    .await;
    result
        .map(|data| json_status(StatusCode::OK, json!({ "success": true, "data": data })))
        .unwrap_or_else(|err| failed("/api/admin/ai/models", StatusCode::INTERNAL_SERVER_ERROR, err))
}

/// Session check, then `{ type, apiKey }` from the body: the shape of the two key routes.
async fn typed_key(state: &AppState, req: Request, missing: &str) -> Result<(String, String), Response> {
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await {
        return Err(unauthorized_with_message());
    }
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else {
        return Err(failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body"));
    };
    if !truthy(&body["type"]) || !truthy(&body["apiKey"]) {
        return Err(failure(StatusCode::BAD_REQUEST, missing));
    }
    Ok((js_string(&body["type"]), js_string(&body["apiKey"])))
}

/// `POST /api/admin/ai/models`: the models of a key that is not saved yet.
pub async fn discover_models(State(state): State<AppState>, req: Request) -> Response {
    match typed_key(&state, req, "Type and API key are required.").await {
        Ok((kind, key)) => json_status(StatusCode::OK, json!({ "success": true, "data": models_of(&state, &kind, &key).await })),
        Err(refusal) => refusal,
    }
}

// ── key check ──────────────────────────────────────────────────────────────────────────────────────────

/// Asks the provider whether it accepts the key. The error is what the settings page shows.
async fn check_key(state: &AppState, kind: &str, key: &str) -> Result<(), String> {
    let get = |url: &str| state.http.get(address(url));
    let minimal = |url: &str, model: &str| {
        state.http.post(address(url)).json(&json!({ "model": model, "max_tokens": 1, "messages": [{ "role": "user", "content": "hi" }] }))
    };
    let (label, request) = match kind {
        "google" => ("Google", get(&format!("https://generativelanguage.googleapis.com/v1beta/models?key={key}"))),
        "openai" => ("OpenAI", get("https://api.openai.com/v1/models").bearer_auth(key)),
        "groq" => ("Groq", get("https://api.groq.com/openai/v1/models").bearer_auth(key)),
        "openrouter" => ("OpenRouter", get("https://openrouter.ai/api/v1/auth/key").bearer_auth(key)),
        "anthropic" => ("Anthropic", minimal("https://api.anthropic.com/v1/messages", "claude-3-5-haiku-20241022").header("x-api-key", key).header("anthropic-version", "2023-06-01")),
        "deepseek" => (kind, get("https://api.deepseek.com/v1/models").bearer_auth(key)),
        "mistral" => (kind, get("https://api.mistral.ai/v1/models").bearer_auth(key)),
        "together" => (kind, get("https://api.together.xyz/v1/models").bearer_auth(key)),
        "fireworks" => (kind, get("https://api.fireworks.ai/inference/v1/models").bearer_auth(key)),
        "xai" => (kind, get("https://api.x.ai/v1/models").bearer_auth(key)),
        "cohere" => (kind, get("https://api.cohere.com/v1/models").bearer_auth(key)),
        "perplexity" => ("Perplexity", minimal("https://api.perplexity.ai/chat/completions", "sonar").bearer_auth(key)),
        "replicate" => ("Replicate", get("https://api.replicate.com/v1/account").header("authorization", format!("Token {key}"))),
        "stabilityai" => ("Stability AI", get("https://api.stability.ai/v1/user/account").bearer_auth(key)),
        // Reached through the gateway only: there is nothing to check here.
        "aws" | "azure" => return Ok(()),
        _ => return Err("Invalid API Key".into()),
    };
    let (status, text) = send(request, Duration::from_secs(30)).await.map_err(|e| e.to_string())?;
    let anthropic = kind == "anthropic";
    if if anthropic { status == StatusCode::OK } else { status.is_success() } {
        return Ok(());
    }
    let reply: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
    let error = &reply["error"];
    // A malformed request means the key was read and accepted.
    if anthropic && status == StatusCode::BAD_REQUEST && error["type"] == "invalid_request_error" {
        return Ok(());
    }
    let message = if kind == "stabilityai" { &reply["errors"][0]["message"] } else { &error["message"] };
    Err(if truthy(message) {
        js_string(message)
    } else if anthropic && status == StatusCode::BAD_REQUEST {
        "Invalid Request".into()
    } else {
        format!("{label} API returned status {}", status.as_u16())
    })
}

/// `POST /api/admin/ai/validate-provider`
pub async fn validate_provider(State(state): State<AppState>, req: Request) -> Response {
    let (kind, key) = match typed_key(&state, req, "Provider type and API key are required.").await {
        Ok(pair) => pair,
        Err(refusal) => return refusal,
    };
    match check_key(&state, &kind, &key).await {
        Ok(()) => json_status(StatusCode::OK, json!({ "success": true })),
        Err(message) => failure(StatusCode::BAD_REQUEST, &message),
    }
}

// ── asking a model ─────────────────────────────────────────────────────────────────────────────────────

#[derive(Default)]
pub(crate) struct Answer {
    pub text: String,
    input: i64,
    output: i64,
    total: i64,
}

pub(crate) struct Image {
    mime: String,
    base64: String,
}

impl Image {
    fn data_url(&self) -> String {
        format!("data:{};base64,{}", self.mime, self.base64)
    }
}

struct Ask<'a> {
    kind: &'a str,
    model: &'a Value,
    key: &'a str,
    system: &'a str,
    prompt: &'a Value,
    /// A caption request: the picture goes with the prompt, and the provider gets more time.
    image: Option<&'a Image>,
}

impl Ask<'_> {
    fn timeout(&self) -> Duration {
        Duration::from_secs(if self.image.is_some() { 45 } else { 30 })
    }

    /// The user message in the OpenAI shape.
    fn content(&self) -> Value {
        match self.image {
            Some(image) => json!([{ "type": "text", "text": self.prompt }, { "type": "image_url", "image_url": { "url": image.data_url() } }]),
            None => self.prompt.clone(),
        }
    }

    fn messages(&self) -> Value {
        json!([{ "role": "system", "content": self.system }, { "role": "user", "content": self.content() }])
    }
}

fn count(value: &Value) -> i64 {
    value.as_i64().unwrap_or(0)
}

fn openai_answer(reply: &Value) -> Answer {
    let usage = &reply["usage"];
    Answer {
        text: reply["choices"][0]["message"]["content"].as_str().unwrap_or("").into(),
        input: count(&usage["prompt_tokens"]),
        output: count(&usage["completion_tokens"]),
        total: count(&usage["total_tokens"]),
    }
}

async fn reply_json(request: RequestBuilder, timeout: Duration, refusal: impl FnOnce(u16, &str) -> String) -> anyhow::Result<Value> {
    let (status, text) = send(request, timeout).await?;
    if !status.is_success() {
        anyhow::bail!(refusal(status.as_u16(), &text));
    }
    Ok(serde_json::from_str(&text)?)
}

/// Gemini's `generateContent`, as `@google/genai` calls it.
async fn gemini(state: &AppState, model: &str, ask: &Ask<'_>) -> anyhow::Result<Answer> {
    let mut parts = vec![json!({ "text": ask.prompt })];
    if let Some(image) = ask.image {
        parts.push(json!({ "inlineData": { "mimeType": image.mime, "data": image.base64 } }));
    }
    let body = json!({
        "contents": [{ "role": "user", "parts": parts }],
        "systemInstruction": { "role": "user", "parts": [{ "text": ask.system }] },
        "generationConfig": {},
    });
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent");
    let request = state.http.post(address(&url)).header("x-goog-api-key", ask.key).json(&body);
    // The library's error message is the reply itself.
    let reply = reply_json(request, ask.timeout(), |_, text| serde_json::from_str::<Value>(text).map_or_else(|_| text.to_string(), |v| v.to_string())).await?;
    let text = items(&reply["candidates"][0]["content"]["parts"]).iter().filter(|p| p["thought"] != true).filter_map(|p| p["text"].as_str()).collect();
    let usage = &reply["usageMetadata"];
    Ok(Answer { text, input: count(&usage["promptTokenCount"]), output: count(&usage["candidatesTokenCount"]), total: count(&usage["totalTokenCount"]) })
}

/// The provider's own API.
async fn direct(state: &AppState, ask: &Ask<'_>) -> anyhow::Result<Answer> {
    let vision = if ask.image.is_some() { " Vision" } else { "" };
    if ask.kind == "google" {
        let model = ask.model.as_str().filter(|m| !m.is_empty() && !m.contains("1.5-flash")).unwrap_or("gemini-2.0-flash-lite");
        return gemini(state, model, ask).await;
    }
    if ask.kind == "anthropic" {
        let content = match ask.image {
            Some(image) => json!([
                { "type": "image", "source": { "type": "base64", "media_type": image.mime, "data": image.base64 } },
                { "type": "text", "text": ask.prompt },
            ]),
            None => ask.prompt.clone(),
        };
        let body = json!({ "model": ask.model, "max_tokens": 4096, "system": ask.system, "messages": [{ "role": "user", "content": content }] });
        let request = state.http.post(address("https://api.anthropic.com/v1/messages")).header("x-api-key", ask.key).header("anthropic-version", "2023-06-01").json(&body);
        let reply = reply_json(request, ask.timeout(), |status, text| format!("Direct Anthropic{vision} API Error ({status}): {text}")).await?;
        let (input, output) = (count(&reply["usage"]["input_tokens"]), count(&reply["usage"]["output_tokens"]));
        return Ok(Answer { text: reply["content"][0]["text"].as_str().unwrap_or("").into(), input, output, total: input + output });
    }
    let endpoint = match ask.kind {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "groq" => "https://api.groq.com/openai/v1/chat/completions",
        "openrouter" => "https://openrouter.ai/api/v1/chat/completions",
        "deepseek" => "https://api.deepseek.com/v1/chat/completions",
        "perplexity" => "https://api.perplexity.ai/chat/completions",
        "mistral" => "https://api.mistral.ai/v1/chat/completions",
        "together" => "https://api.together.xyz/v1/chat/completions",
        "fireworks" => "https://api.fireworks.ai/inference/v1/chat/completions",
        "xai" => "https://api.x.ai/v1/chat/completions",
        "cohere" => "https://api.cohere.com/v2/chat/completions",
        kind => {
            let calls = if ask.image.is_some() { "vision calls" } else { "calls" };
            anyhow::bail!("Direct {calls} to {kind} are not supported. This provider must be routed through Vercel AI Gateway.")
        }
    };
    let mut request = state.http.post(address(endpoint)).bearer_auth(ask.key);
    if ask.kind == "openrouter" {
        request = request.header("HTTP-Referer", "https://aiyu.dev").header("X-Title", "Aiyu Portfolio");
    }
    let request = request.json(&json!({ "model": ask.model, "messages": ask.messages() }));
    Ok(openai_answer(&reply_json(request, ask.timeout(), |status, text| format!("Direct API Error ({status}): {text}")).await?))
}

/// Vercel's AI Gateway, with the provider's key sent along (BYOK).
async fn gateway(state: &AppState, base: &str, gateway_key: &str, ask: &Ask<'_>) -> anyhow::Result<Answer> {
    let base = if base.is_empty() { "https://ai-gateway.vercel.sh/v1" } else { base };
    let slug = match ask.kind {
        "aws" => "bedrock",
        "azure" => "azure-openai",
        kind => kind,
    };
    let mut byok = Map::new();
    byok.insert(slug.to_string(), json!([{ "apiKey": ask.key }]));
    let model = if ask.model.is_null() { "undefined".into() } else { js_string(ask.model) };
    let body = json!({ "model": format!("{slug}/{model}"), "messages": ask.messages(), "providerOptions": { "gateway": { "byok": byok } } });
    let url = format!("{}/chat/completions", base.strip_suffix('/').unwrap_or(base));
    let mut request = state.http.post(address(&url)).json(&body);
    if !gateway_key.is_empty() {
        request = request.bearer_auth(gateway_key);
    }
    Ok(openai_answer(&reply_json(request, ask.timeout(), |status, text| format!("AI Gateway Error ({status}): {text}")).await?))
}

pub(crate) struct Won {
    pub answer: Answer,
    pub provider: Value,
    pub model: Value,
}

/// Why no model answered.
pub(crate) enum Miss {
    NoModels,
    /// The last provider's error.
    Failed(String),
}

#[derive(Default, Clone, Copy)]
pub(crate) struct Rules {
    /// The SEO fixer calls only Gemini directly: any other provider must go through the gateway.
    pub google_only: bool,
    /// The SEO fixer takes the first reply, even an empty one.
    pub accept_empty: bool,
}

/// The configured models in the order of `priority`, until one answers.
pub(crate) async fn first_answer(state: &AppState, ai: &Value, priority: &str, system: &str, prompt: &Value, image: Option<&Image>, rules: Rules) -> Result<Won, Miss> {
    let providers = items(&ai["providers"]);
    let mut chosen: Vec<Value> = items(&ai[priority])
        .iter()
        .filter_map(|id| items(&ai["models"]).iter().find(|m| m.get("id") == Some(id)))
        .filter(|m| truthy(m))
        .cloned()
        .collect();
    if chosen.is_empty() {
        if let Some(google) = providers.iter().find(|p| p["type"] == "google") {
            chosen.push(json!({ "modelId": or(&ai["model"], "gemini-1.5-flash"), "providerId": google["id"] }));
        }
    }
    if chosen.is_empty() {
        return Err(Miss::NoModels);
    }
    let env = |name: &str| std::env::var(name).unwrap_or_default();
    let gateway_url = ai["gatewayUrl"].as_str().filter(|u| !u.is_empty()).map_or_else(|| env("AI_GATEWAY_URL"), str::to_string);
    let env_key = env("AI_GATEWAY_API_KEY");
    let gateway_key = if truthy(&ai["gatewayApiKey"]) { open(state, &ai["gatewayApiKey"]).unwrap_or_default() } else { env_key.clone() };
    let through_gateway = !gateway_url.is_empty() || !gateway_key.is_empty() || !env_key.is_empty();
    // A stored gateway key that cannot be read is sent as nothing, and the environment's key takes its place.
    let sent_key = if gateway_key.is_empty() { env_key } else { gateway_key };

    let mut last = None;
    for model in &chosen {
        let Some(provider) = providers.iter().find(|p| p.get("id") == model.get("providerId")) else { continue };
        let Some(key) = open(state, &provider["apiKey"]) else { continue };
        let kind = provider["type"].as_str().unwrap_or("");
        let ask = Ask { kind, model: &model["modelId"], key: &key, system, prompt, image };
        let fallback = || async {
            anyhow::ensure!(!rules.google_only || kind == "google", "Direct calls to {kind} are not supported. This provider must be routed through Vercel AI Gateway.");
            direct(state, &ask).await
        };
        let result = if through_gateway && kind != "openrouter" {
            match gateway(state, &gateway_url, &sent_key, &ask).await {
                Ok(answer) => Ok(answer),
                Err(err) => {
                    tracing::warn!(kind, error = %err, "AI gateway failed, calling the provider");
                    fallback().await
                }
            }
        } else {
            fallback().await
        };
        match result {
            Ok(answer) if rules.accept_empty || !answer.text.is_empty() => return Ok(Won { answer, provider: provider["type"].clone(), model: model["modelId"].clone() }),
            Ok(_) => {}
            Err(err) => {
                tracing::warn!(kind, error = %err, "AI model failed");
                last = Some(err.to_string());
            }
        }
    }
    Err(Miss::Failed(last.unwrap_or_else(|| "Unknown configuration issue.".into())))
}

/// The refusal of the text and caption routes.
fn refusal(miss: Miss, vision: bool) -> Response {
    match miss {
        Miss::NoModels => {
            let message = if vision { "No AI vision models configured for captioning." } else { "No AI models configured in priority list. Please check settings." };
            failure(StatusCode::FORBIDDEN, message)
        }
        Miss::Failed(last) => {
            let vision = if vision { " vision" } else { "" };
            failure(StatusCode::INTERNAL_SERVER_ERROR, &format!("All configured AI{vision} fallback mechanisms failed. Last API error: {last}"))
        }
    }
}

/// The usage record. A failure to write it does not fail the request.
pub(crate) async fn record(state: &AppState, provider: &Value, model: &Value, mode: Value, prompt: &Value, answer: &Answer) {
    let row = json!({
        "provider": provider, "model": model, "mode": mode, "prompt": prompt, "response": answer.text.trim(),
        "inputTokens": answer.input, "outputTokens": answer.output, "totalTokens": answer.total,
    });
    let written = match write::prepare(&LOG, &row) {
        Ok(data) => write::insert(&state.db, &LOG, data).await.map(|_| ()),
        Err(err) => Err(err),
    };
    if let Err(err) = written {
        log_error("AI usage record", &err);
    }
}

/// The configuration, when the AI Core is switched on.
async fn enabled_config(state: &AppState, route: &str) -> Result<Value, Response> {
    let config = stored_config(state).await.map_err(|err| failed(route, StatusCode::INTERNAL_SERVER_ERROR, err))?;
    if !truthy(&config["ai"]["enabled"]) {
        return Err(failure(StatusCode::FORBIDDEN, "AI system is disabled."));
    }
    Ok(config)
}

// ── text ───────────────────────────────────────────────────────────────────────────────────────────────

static PLACEHOLDER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\$\{(?:prompt(?:\.substring\(0, (\d+)\))?|context\?\.(\w+)(?: \|\| '([^']*)')?)\}").expect("constant pattern")
});

/// The instruction and prompt of a writing mode; any other mode sends the prompt as it is.
fn compose(mode: &Value, base: &str, prompt: &Value, context: &Value) -> anyhow::Result<(String, Value)> {
    let Some(mode) = ai_modes::MODES.iter().find(|m| mode.as_str() == Some(m.name)) else { return Ok((base.to_string(), prompt.clone())) };
    let text = |v: Option<&Value>| v.map_or_else(|| "undefined".to_string(), js_string);
    let mut cut_needs_text = false;
    let filled = PLACEHOLDER.replace_all(mode.prompt, |c: &Captures| match (c.get(1), c.get(2)) {
        (Some(units), _) => {
            cut_needs_text |= !prompt.is_string();
            head(prompt.as_str().unwrap_or(""), units.as_str().parse().unwrap_or(0))
        }
        (None, Some(field)) => {
            let value = context.get(field.as_str());
            match c.get(3) {
                Some(fallback) if !value.is_some_and(truthy) => fallback.as_str().to_string(),
                _ => text(value),
            }
        }
        (None, None) => text(Some(prompt).filter(|p| !p.is_null())),
    });
    anyhow::ensure!(!cut_needs_text, "prompt.substring is not a function");
    Ok((format!("{base}{}", mode.system), filled.into_owned().into()))
}

/// Models wrap their answer in a code fence even when told not to.
fn unfence(text: &str) -> String {
    static WHOLE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^```(?:json|javascript|js)?\s*([\s\S]*?)```$").expect("constant pattern"));
    static OPENING: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^```[a-z]*\n").expect("constant pattern"));
    let text = text.trim();
    if !text.starts_with("```") {
        return text.to_string();
    }
    if let Some(inner) = WHOLE.captures(text).and_then(|c| c.get(1)).filter(|m| !m.as_str().is_empty()) {
        return inner.as_str().trim().to_string();
    }
    let opened = OPENING.replace(text, "");
    opened.strip_suffix("```").unwrap_or(&opened).trim().to_string()
}

/// `POST /api/admin/ai/text`
pub async fn text(State(state): State<AppState>, req: Request) -> Response {
    const ROUTE: &str = "/api/admin/ai/text";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized_with_message();
    }
    let config = match enabled_config(&state, ROUTE).await {
        Ok(config) => config,
        Err(refusal) => return refusal,
    };
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body");
    };
    let (prompt, mode) = (&body["prompt"], &body["mode"]);
    if !truthy(prompt) && mode.as_str() != Some("proofread") {
        return failure(StatusCode::BAD_REQUEST, "No prompt provided.");
    }
    let ai = &config["ai"];
    let base = js_string(&or(&ai["systemInstruction"], "You are a helpful assistant."));
    let (system, asked) = match compose(mode, &base, prompt, &body["context"]) {
        Ok(composed) => composed,
        Err(err) => return failed(ROUTE, StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    let won = match first_answer(&state, ai, "textPriority", &system, &asked, None, Rules::default()).await {
        Ok(won) => won,
        Err(miss) => return refusal(miss, false),
    };
    record(&state, &won.provider, &won.model, or(mode, "text"), prompt, &won.answer).await;
    json_status(StatusCode::OK, json!({ "success": true, "data": unfence(&won.answer.text) }))
}

// ── captions ───────────────────────────────────────────────────────────────────────────────────────────

/// `POST /api/admin/ai/generate`: a caption for an uploaded picture.
pub async fn generate(State(state): State<AppState>, req: Request) -> Response {
    const ROUTE: &str = "/api/admin/ai/generate";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized_with_message();
    }
    let config = match enabled_config(&state, ROUTE).await {
        Ok(config) => config,
        Err(refusal) => return refusal,
    };
    let broken = || failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid form data");
    let Ok(mut form) = Multipart::from_request(Request::from_parts(parts, body), &state).await else { return broken() };
    let mut file = None;
    let mut prompt = None;
    loop {
        let field = match form.next_field().await {
            Ok(Some(field)) => field,
            Ok(None) => break,
            Err(_) => return broken(),
        };
        let name = field.name().unwrap_or("").to_string();
        let filename = field.file_name().map(str::to_string);
        let mime = field.content_type().unwrap_or("").to_string();
        let Ok(data) = field.bytes().await else { return broken() };
        // `formData.get`: the first field of a name wins.
        match name.as_str() {
            "file" if file.is_none() => file = Some((filename.unwrap_or_default(), mime, data)),
            "prompt" if prompt.is_none() => prompt = Some(String::from_utf8_lossy(&data).into_owned()),
            _ => {}
        }
    }
    let Some((filename, mime, data)) = file else { return failure(StatusCode::BAD_REQUEST, "No image file provided.") };
    if data.len() > images::MAX_FILE_SIZE {
        return failure(StatusCode::BAD_REQUEST, &format!("File size must not exceed {}MB.", images::MAX_FILE_SIZE / 1024 / 1024));
    }
    let prompt = Value::String(prompt.filter(|p| !p.is_empty()).unwrap_or_else(|| "Generate a creative, short caption (5-10 words) for this image.".into()));

    // A smaller JPEG travels faster; a picture that cannot be read is sent as it came.
    let original = std::sync::Arc::new(data);
    let input = original.clone();
    let image = match uploads::blocking(move || images::preview_jpeg(&input)).await {
        Ok(jpeg) => Image { mime: "image/jpeg".into(), base64: base64::engine::general_purpose::STANDARD.encode(jpeg) },
        Err(err) => {
            tracing::warn!(file = filename, error = %err, "picture sent without resizing");
            Image { mime, base64: base64::engine::general_purpose::STANDARD.encode(&original[..]) }
        }
    };
    let ai = &config["ai"];
    let system = js_string(&or(&ai["systemInstruction"], "You are a helpful assistant."));
    let won = match first_answer(&state, ai, "imagePriority", &system, &prompt, Some(&image), Rules::default()).await {
        Ok(won) => won,
        Err(miss) => return refusal(miss, true),
    };
    record(&state, &won.provider, &won.model, "generate_caption".into(), &prompt, &won.answer).await;
    let caption = won.answer.text.trim().trim_matches(['"', '\'']).trim().to_string();
    json_status(StatusCode::OK, json!({ "success": true, "data": caption }))
}

// ── health analyzer ────────────────────────────────────────────────────────────────────────────────────

const ANALYST: &str = "You are a senior SRE assistant for a self-hosted Next.js portfolio app. Given recent failures and logs, produce a SHORT troubleshooting summary in Markdown: 1) a one-line health verdict, 2) the most likely root causes (bullets), 3) concrete next steps to investigate or fix. Be specific and avoid generic filler.";

/// `generateAiText`: the older provider settings, Groq first, then OpenRouter, then Gemini.
async fn plain_text(state: &AppState, config: &Value, system: &str, prompt: &Value, mode: &str) -> anyhow::Result<(String, String, Value)> {
    let ai = &config["ai"];
    let enabled = if truthy(&ai["enabledProviders"]) { ai["enabledProviders"].clone() } else { json!(["gemini"]) };
    let order: Vec<_> = [
        ("groq", "encryptedGroqApiKey", "llama-3.1-8b-instant"),
        ("openrouter", "encryptedOpenRouterApiKey", "anthropic/claude-3-haiku"),
        ("gemini", "encryptedGeminiApiKey", "gemini-1.5-flash"),
    ]
    .into_iter()
    .filter(|(name, ..)| items(&enabled).iter().any(|e| e.as_str() == Some(name)))
    .collect();
    anyhow::ensure!(!order.is_empty(), "No AI providers enabled for text generation.");
    let mut last = None;
    for (provider, column, fallback) in order {
        let Some(key) = open(state, &config[column]) else { continue };
        let model = or(&ai["models"][provider], fallback);
        let ask = Ask { kind: provider, model: &model, key: &key, system, prompt, image: None };
        let result = if provider == "gemini" {
            gemini(state, &js_string(&model), &ask).await
        } else {
            let endpoint = if provider == "groq" { "https://api.groq.com/openai/v1/chat/completions" } else { "https://openrouter.ai/api/v1/chat/completions" };
            let mut request = state.http.post(address(endpoint)).bearer_auth(&key);
            if provider == "openrouter" {
                request = request.header("HTTP-Referer", "https://aiyu.dev").header("X-Title", "Aiyu Portfolio");
            }
            let request = request.json(&json!({ "model": model, "messages": ask.messages() }));
            let upper = provider.to_uppercase();
            reply_json(request, ask.timeout(), |status, text| format!("{upper} Error: {status} {text}")).await.map(|r| openai_answer(&r))
        };
        match result {
            Ok(answer) if !answer.text.is_empty() => {
                record(state, &provider.into(), &model, mode.into(), prompt, &answer).await;
                return Ok((answer.text.trim().to_string(), provider.to_string(), model));
            }
            Ok(_) => {}
            Err(err) => {
                tracing::warn!(provider, error = %err, "AI provider failed");
                last = Some(err.to_string());
            }
        }
    }
    anyhow::bail!("All AI providers failed. Last error: {}", last.unwrap_or_else(|| "unknown".into()))
}

/// `POST /api/admin/health/analyze`: recent failures and pasted logs, summarised by the AI Core.
pub async fn analyze(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized();
    }
    let body = write::json_body(body).await.unwrap_or_else(|| json!({}));
    let result: anyhow::Result<Response> = async {
        anyhow::ensure!(!body.is_null(), "Cannot read a null body");
        let logs = if truthy(&body["logText"]) { head(&js_string(&body["logText"]), 8000) } else { String::new() };
        let logs = logs.trim();
        let down = pages::client_rows(&state.db, "UptimeCheck", r#"WHERE status = 'down' ORDER BY "checkedAt" DESC LIMIT 15"#).await?;
        let events = pages::client_rows(&state.db, "AuditLog", r#"WHERE category = 'security' ORDER BY "createdAt" DESC LIMIT 15"#).await?;
        let signals = json!({ "failedChecks": down.len(), "securityEvents": events.len() });
        if down.is_empty() && events.is_empty() && logs.is_empty() {
            return Ok(json_status(StatusCode::OK, json!({
                "success": true,
                "summary": "**All clear.** No recent uptime failures or security events were found, and no logs were provided to analyze.",
                "signals": signals,
                "skippedAi": true,
            })));
        }
        let config = stored_config(&state).await?;
        if !truthy(&config["ai"]["enabled"]) {
            return Ok(failure(StatusCode::FORBIDDEN, "AI Core is disabled. Enable it in AI settings to use the analyzer."));
        }
        let lines = |rows: Vec<String>| if rows.is_empty() { "(none)".to_string() } else { rows.join("\n") };
        let down = lines(down.iter().map(|c| {
            let name = if truthy(&c["label"]) { &c["label"] } else { &c["target"] };
            let why = if truthy(&c["error"]) { js_string(&c["error"]) } else { format!("HTTP {}", js_string(&c["statusCode"])) };
            format!("- {}: {why} ({})", js_string(name), js_string(&c["checkedAt"]))
        }).collect());
        let events = lines(events.iter().map(|e| {
            format!("- {}: {} from {} ({})", js_string(&e["action"]), js_string(&e["details"]), js_string(&e["ipAddress"]), js_string(&e["createdAt"]))
        }).collect());
        let pasted = if logs.is_empty() { "(none provided)".to_string() } else { format!("```\n{logs}\n```") };
        let prompt = Value::String(format!(
            "Analyze the following operational signals from the last collection window.\n\n## Failed uptime checks\n{down}\n\n## Recent security events\n{events}\n\n## Pasted runtime logs\n{pasted}"
        ));
        let (summary, provider, model) = plain_text(&state, &config, ANALYST, &prompt, "health_analysis").await?;
        Ok(json_status(StatusCode::OK, json!({ "success": true, "summary": summary, "provider": provider, "model": model, "signals": signals })))
    }
    .await;
    result.unwrap_or_else(|err| failed("/api/admin/health/analyze", StatusCode::INTERNAL_SERVER_ERROR, err))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modes_fill_their_prompts() {
        let (system, prompt) = compose(&json!("suggest_excerpt"), "Base.", &json!("abc"), &json!({})).unwrap();
        assert!(system.starts_with("Base.\nYou are an expert editor."));
        assert_eq!(prompt, "Write an excerpt for this blog post.\nTitle: \"\"\nContent snippet: \"abc\"");
        let (_, prompt) = compose(&json!("refine_experience"), "B", &json!("x"), &json!({ "role": "Dev" })).unwrap();
        assert!(prompt.as_str().unwrap().contains("role of Dev at undefined:\n\nx"));
        assert_eq!(compose(&json!("other"), "B", &json!(5), &Value::Null).unwrap(), ("B".into(), json!(5)));
        assert!(compose(&json!("suggest_title"), "B", &json!(5), &Value::Null).is_err());
        // A `${...}` typed by the user stays as typed.
        assert_eq!(compose(&json!("proofread"), "B", &json!("${context?.x}"), &Value::Null).unwrap().1, "Proofread and improve this content:\n\n${context?.x}");
    }

    #[test]
    fn every_mode_has_only_placeholders_the_server_fills() {
        for mode in ai_modes::MODES {
            assert!(!PLACEHOLDER.replace_all(mode.prompt, "").contains("${"), "{}", mode.name);
        }
    }

    #[test]
    fn fences_are_removed() {
        assert_eq!(unfence("```json\n{\"a\":1}\n```"), "{\"a\":1}");
        assert_eq!(unfence("```md\nHello\n```"), "md\nHello");
        assert_eq!(unfence("```latex\n\\x"), "\\x");
        assert_eq!(unfence("  plain "), "plain");
    }

    #[test]
    fn names_count_up() {
        let a = json!({ "id": "1", "name": "Groq API" });
        assert_eq!(provider_name(&json!("groq"), &[&a], Some(&json!("2"))), "Groq API 1");
        assert_eq!(provider_name(&json!("groq"), &[&a], Some(&json!("1"))), "Groq API");
        assert_eq!(provider_name(&json!("x"), &[], None), "AI API");
    }
}
