//! Admin writes for the site-wide documents: config, about, home, header, the active theme and the AI Hub layout.

use axum::{
    Json,
    extract::{Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Map, Value, json};

use crate::{
    AppState,
    api::{error, json_status, log_error, signed_in, truthy},
    pages, write,
    write::Singleton,
};

pub(crate) const CONFIG: Singleton = Singleton {
    table: "Config",
    timestamps: false,
    secrets: &["encryptedGithubToken", "encryptedGithubWebhookSecret", "encryptedGeminiApiKey", "encryptedGroqApiKey", "encryptedOpenRouterApiKey", "blogApiTokenHash"],
};
const ABOUT: Singleton = Singleton { table: "About", timestamps: false, secrets: &[] };
const HOME: Singleton = Singleton { table: "Home", timestamps: false, secrets: &[] };
const HEADER: Singleton = Singleton { table: "Header", timestamps: false, secrets: &[] };
const AI_PAGE: Singleton = Singleton { table: "AiPage", timestamps: true, secrets: &[] };

/// `SECTION_PATHS` in src/lib/autoIndexing.js.
const SECTION_PATHS: [&str; 8] = ["/", "/about-me", "/projects", "/apps", "/blogs", "/gallery", "/github", "/contact-us"];

/// The shared shape of `PUT /api/{about,home,header,config}`: merge the JSON object into the document.
async fn save(state: AppState, req: Request, model: &Singleton, failed: &str, effects: Value) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return error(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let Some(Value::Object(patch)) = write::json_body(body).await else { return error(StatusCode::INTERNAL_SERVER_ERROR, failed) };
    match write::upsert_singleton(&state.db, model, &patch).await {
        Ok(saved) => {
            write::notify(&state, effects).await;
            json_status(StatusCode::OK, saved)
        }
        Err(err) => {
            log_error(model.table, &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, failed)
        }
    }
}

pub async fn put_about(State(state): State<AppState>, req: Request) -> Response {
    save(state, req, &ABOUT, "Failed to update about data", json!({ "prefixes": ["db:about"] })).await
}

pub async fn put_home(State(state): State<AppState>, req: Request) -> Response {
    save(state, req, &HOME, "Failed to update home data", json!({ "keys": ["db:home"] })).await
}

pub async fn put_header(State(state): State<AppState>, req: Request) -> Response {
    // The header is on every page, so the section landing pages are pinged again.
    let paths = SECTION_PATHS.map(str::to_string);
    let effects = json!({ "keys": ["db:header"], "pings": [write::ping(&paths, "URL_UPDATED")] });
    save(state, req, &HEADER, "Failed to update header data", effects).await
}

/// `PUT` and `POST /api/config`.
pub async fn put_config(State(state): State<AppState>, req: Request) -> Response {
    save(state, req, &CONFIG, "Failed to update config", json!({ "prefixes": ["db:config", "db:themes"] })).await
}

fn failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "success": false, "error": message }))
}

/// `PATCH /api/themes/active`
pub async fn set_active_theme(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let Some(body) = write::json_body(body).await.filter(Value::is_object) else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body");
    };
    let Some(web) = state.web.clone() else { return failure(StatusCode::INTERNAL_SERVER_ERROR, "Themes are not loaded") };
    let result: anyhow::Result<Response> = async {
        let config = pages::try_singleton(&state.db, "Config", false).await?;
        let mut patch = Map::new();
        if truthy(&body["themeSlug"]) {
            let Some(slug) = body["themeSlug"].as_str() else { anyhow::bail!("themeSlug must be a string") };
            let predefined = web.themes["presets"].get(slug).or_else(|| web.themes["legacy"].get(slug)).is_some();
            if !predefined && !crate::admin_content::theme_slug_taken(&state.db, slug).await? {
                return Ok(failure(StatusCode::NOT_FOUND, "Theme not found"));
            }
            patch.insert("activeTheme".into(), slug.into());
        }
        if truthy(&body["variant"]) {
            if !matches!(body["variant"].as_str(), Some("light" | "dark")) {
                return Ok(failure(StatusCode::BAD_REQUEST, "variant must be 'light' or 'dark'"));
            }
            patch.insert("activeThemeVariant".into(), body["variant"].clone());
        }
        // Per-page settings merge over the stored ones.
        let wanted = &body["perPageThemes"];
        if truthy(wanted) {
            let mut merged = match config.get("perPageThemes").filter(|v| truthy(v)) {
                Some(v) => v.as_object().cloned().unwrap_or_default(),
                None => json!({ "enabled": false, "pages": {} }).as_object().cloned().unwrap_or_default(),
            };
            if wanted["enabled"].is_boolean() {
                merged.insert("enabled".into(), wanted["enabled"].clone());
            }
            if truthy(&wanted["pages"]) {
                merged.insert("pages".into(), wanted["pages"].clone());
            }
            patch.insert("perPageThemes".into(), Value::Object(merged));
        }
        let updated = write::upsert_singleton(&state.db, &CONFIG, &patch).await?;
        write::notify(&state, json!({ "prefixes": ["db:themes", "db:config"] })).await;
        // `undefined` fields drop out of the JSON.
        let data: Map<String, Value> = ["activeTheme", "activeThemeVariant", "perPageThemes"]
            .iter()
            .filter_map(|k| updated.get(*k).map(|v| (k.to_string(), v.clone())))
            .collect();
        Ok(Json(json!({ "success": true, "message": "Active theme updated successfully", "data": data })).into_response())
    }
    .await;
    result.unwrap_or_else(|err| {
        log_error("/api/themes/active", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
    })
}

/// `Number(value)`
pub(crate) fn number(value: &Value) -> f64 {
    match value {
        Value::Null => 0.0,
        Value::Bool(b) => f64::from(u8::from(*b)),
        Value::Number(n) => n.as_f64().unwrap_or(f64::NAN),
        Value::String(s) if s.trim().is_empty() => 0.0,
        Value::String(s) => s.trim().parse().unwrap_or(f64::NAN),
        Value::Array(a) if a.is_empty() => 0.0,
        Value::Array(a) if a.len() == 1 => number(&a[0]),
        _ => f64::NAN,
    }
}

fn ai_failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "ok": false, "error": message }))
}

/// `PUT /api/ai/layout`: order, visibility and headings of the AI Hub sections.
pub async fn put_ai_layout(State(state): State<AppState>, req: Request) -> Response {
    const FAILED: &str = "Failed to update AI page layout";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await && !write::bearer(&state, &parts.headers).await {
        return ai_failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let Some(body) = write::json_body(body).await else { return ai_failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    // A bad save must not wipe the page.
    if !body["sections"].is_array() {
        return ai_failure(StatusCode::BAD_REQUEST, "Invalid payload: `sections` array required");
    }
    let mut patch = Map::new();
    patch.insert("sections".into(), body["sections"].clone());
    if let Some(threshold) = body.get("subPageThreshold") {
        let n = number(threshold);
        if !n.is_finite() {
            return ai_failure(StatusCode::BAD_REQUEST, "`subPageThreshold` must be a number");
        }
        // `Math.round`, then the bounds of src/lib/aiSubPages.js.
        patch.insert("subPageThreshold".into(), json!(((n + 0.5).floor() as i64).clamp(1, 500)));
    }
    match write::upsert_singleton(&state.db, &AI_PAGE, &patch).await {
        Ok(saved) => {
            write::notify(&state, json!({ "keys": ["db:aiPage", "db:aiPage:stats"] })).await;
            let mut out = Map::new();
            out.insert("ok".into(), true.into());
            out.extend(saved.as_object().cloned().unwrap_or_default());
            json_status(StatusCode::OK, Value::Object(out))
        }
        Err(err) => {
            log_error("/api/ai/layout", &err);
            ai_failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED)
        }
    }
}
