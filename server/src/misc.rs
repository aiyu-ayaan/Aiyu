//! Smaller admin routes: the cache purge, the Resume Studio, the AI call log and the assistant system prompt.

use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use base64::Engine;
use serde_json::{Map, Value, json};
use std::time::Duration;

use crate::{
    AppState,
    admin_settings::{failure, now_iso},
    api::{error, json_status, log_error, signed_in, truthy},
    pages,
    site_api::js_string,
    write::{self, Singleton},
};

const STUDIO: Singleton = Singleton { table: "ResumeStudio", timestamps: true, secrets: &[] };
const MAX_LATEX: usize = 512 * 1024;
const MAX_PDF: usize = 8 * 1024 * 1024;
const MAX_SNAPSHOTS: usize = 15;
const MAX_IDEAS: usize = 200;
const ENGINES: [&str; 3] = ["pdflatex", "xelatex", "lualatex"];

fn refused() -> Response {
    json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }))
}

fn ok(value: Value) -> Response {
    json_status(StatusCode::OK, value)
}

/// `POST /api/admin/purge-cache`: the GitHub statistics are the only content kept in memory.
pub async fn purge_cache(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return error(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    crate::github::purge();
    ok(json!({ "success": true, "message": "Cache purged successfully" }))
}

// ── Resume Studio ──────────────────────────────────────────────────────────────────────────────────────

/// The defaults, then the stored studio over them.
fn studio(defaults: &Value, stored: &Value) -> Value {
    let mut out = defaults.as_object().cloned().unwrap_or_default();
    out.extend(stored.as_object().cloned().unwrap_or_default());
    Value::Object(out)
}

/// `GET /api/admin/resume`
pub async fn resume(State(state): State<AppState>, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return refused();
    }
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    match pages::try_singleton(&state.db, STUDIO.table, true).await {
        Ok(stored) => ok(json!({ "success": true, "data": studio(&web.discovery["resumeStudio"], &stored) })),
        Err(err) => {
            log_error("/api/admin/resume", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to load resume studio")
        }
    }
}

/// `String(value || fallback).slice(0, max)`, in UTF-16 units.
fn text(value: &Value, fallback: &str, max: usize) -> String {
    let full = if truthy(value) { js_string(value) } else { fallback.to_string() };
    let units: Vec<u16> = full.encode_utf16().take(max).collect();
    String::from_utf16_lossy(&units)
}

/// The fields of a save that are stored, cut to their limits. None for a request that cannot be read.
fn studio_patch(body: &Value) -> Option<Map<String, Value>> {
    let mut patch = Map::new();
    for key in ["latex", "engine", "templateId"] {
        if let Some(v) = body.get(key).filter(|v| v.is_string()) {
            patch.insert(key.into(), v.clone());
        }
    }
    let now = now_iso();
    let stamp = |v: &Value, fallback: &Value| if truthy(v) { v.clone() } else { fallback.clone() };
    let millis = chrono::Utc::now().timestamp_millis().to_string();
    if let Some(snapshots) = body["snapshots"].as_array() {
        let mut out = Vec::new();
        for snap in snapshots.iter().take(MAX_SNAPSHOTS) {
            if snap.is_null() {
                return None;
            }
            let created = stamp(&snap["createdAt"], &now.clone().into());
            out.push(json!({
                "id": text(&snap["id"], &millis, usize::MAX), "label": text(&snap["label"], "Version", 120),
                "latex": text(&snap["latex"], "", usize::MAX), "createdAt": created,
                "updatedAt": stamp(&snap["updatedAt"], &created),
            }));
        }
        patch.insert("snapshots".into(), out.into());
    }
    if let Some(id) = body.get("activeVersionId") {
        patch.insert("activeVersionId".into(), if truthy(id) { js_string(id).into() } else { Value::Null });
    }
    if let Some(ideas) = body["ideas"].as_array() {
        let mut out = Vec::new();
        for idea in ideas.iter().take(MAX_IDEAS) {
            if idea.is_null() {
                return None;
            }
            out.push(json!({
                "id": text(&idea["id"], &millis, usize::MAX), "text": text(&idea["text"], "", 2000), "done": truthy(&idea["done"]),
                "createdAt": stamp(&idea["createdAt"], &now.clone().into()),
            }));
        }
        patch.insert("ideas".into(), out.into());
    }
    for key in ["lastCompiledAt", "lastPublishedAt"] {
        if let Some(v) = body.get(key) {
            patch.insert(key.into(), v.clone());
        }
    }
    Some(patch)
}

/// `PUT /api/admin/resume`
pub async fn save_resume(State(state): State<AppState>, req: Request) -> Response {
    const FAILED: &str = "Failed to save resume studio";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return refused();
    }
    // The defaults come from the web build; without it nothing can answer.
    let Some(web) = state.web.clone() else { return failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else { return failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    if body["latex"].as_str().is_some_and(|l| l.len() > MAX_LATEX) {
        return failure(StatusCode::PAYLOAD_TOO_LARGE, "Document too large (512KB max)");
    }
    let Some(patch) = studio_patch(&body) else { return failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    match write::upsert_singleton(&state.db, &STUDIO, &patch).await {
        Ok(saved) => ok(json!({ "success": true, "data": studio(&web.discovery["resumeStudio"], &saved) })),
        Err(err) => {
            log_error("/api/admin/resume", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED)
        }
    }
}

/// The `! error` blocks of a LaTeX log with the line numbers that follow them.
fn latex_errors(log: &str) -> Vec<Value> {
    let lines: Vec<&str> = log.split('\n').collect();
    lines
        .iter()
        .enumerate()
        .filter_map(|(i, line)| {
            let message = line.strip_prefix('!')?.trim();
            let at = lines.iter().skip(i + 1).take(7).find_map(|l| {
                let digits: String = l.strip_prefix("l.")?.chars().take_while(char::is_ascii_digit).collect();
                digits.parse::<u64>().ok()
            });
            Some(json!({ "message": message, "line": at }))
        })
        .take(20)
        .collect()
}

/// A multipart form of plain fields, as texlive.net's latexcgi takes it.
fn form(boundary: &str, fields: &[(&str, &str)]) -> String {
    let parts: String = fields.iter().map(|(name, value)| format!("--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n")).collect();
    format!("{parts}--{boundary}--\r\n")
}

/// `POST /api/admin/resume/compile`: LaTeX to PDF through texlive.net.
pub async fn compile(State(state): State<AppState>, req: Request) -> Response {
    let unreachable = |message: &str| failure(StatusCode::BAD_GATEWAY, message);
    const DOWN: &str = "Failed to reach the LaTeX compile service.";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return refused();
    }
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else { return unreachable(DOWN) };
    let Some(latex) = body["latex"].as_str().filter(|l| !l.is_empty()) else { return failure(StatusCode::BAD_REQUEST, "No LaTeX source provided") };
    if latex.len() > MAX_LATEX {
        return failure(StatusCode::PAYLOAD_TOO_LARGE, "Document too large (512KB max)");
    }
    let engine = body["engine"].as_str().filter(|e| ENGINES.contains(e)).unwrap_or("pdflatex");
    let boundary = format!("aiyu-{}", crate::auth::uuid_v4());
    let fields = [("filecontents[]", latex), ("filename[]", "document.tex"), ("engine", engine), ("return", "pdf")];
    let sent = state
        .http
        .post("https://texlive.net/cgi-bin/latexcgi")
        .header(header::CONTENT_TYPE, format!("multipart/form-data; boundary={boundary}"))
        .body(form(&boundary, &fields))
        .timeout(Duration::from_secs(90))
        .send()
        .await;
    let response = match sent {
        Ok(r) => r,
        Err(err) => {
            tracing::error!(error = %err, "resume compile failed");
            return unreachable(if err.is_timeout() { "LaTeX service timed out — try again in a moment." } else { DOWN });
        }
    };
    let pdf = response.headers().get(header::CONTENT_TYPE).and_then(|v| v.to_str().ok()).is_some_and(|t| t.contains("application/pdf"));
    let Ok(bytes) = response.bytes().await else { return unreachable(DOWN) };
    if pdf {
        let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
        return ok(json!({ "success": true, "data": { "pdfBase64": encoded, "engine": engine, "compiledAt": now_iso() } }));
    }
    // Anything else is the compiler log, or an error page.
    let log = String::from_utf8_lossy(&bytes);
    let shown: Vec<u16> = log.encode_utf16().take(200_000).collect();
    ok(json!({ "success": false, "error": "Compilation failed", "data": { "log": String::from_utf16_lossy(&shown), "errors": latex_errors(&log), "engine": engine } }))
}

/// `Buffer.from(text, 'base64')`: whatever is not base64 is ignored.
fn lenient_base64(text: &str) -> Vec<u8> {
    let mut clean: String = text.chars().take_while(|c| *c != '=').filter(|c| c.is_ascii_alphanumeric() || "+/-_".contains(*c)).map(|c| match c { '-' => '+', '_' => '/', c => c }).collect();
    if clean.len() % 4 == 1 {
        clean.pop();
    }
    let engine = base64::engine::GeneralPurpose::new(
        &base64::alphabet::STANDARD,
        base64::engine::GeneralPurposeConfig::new().with_decode_padding_mode(base64::engine::DecodePaddingMode::Indifferent).with_decode_allow_trailing_bits(true),
    );
    engine.decode(clean).unwrap_or_default()
}

/// `POST /api/admin/resume/publish`: make a compiled PDF the site's resume.
pub async fn publish(State(state): State<AppState>, req: Request) -> Response {
    const FAILED: &str = "Failed to publish resume";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return refused();
    }
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else { return failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    let Some(encoded) = body["pdfBase64"].as_str().filter(|p| !p.is_empty()) else { return failure(StatusCode::BAD_REQUEST, "No PDF provided — compile first.") };
    let pdf = lenient_base64(encoded);
    if pdf.is_empty() || pdf.len() > MAX_PDF {
        return failure(StatusCode::PAYLOAD_TOO_LARGE, "Invalid PDF size (8MB max)");
    }
    if !pdf.starts_with(b"%PDF-") {
        return failure(StatusCode::BAD_REQUEST, "Payload is not a PDF");
    }
    let published = now_iso();
    let result: anyhow::Result<()> = async {
        let resume = json!({ "type": "file", "value": format!("data:application/pdf;base64,{encoded}"), "filename": text(&body["filename"], "resume.pdf", 120) });
        write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &Map::from_iter([("resume".to_string(), resume)])).await?;
        write::upsert_singleton(&state.db, &STUDIO, &Map::from_iter([("lastPublishedAt".to_string(), published.clone().into())])).await?;
        Ok(())
    }
    .await;
    match result {
        Ok(()) => {
            ok(json!({ "success": true, "data": { "publishedAt": published } }))
        }
        Err(err) => {
            log_error("/api/admin/resume/publish", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED)
        }
    }
}

// ── AI call log ────────────────────────────────────────────────────────────────────────────────────────

const PROVIDERS: [&str; 16] = [
    "google", "openai", "groq", "openrouter", "anthropic", "cohere", "perplexity", "replicate", "together", "mistral", "deepseek",
    "fireworks", "xai", "stabilityai", "aws", "azure",
];

/// Totals per provider ("gemini" counts as "google") and the overall token count.
fn provider_stats(rows: &[(String, i64, i64, i64, i64)]) -> (Value, i64) {
    let mut stats: Vec<(&str, [i64; 4])> = PROVIDERS.iter().map(|p| (*p, [0; 4])).collect();
    let mut overall = 0;
    for (provider, input, output, total, requests) in rows {
        let provider = provider.to_lowercase();
        let provider = if provider == "gemini" { "google" } else { &provider };
        if let Some((_, sums)) = stats.iter_mut().find(|s| s.0 == provider) {
            for (sum, add) in sums.iter_mut().zip([input, output, total, requests]) {
                *sum += add;
            }
        }
        overall += total;
    }
    let stats: Map<String, Value> =
        stats.into_iter().map(|(p, [input, output, total, requests])| (p.to_string(), json!({ "input": input, "output": output, "total": total, "requests": requests }))).collect();
    (Value::Object(stats), overall)
}

/// `GET /api/admin/ai/logs`: the last 50 calls and token totals per provider.
pub async fn ai_logs(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let result: anyhow::Result<Value> = async {
        let logs = pages::client_rows(&state.db, "AiLog", r#"ORDER BY "createdAt" DESC LIMIT 50"#).await?;
        let rows: Vec<(String, i64, i64, i64, i64)> = sqlx::query_as(
            r#"SELECT provider, COALESCE(sum("inputTokens"), 0)::bigint, COALESCE(sum("outputTokens"), 0)::bigint,
                      COALESCE(sum("totalTokens"), 0)::bigint, count(*) FROM "AiLog" GROUP BY provider"#,
        )
        .fetch_all(&state.db)
        .await?;
        let (stats, overall) = provider_stats(&rows);
        Ok(json!({ "success": true, "data": { "logs": logs, "stats": stats, "overallTotalTokens": overall } }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| {
        log_error("/api/admin/ai/logs", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
    })
}

// ── system prompt ──────────────────────────────────────────────────────────────────────────────────────

/// Config fields that stay out of the prompt.
fn sanitize(mut config: Value) -> Value {
    let Value::Object(fields) = &mut config else { return json!({}) };
    for key in ["encryptedGithubToken", "encryptedGithubWebhookSecret", "encryptedGeminiApiKey", "encryptedGroqApiKey", "encryptedOpenRouterApiKey", "blogApiTokenHash", "blogApiTokenLast4", "blogApiTokenCreatedAt", "n8nWebhookAuthKey"] {
        fields.shift_remove(key);
    }
    if let Some(Value::Object(favicon)) = fields.get_mut("favicon") {
        favicon.shift_remove("value");
    }
    config
}

fn prompt(context: &Value) -> anyhow::Result<String> {
    let first = |values: [&Value; 3]| values.into_iter().find(|v| truthy(v)).map(js_string);
    let c = &context["websiteContext"];
    let (about, config, home) = (&c["about"], &c["config"], &c["home"]);
    let name = first([&about["name"], &home["name"], &config["authorName"]]).unwrap_or_else(|| "the portfolio owner".into());
    let title = first([&config["siteTitle"], &config["logoText"], &Value::Null]).unwrap_or_else(|| format!("{name} Portfolio"));
    let roles = match about["roles"].as_array().filter(|r| !r.is_empty()) {
        Some(roles) => roles.iter().map(js_string).collect::<Vec<_>>().join(", "),
        None => first([&config["profession"], &Value::Null, &Value::Null]).unwrap_or_else(|| "developer".into()),
    };
    let summary = first([&about["professionalSummary"], &home["intro"], &Value::Null]).unwrap_or_else(|| "No professional summary provided.".into());
    let json = serde_json::to_string_pretty(context)?;
    Ok(format!(
        "You are an AI assistant representing {name}.

Your job is to answer using the latest website data from the portfolio database. Speak accurately, clearly, and confidently. Prefer concrete facts from the source data below over assumptions. If something is missing from the data, say that it is not currently available in the website records instead of inventing it.

Identity
- Name: {name}
- Website: {title}
- Roles: {roles}
- Professional summary: {summary}

Behavior rules
- Use the database content below as the source of truth.
- When describing projects, apps, blogs, gallery items, or profile details, stay aligned with the stored data.
- Do not expose secrets, internal tokens, or private configuration values.
- If asked to summarize the portfolio, synthesize from the provided data.
- If asked for exact values, prefer quoting the stored fields precisely.

Website database context (JSON, indentation 2)
{json}"
    ))
}

async fn website_context(state: &AppState) -> anyhow::Result<Value> {
    let db = &state.db;
    let one = |table| pages::try_singleton(db, table, false);
    let list = |table, order| pages::client_rows(db, table, order);
    const ORDERED: &str = r#"ORDER BY "displayOrder" ASC, "updatedAt" DESC, "createdAt" DESC"#;
    let projects = list("Project", ORDERED).await?;
    let apps = list("Deployment", ORDERED).await?;
    let mut blogs = list("Blog", r#"ORDER BY "createdAt" DESC"#).await?;
    for blog in &mut blogs {
        if let Some(fields) = blog.as_object_mut() {
            fields.shift_remove("searchVector");
        }
    }
    let gallery = list("Gallery", r#"ORDER BY "isPinned" DESC, "order" ASC, "createdAt" DESC"#).await?;
    let socials = list("Social", "").await?;
    let themes = list("Theme", "").await?;
    let summary = json!({
        "projects": projects.len(), "apps": apps.len(), "blogs": blogs.len(), "galleryItems": gallery.len(),
        "socials": socials.len(), "themes": themes.len(),
    });
    Ok(json!({
        "generatedAt": now_iso(),
        "format": { "type": "json", "indentation": 2, "delimiter": "," },
        "websiteContext": {
            "config": sanitize(one("Config").await?), "header": one("Header").await?, "home": one("Home").await?,
            "about": one("About").await?, "socials": socials, "projects": projects, "apps": apps, "blogs": blogs,
            "gallery": gallery, "themes": themes,
        },
        "summary": summary,
    }))
}

/// `GET /api/admin/system-prompt`: the site's content as a prompt for an assistant (admin or the blog API token).
pub async fn system_prompt(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await && !write::bearer(&state, &headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    match website_context(&state).await.and_then(|c| prompt(&c)) {
        Ok(text) => ([(header::CONTENT_TYPE, "text/plain; charset=utf-8"), (header::CACHE_CONTROL, "no-store")], text).into_response(),
        Err(err) => {
            log_error("/api/admin/system-prompt", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn latex_logs_give_messages_and_lines() {
        let log = "This is pdfTeX\n! Undefined control sequence.\n<recent>\nl.42 \\foo\n! Emergency stop.\n";
        assert_eq!(latex_errors(log), [json!({ "message": "Undefined control sequence.", "line": 42 }), json!({ "message": "Emergency stop.", "line": null })]);
    }

    #[test]
    fn studio_saves_are_cut_to_size() {
        let patch = studio_patch(&json!({ "latex": "x", "engine": 5, "snapshots": vec![json!({ "label": "a".repeat(200) }); 20], "ideas": [{ "text": "t", "done": 1 }], "activeVersionId": "", "x": 1 })).unwrap();
        assert_eq!(patch["snapshots"].as_array().unwrap().len(), 15);
        assert_eq!(patch["snapshots"][0]["label"].as_str().unwrap().len(), 120);
        assert_eq!((patch["activeVersionId"].clone(), patch["ideas"][0]["done"].clone(), patch.get("engine"), patch.get("x")), (Value::Null, json!(true), None, None));
        assert!(studio_patch(&json!({ "ideas": [null] })).is_none());
    }

    #[test]
    fn base64_is_read_like_node() {
        assert_eq!(lenient_base64("JVBE Ri0x\nLjQ="), b"%PDF-1.4");
        assert_eq!(lenient_base64("JVBERi0"), b"%PDF-");
        assert!(lenient_base64("!!").is_empty());
    }

    #[test]
    fn gemini_counts_as_google() {
        let (stats, total) = provider_stats(&[("Gemini".into(), 1, 2, 3, 1), ("google".into(), 1, 1, 2, 1), ("other".into(), 0, 0, 7, 1)]);
        assert_eq!(stats["google"], json!({ "input": 2, "output": 3, "total": 5, "requests": 2 }));
        assert_eq!(total, 12);
    }

    #[test]
    fn the_prompt_leaves_secrets_out() {
        let config = sanitize(json!({ "siteTitle": "S", "n8nWebhookAuthKey": "k", "favicon": { "value": "v", "filename": "f" } }));
        assert_eq!(config, json!({ "siteTitle": "S", "favicon": { "filename": "f" } }));
    }
}
