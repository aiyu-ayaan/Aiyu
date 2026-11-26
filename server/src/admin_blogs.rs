//! Admin writes for blog posts (src/app/api/blogs) and the admin side of the contact messages.

use axum::{
    extract::{Path, RawQuery, Request, State},
    http::StatusCode,
    response::Response,
};
use chrono::Utc;
use regex::Regex;
use serde_json::{Map, Value, json};
use sqlx::PgPool;
use std::sync::LazyLock;

use crate::{
    AppState,
    api::{error, json_status, log_error, query_map, signed_in, truthy},
    pages, write,
    write::{Kind, Table},
};

use Kind::{Bool, Date, List, OptText, Text};

pub(crate) const BLOG: Table = Table {
    name: "Blog",
    columns: &[
        ("title", Text), ("slug", Text), ("content", Text), ("image", OptText), ("imageAlt", Text), ("excerpt", Text),
        ("seoTitle", Text), ("seoDescription", Text), ("canonicalUrl", Text), ("keywords", List), ("socialTitle", Text),
        ("socialDescription", Text), ("socialImage", Text), ("socialImageAlt", Text), ("noIndex", Bool), ("tags", List),
        ("date", Text), ("published", Bool), ("isAutomated", Bool), ("isFlagged", Bool), ("flagReason", Text),
        ("reviewStatus", Text), ("createdAt", Date), ("updatedAt", Date),
    ],
    created_at: true,
    updated_at: true,
};

const DUPLICATE: &str = "A blog with this title already exists.";
const TRIMMED: [&str; 9] =
    ["title", "excerpt", "seoTitle", "seoDescription", "socialTitle", "socialDescription", "socialImage", "socialImageAlt", "imageAlt"];

fn failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "success": false, "error": message }))
}

/// Next answers every other blog write error with 400 and the error text.
fn rejected(err: &anyhow::Error) -> Response {
    if write::is_duplicate(err) {
        return failure(StatusCode::CONFLICT, DUPLICATE);
    }
    log_error("/api/blogs", err);
    failure(StatusCode::BAD_REQUEST, &err.to_string())
}

/// `String(value || '')`
fn text(value: &Value) -> String {
    if truthy(value) { crate::site_api::js_string(value) } else { String::new() }
}

/// `normalizeCanonicalUrl`: an absolute URL on this site, or "".
fn canonical_url(value: &Value, site: &str) -> String {
    let raw = value.as_str().map(str::trim).unwrap_or("");
    let Ok(base) = url::Url::parse(site) else { return String::new() };
    if raw.is_empty() {
        return String::new();
    }
    match base.join(raw) {
        Ok(u) if matches!(u.scheme(), "http" | "https") && u.origin() == base.origin() => u.to_string(),
        _ => String::new(),
    }
}

/// Tags and keywords: an array, or one comma-separated string.
fn string_list(value: &Value) -> Vec<String> {
    let parts: Vec<String> = match value {
        Value::Array(a) => a.iter().map(text).collect(),
        Value::String(s) => s.split(',').map(str::to_string).collect(),
        _ => vec![],
    };
    parts.iter().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
}

/// `normalizeBlogPayload` of `POST /api/blogs`: every field gets a value.
fn new_payload(body: &Map<String, Value>, site: &str) -> Map<String, Value> {
    let mut out = body.clone();
    let get = |k: &str| body.get(k).unwrap_or(&Value::Null);
    for key in TRIMMED {
        out.insert(key.into(), text(get(key)).trim().into());
    }
    out.insert("content".into(), text(get("content")).into());
    out.insert("canonicalUrl".into(), canonical_url(get("canonicalUrl"), site).into());
    for key in ["tags", "keywords"] {
        out.insert(key.into(), string_list(get(key)).into());
    }
    for key in ["noIndex", "published"] {
        out.insert(key.into(), (get(key) == &Value::Bool(true)).into());
    }
    out
}

/// `normalizeBlogPayload` of `PUT /api/blogs/{id}`: only the fields sent are touched.
fn patch_payload(body: &Map<String, Value>, site: &str) -> Map<String, Value> {
    let mut out = body.clone();
    for (key, value) in out.iter_mut() {
        let key = key.as_str();
        if TRIMMED.contains(&key) {
            if let Some(trimmed) = value.as_str().map(|s| s.trim().to_string()) {
                *value = trimmed.into();
            }
        } else if key == "canonicalUrl" {
            *value = canonical_url(value, site).into();
        } else if matches!(key, "tags" | "keywords") {
            *value = string_list(value).into();
        } else if matches!(key, "noIndex" | "published") {
            *value = (*value == Value::Bool(true)).into();
        } else if key == "isFlagged" {
            *value = truthy(value).into();
        } else if matches!(key, "flagReason" | "reviewStatus") {
            *value = crate::site_api::js_string(value).into();
        }
    }
    out
}

// ── review engine (src/lib/blogReviewEngine.js) ────────────────────────────────────────────────────────

/// JavaScript's `\b` knows ASCII words only.
fn word_pattern(body: &str) -> Regex {
    Regex::new(&format!(r"(?i)(?-u:\b){body}(?-u:\b)")).expect("review pattern")
}

/// Reliable anywhere: real articles do not contain these phrases.
static STRONG: LazyLock<Vec<(Regex, &str)>> = LazyLock::new(|| {
    vec![
        (word_pattern(r"test\s*blogs?"), "Matches test blog pattern"),
        (word_pattern(r"(demo|sample)\s*(post|blog|article)"), "Contains demo/sample indicator"),
        (word_pattern(r"lorem\s+ipsum"), "Contains placeholder text 'lorem ipsum'"),
        (word_pattern(r"foo\s*bar"), "Contains dummy pattern 'foo bar'"),
        (word_pattern("(asdf|qwerty|zxcv)"), "Contains keyboard smash sequence"),
        (word_pattern(r"hello\s+world"), "Contains generic 'hello world'"),
        (word_pattern(r"dummy\s*(post|content|blog)"), "Contains 'dummy' placeholder indicator"),
    ]
});
/// Bare words: only a signal outside the body.
static WEAK: LazyLock<Vec<(Regex, &str)>> = LazyLock::new(|| {
    vec![
        (word_pattern("(test|testing)"), "Contains keyword 'test'"),
        (word_pattern("(demo|sample)"), "Contains demo/sample indicator"),
        (word_pattern("dummy"), "Contains 'dummy' placeholder indicator"),
    ]
});
static TAGS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]*>").expect("tag pattern"));

/// Why a new post needs review; empty when it does not.
fn review(post: &Map<String, Value>, config: &Value) -> Vec<String> {
    if config["enableBlogReviewEngine"] == Value::Bool(false) {
        return vec![];
    }
    let field = |k: &str| text(post.get(k).unwrap_or(&Value::Null)).trim().to_string();
    let joined = |k: &str| match post.get(k) {
        Some(Value::Array(a)) => a.iter().map(crate::site_api::js_string).collect::<Vec<_>>().join(" "),
        other => text(other.unwrap_or(&Value::Null)),
    };
    let (title, content) = (field("title"), field("content"));
    let metadata = format!("{title} {} {} {} {}", field("excerpt"), joined("tags"), joined("keywords"), field("slug")).to_lowercase();
    let mut reasons = Vec::new();

    for (patterns, body_too) in [(&*STRONG, true), (&*WEAK, false)] {
        for (pattern, label) in patterns {
            let place = if pattern.is_match(&title) {
                "Title"
            } else if pattern.is_match(&metadata) {
                "Metadata/excerpt"
            } else if body_too && pattern.is_match(&content) {
                "Content"
            } else {
                continue;
            };
            reasons.push(format!("{place} {}", label.to_lowercase()));
            break;
        }
    }

    let custom: Vec<String> = match &config["customTestKeywords"] {
        Value::Array(a) => a.iter().map(crate::site_api::js_string).collect(),
        v => text(v).split(['\n', ',']).map(|k| k.trim().to_string()).filter(|k| !k.is_empty()).collect(),
    };
    if let Some(word) = custom.iter().find(|w| {
        let p = word_pattern(&regex::escape(w));
        p.is_match(&title) || p.is_match(&content) || p.is_match(&metadata)
    }) {
        reasons.push(format!("Matches custom test keyword: '{word}'"));
    }

    let plain = TAGS.replace_all(&content, "").replace(['#', '*', '`', '_'], "");
    let length = plain.trim().encode_utf16().count();
    if length < 30 {
        reasons.push(format!("Content length ({length} chars) is below minimum quality threshold (30 chars)"));
    }

    let canonical = field("canonicalUrl").to_lowercase();
    let lower = content.to_lowercase();
    if let Some(domain) = ["example.com", "test.com", "foo.bar", "localhost"].iter().find(|d| lower.contains(**d) || canonical.contains(**d)) {
        reasons.push(format!("Contains dummy placeholder domain '{domain}'"));
    }
    reasons
}

// ── writes ─────────────────────────────────────────────────────────────────────────────────────────────

/// `createUniqueBlogSlug`: the title's slug, numbered until no other post has it.
async fn unique_slug(db: &PgPool, title: &str, own: Option<&str>) -> anyhow::Result<String> {
    let mut base = pages::generate_slug(title);
    if base.is_empty() {
        let id = own.unwrap_or("");
        let tail: String = id.chars().skip(id.chars().count().saturating_sub(6)).collect();
        base = format!("blog-{}", if tail.is_empty() { "entry" } else { &tail });
    }
    let mut candidate = base.clone();
    for suffix in 2.. {
        let taken: bool = sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Blog" WHERE slug = $1 AND id IS DISTINCT FROM $2)"#)
            .bind(&candidate)
            .bind(own)
            .fetch_one(db)
            .await?;
        if !taken {
            break;
        }
        candidate = format!("{base}-{suffix}");
    }
    Ok(candidate)
}

async fn title_taken(db: &PgPool, title: &str, own: Option<&str>) -> anyhow::Result<bool> {
    Ok(sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Blog" WHERE lower(title) = lower($1) AND id IS DISTINCT FROM $2)"#)
        .bind(title)
        .bind(own)
        .fetch_one(db)
        .await?)
}

fn slug_of(row: &Value) -> Option<&str> {
    row["slug"].as_str().filter(|s| !s.is_empty())
}

/// `POST /api/blogs`: the admin, or a tool with the bearer token (whose posts are marked automated).
pub async fn create(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let admin = signed_in(&state, &parts.headers).await;
    if !admin && !write::bearer(&state, &parts.headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let Some(Value::Object(body)) = write::json_body(body).await else { return failure(StatusCode::BAD_REQUEST, "Invalid JSON body") };
    let mut post = new_payload(&body, &crate::web::site_url());
    if !post.get("date").is_some_and(truthy) {
        // `toLocaleDateString('en-US', long month)`.
        post.insert("date".into(), Utc::now().format("%B %-d, %Y").to_string().into());
    }
    let title = post["title"].as_str().unwrap_or("").to_string();
    if title.is_empty() || !truthy(&post["content"]) {
        return failure(StatusCode::BAD_REQUEST, "Title and content are required");
    }
    let result: anyhow::Result<Option<Value>> = async {
        if title_taken(&state.db, &title, None).await? {
            return Ok(None);
        }
        let config = pages::try_singleton(&state.db, "Config", false).await?;
        let reasons = review(&post, &config);
        let flagged = !reasons.is_empty();
        let mut doc = post.clone();
        doc.insert("slug".into(), unique_slug(&state.db, &title, None).await?.into());
        // A flagged post stays a draft whatever was asked.
        doc.insert("published".into(), (!flagged && post["published"] == Value::Bool(true)).into());
        doc.insert("isAutomated".into(), (!admin).into());
        doc.insert("isFlagged".into(), flagged.into());
        doc.insert("flagReason".into(), reasons.join("; ").into());
        doc.insert("reviewStatus".into(), (if flagged { "FLAGGED" } else { "CLEAN" }).into());
        Ok(Some(write::insert(&state.db, &BLOG, write::prepare(&BLOG, &Value::Object(doc))?).await?))
    }
    .await;
    match result {
        Ok(Some(row)) => {
            let mut pings = vec![];
            if let Some(slug) = slug_of(&row).filter(|_| truthy(&row["published"]) && !truthy(&row["noIndex"])) {
                pings.push(write::ping(&[format!("/blogs/{slug}"), "/blogs".into()], "URL_UPDATED"));
            }
            crate::indexing::auto(&state, pings);
            json_status(StatusCode::CREATED, json!({ "success": true, "data": row }))
        }
        Ok(None) => failure(StatusCode::CONFLICT, DUPLICATE),
        Err(err) => rejected(&err),
    }
}

enum Updated {
    Saved { before: Value, after: Value },
    Missing,
    TitleTaken,
}

/// `PUT /api/blogs/{id}`
pub async fn update(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let Some(Value::Object(body)) = write::json_body(body).await else { return failure(StatusCode::BAD_REQUEST, "Invalid JSON body") };
    let mut patch = patch_payload(&body, &crate::web::site_url());
    let result: anyhow::Result<Updated> = async {
        let Some(before) = write::find(&state.db, "Blog", &id).await? else { return Ok(Updated::Missing) };
        let old_title = before["title"].as_str().unwrap_or("");
        let new_title = patch.get("title").and_then(Value::as_str).filter(|t| !t.trim().is_empty()).unwrap_or(old_title).to_string();
        if title_taken(&state.db, &new_title, Some(&id)).await? {
            return Ok(Updated::TitleTaken);
        }
        let slug = if patch.get("title").is_some_and(truthy) || slug_of(&before).is_none() {
            unique_slug(&state.db, &new_title, Some(&id)).await?
        } else {
            before["slug"].as_str().unwrap_or("").to_string()
        };
        patch.insert("slug".into(), slug.into());
        let data = write::prepare(&BLOG, &Value::Object(patch))?;
        Ok(match write::update(&state.db, &BLOG, &id, data).await? {
            Some(after) => Updated::Saved { before, after },
            None => Updated::Missing,
        })
    }
    .await;
    match result {
        Ok(Updated::Saved { before, after }) => {
            let mut pings = vec![];
            if let Some(slug) = slug_of(&after) {
                let kind = if truthy(&after["published"]) && !truthy(&after["noIndex"]) { "URL_UPDATED" } else { "URL_DELETED" };
                pings.push(write::ping(&[format!("/blogs/{slug}"), "/blogs".into()], kind));
                if let Some(old) = slug_of(&before).filter(|old| *old != slug) {
                    pings.push(write::ping(&[format!("/blogs/{old}")], "URL_DELETED"));
                }
            }
            crate::indexing::auto(&state, pings);
            json_status(StatusCode::OK, json!({ "success": true, "data": after }))
        }
        Ok(Updated::Missing) => failure(StatusCode::NOT_FOUND, "Blog not found"),
        Ok(Updated::TitleTaken) => failure(StatusCode::CONFLICT, DUPLICATE),
        Err(err) => rejected(&err),
    }
}

/// `DELETE /api/blogs/{id}`
pub async fn delete(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    match write::delete(&state.db, "Blog", &id).await {
        Ok(Some(row)) => {
            let pings = slug_of(&row).map_or(vec![], |slug| {
                vec![write::ping(&[format!("/blogs/{slug}")], "URL_DELETED"), write::ping(&["/blogs".into()], "URL_UPDATED")]
            });
            crate::indexing::auto(&state, pings);
            json_status(StatusCode::OK, json!({ "success": true, "data": {} }))
        }
        Ok(None) => failure(StatusCode::NOT_FOUND, "Blog not found"),
        Err(err) => rejected(&err),
    }
}

// ── contact messages (the public POST stays in Next with its notifications) ────────────────────────────

/// `GET /api/contact/message?limit=`
pub async fn messages(State(state): State<AppState>, RawQuery(query): RawQuery, headers: axum::http::HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return error(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let asked = query_map(&query).remove("limit").filter(|v| !v.is_empty()).unwrap_or_else(|| "100".into());
    let limit = write::parse_int(&Value::String(asked)).map_or(100, |n| n.clamp(1, 500));
    match pages::client_rows(&state.db, "ContactMessage", &format!(r#"ORDER BY "createdAt" DESC LIMIT {limit}"#)).await {
        Ok(rows) => json_status(StatusCode::OK, json!({ "success": true, "data": rows })),
        Err(err) => {
            log_error("/api/contact/message", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch messages")
        }
    }
}

/// `DELETE /api/contact/message?id=`: an unknown id is not an error.
pub async fn delete_message(State(state): State<AppState>, RawQuery(query): RawQuery, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return error(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let Some(id) = query_map(&query).remove("id").filter(|id| !id.is_empty()) else {
        return error(StatusCode::BAD_REQUEST, "Message ID is required");
    };
    match write::delete(&state.db, "ContactMessage", &id).await {
        Ok(_) => json_status(StatusCode::OK, json!({ "success": true, "message": "Message deleted" })),
        Err(err) => {
            log_error("/api/contact/message", &err);
            error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to delete message")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_urls_must_stay_on_the_site() {
        let c = |v: &str| canonical_url(&json!(v), "https://me.example");
        assert_eq!(c("/blogs/a"), "https://me.example/blogs/a");
        assert_eq!(c(" https://me.example/x "), "https://me.example/x");
        assert_eq!(c("https://other.example/x"), "");
        assert_eq!(c("javascript:alert(1)"), "");
        assert_eq!(c(""), "");
    }

    #[test]
    fn review_matches_node() {
        let run = |post: Value, config: Value| review(post.as_object().unwrap(), &config).join("; ");
        let long = "A real article body that is comfortably long enough.";
        assert_eq!(run(json!({ "title": "Shipping Rust", "content": long }), json!({})), "");
        assert_eq!(
            run(json!({ "title": "Test blog", "content": "short" }), json!({})),
            "Title matches test blog pattern; Title contains keyword 'test'; Content length (5 chars) is below minimum quality threshold (30 chars)"
        );
        // Bare words in the body do not flag; custom words and placeholder domains do.
        assert_eq!(
            run(json!({ "title": "T", "content": format!("{long} testing at example.com about zork") }), json!({ "customTestKeywords": "zork, qux" })),
            "Matches custom test keyword: 'zork'; Contains dummy placeholder domain 'example.com'"
        );
        assert_eq!(run(json!({ "title": "test", "content": "x" }), json!({ "enableBlogReviewEngine": false })), "");
    }
}
