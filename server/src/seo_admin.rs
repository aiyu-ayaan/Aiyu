//! The SEO tools under `/api/admin/seo`: the metadata audit, the live crawl, indexing pings and the AI fixer
//! (src/app/api/admin/seo/*, src/lib/seoAudit.js, src/lib/seoCrawl.js).

use std::{
    sync::LazyLock,
    time::{Duration, Instant},
};

use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use futures_util::StreamExt;
use regex::Regex;
use serde_json::{Map, Value, json};

use crate::{
    AppState, admin_blogs, admin_content,
    admin_settings::{failed, failure, unauthorized, unauthorized_with_message},
    admin_site::CONFIG,
    ai_core::{self, Miss, Rules},
    api::{json_status, signed_in, truthy},
    indexing, pages,
    site_api::js_string,
    web::site_url,
    write,
};

fn ok(value: Value) -> Response {
    json_status(StatusCode::OK, value)
}

// ── audit rules ────────────────────────────────────────────────────────────────────────────────────────

const MAX_DESCRIPTION: usize = 160;
const MIN_DESCRIPTION: usize = 50;

fn text(v: &Value) -> &str {
    v.as_str().map(str::trim).unwrap_or("")
}

/// `string.length`
fn length(s: &str) -> usize {
    s.encode_utf16().count()
}

fn issue(field: &str, severity: &str, message: impl Into<String>) -> Value {
    json!({ "field": field, "severity": severity, "message": message.into() })
}

fn blog_issues(blog: &Value) -> Vec<Value> {
    let mut out = Vec::new();
    let description = Some(text(&blog["seoDescription"])).filter(|d| !d.is_empty()).unwrap_or_else(|| text(&blog["excerpt"]));
    if text(&blog["slug"]).is_empty() {
        out.push(issue("slug", "error", "Missing slug — URL is unstable."));
    }
    let size = length(description);
    if size == 0 {
        out.push(issue("seoDescription", "error", "No meta description (seoDescription/excerpt empty)."));
    } else if size > MAX_DESCRIPTION {
        out.push(issue("seoDescription", "warning", format!("Meta description is {size} chars (>{MAX_DESCRIPTION}); it may be truncated.")));
    } else if size < MIN_DESCRIPTION {
        out.push(issue("seoDescription", "warning", format!("Meta description is short ({size} chars).")));
    }
    if text(&blog["image"]).is_empty() && text(&blog["socialImage"]).is_empty() {
        out.push(issue("socialImage", "warning", "No image or social image — link previews will have no thumbnail."));
    }
    if !text(&blog["image"]).is_empty() && text(&blog["imageAlt"]).is_empty() {
        out.push(issue("imageAlt", "error", "Cover image has no alt text."));
    }
    if truthy(&blog["published"]) && truthy(&blog["noIndex"]) {
        out.push(issue("noIndex", "warning", "Published but marked noIndex — it will not be indexed."));
    }
    out
}

/// Issues of a project or an app.
fn content_issues(entity: &Value) -> Vec<Value> {
    let mut out = Vec::new();
    if text(&entity["slug"]).is_empty() {
        out.push(issue("slug", "warning", "Missing slug — falls back to a generated one."));
    }
    let size = length(text(&entity["description"]));
    if size == 0 {
        out.push(issue("description", "error", "No description — used as the meta description."));
    } else if size > MAX_DESCRIPTION {
        out.push(issue("description", "warning", format!("Description is {size} chars (>{MAX_DESCRIPTION}); meta tag may be truncated.")));
    }
    if text(&entity["image"]).is_empty() {
        out.push(issue("image", "warning", "No image — link previews will have no thumbnail."));
    }
    out
}

fn config_issues(config: &Value) -> Vec<Value> {
    let neither = |a: &str, b: &str| text(&config[a]).is_empty() && text(&config[b]).is_empty();
    let mut out = Vec::new();
    if neither("siteTitle", "logoText") {
        out.push(issue("siteTitle", "error", "No site title configured — page <title> suffix is empty."));
    }
    if neither("seoDescription", "description") {
        out.push(issue("description", "warning", "No default site description configured."));
    }
    if neither("ogImage", "socialImage") {
        out.push(issue("ogImage", "warning", "No default OG image configured (falls back to /og-image.png)."));
    }
    out
}

/// `getBlogSlug`: the stored slug, else one made from the title, else from the id.
fn blog_slug(blog: &Value) -> String {
    let named = json!({ "slug": blog["slug"], "name": blog["title"], "_id": blog["_id"] });
    pages::entity_slug(&named, "blog")
}

const STATIC_PAGES: [(&str, &str); 8] = [
    ("/", "Home"), ("/about-me", "About"), ("/projects", "Projects"), ("/apps", "Apps"), ("/blogs", "Blogs"), ("/gallery", "Gallery"),
    ("/contact-us", "Contact"), ("/github", "GitHub"),
];

fn summary(records: &[&Value]) -> Value {
    let (mut errors, mut warnings, mut clean) = (0, 0, 0);
    for record in records {
        match record["issues"].as_array().filter(|i| !i.is_empty()) {
            None => clean += 1,
            Some(issues) if issues.iter().any(|i| i["severity"] == "error") => errors += 1,
            Some(_) => warnings += 1,
        }
    }
    json!({ "total": records.len(), "errors": errors, "warnings": warnings, "ok": clean })
}

/// `GET /api/admin/seo/audit`
pub async fn audit(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result: anyhow::Result<Value> = async {
        let base = site_url();
        let entry = |row: &Value, name: &str, area: &str, slug: String, edit: &str, issues: Vec<Value>| {
            let title = if truthy(&row[name]) { row[name].clone() } else { "Untitled".into() };
            json!({
                "id": row["_id"], "title": title, "url": indexing::canonical(&base, &format!("/{area}/{slug}")),
                "editUrl": format!("/admin/{edit}/{}", js_string(&row["_id"])), "issues": issues,
            })
        };
        let newest = r#"ORDER BY "updatedAt" DESC"#;
        let blogs: Vec<Value> = pages::client_rows(&state.db, "Blog", &format!("WHERE published {newest}"))
            .await?
            .iter()
            .map(|b| entry(b, "title", "blogs", blog_slug(b), "blogs", blog_issues(b)))
            .collect();
        let projects: Vec<Value> = pages::client_rows(&state.db, "Project", newest)
            .await?
            .iter()
            .map(|p| entry(p, "name", "projects", pages::entity_slug(p, "project"), "projects", content_issues(p)))
            .collect();
        let apps: Vec<Value> = pages::client_rows(&state.db, "Deployment", newest)
            .await?
            .iter()
            .map(|d| entry(d, "name", "apps", pages::entity_slug(d, "app"), "apps", content_issues(d)))
            .collect();
        // Site-wide settings are the defaults of every static page.
        let site = config_issues(&pages::try_singleton(&state.db, CONFIG.table, false).await?);
        let fixed: Vec<Value> = STATIC_PAGES
            .iter()
            .map(|(path, label)| json!({ "id": path, "title": label, "url": indexing::canonical(&base, path), "editUrl": "/admin/config", "issues": site }))
            .collect();
        let all: Vec<&Value> = blogs.iter().chain(&projects).chain(&apps).chain(&fixed).collect();
        let summary = summary(&all);
        Ok(json!({ "success": true, "summary": summary, "groups": { "blogs": blogs, "projects": projects, "apps": apps, "static": fixed } }))
    }
    .await;
    result.map(ok).unwrap_or_else(|err| failed("/api/admin/seo/audit", StatusCode::INTERNAL_SERVER_ERROR, err))
}

// ── live crawl ─────────────────────────────────────────────────────────────────────────────────────────

const GOOGLEBOT: &str = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const MAX_CRAWL: f64 = 200.0;
const SLOW_MS: u128 = 1500;

static CRAWLER: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).user_agent(GOOGLEBOT).build().expect("static client settings")
});

/// `origin + pathname`, without a trailing slash.
fn normalize(url: &str) -> String {
    match reqwest::Url::parse(url) {
        Ok(u) => format!("{}{}", u.origin().ascii_serialization(), u.path().trim_end_matches('/')),
        Err(_) => url.to_string(),
    }
}

fn first<'a>(pattern: &Regex, html: &'a str) -> &'a str {
    pattern.captures(html).and_then(|c| c.get(1)).map_or("", |m| m.as_str())
}

/// What Search Console would report about a response.
fn evaluate(url: &str, status: u16, location: Option<&str>, html: &str, ms: u128) -> Vec<Value> {
    static CANONICAL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']"#).expect("constant pattern"));
    static ROBOTS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']"#).expect("constant pattern"));
    let found = |severity: &str, message: String| json!({ "severity": severity, "message": message });
    if (300..400).contains(&status) {
        return vec![found("error", format!("Redirects ({status}) -> {}", location.filter(|l| !l.is_empty()).unwrap_or("?")))];
    }
    if status != 200 {
        return vec![found("error", format!("Status {status}"))];
    }
    let mut out = Vec::new();
    let canonical = first(&CANONICAL, html);
    if !canonical.is_empty() && normalize(canonical) != normalize(url) {
        out.push(found("warning", format!("Canonical points elsewhere -> {canonical}")));
    }
    let robots = first(&ROBOTS, html);
    if robots.to_ascii_lowercase().contains("noindex") {
        out.push(found("error", format!("noindex (robots=\"{robots}\")")));
    }
    if ms > SLOW_MS {
        out.push(found("warning", format!("Slow TTFB {ms}ms (>{SLOW_MS}ms)")));
    }
    out
}

async fn crawl_one(url: String) -> Value {
    let start = Instant::now();
    let sent = CRAWLER.get(&url).timeout(Duration::from_secs(20)).send().await;
    let ms = start.elapsed().as_millis();
    let response = match sent {
        Ok(response) => response,
        Err(err) => {
            let why = if err.is_timeout() { "This operation was aborted" } else { "fetch failed" };
            return json!({ "url": url, "status": "ERR", "ms": ms as u64, "issues": [{ "severity": "error", "message": format!("Request failed: {why}") }] });
        }
    };
    let status = response.status().as_u16();
    let location = response.headers().get("location").and_then(|v| v.to_str().ok()).map(str::to_string);
    let html = if status == 200 { response.text().await.unwrap_or_default() } else { String::new() };
    let issues = evaluate(&url, status, location.as_deref(), &html, ms);
    json!({ "url": url, "status": status, "ms": ms as u64, "issues": issues })
}

async fn crawl_sitemap(base: &str, limit: usize) -> anyhow::Result<Value> {
    static LOC: LazyLock<Regex> = LazyLock::new(|| Regex::new("<loc>([^<]+)</loc>").expect("constant pattern"));
    let failed = |_| anyhow::anyhow!("fetch failed");
    // The sitemap itself may redirect; the pages are fetched without following.
    let response = reqwest::Client::new()
        .get(format!("{}/sitemap.xml", base.trim_end_matches('/')))
        .header("user-agent", GOOGLEBOT)
        .timeout(Duration::from_secs(20))
        .send()
        .await
        .map_err(failed)?;
    anyhow::ensure!(response.status().is_success(), "sitemap.xml returned HTTP {}", response.status().as_u16());
    let xml = response.text().await.map_err(failed)?;
    let urls: Vec<String> = LOC.captures_iter(&xml).map(|c| c[1].trim().to_string()).take(limit).collect();
    let results: Vec<Value> = futures_util::stream::iter(urls).map(crawl_one).buffered(6).collect().await;
    let views: Vec<&Value> = results.iter().collect();
    let mut counts = summary(&views);
    let total: u64 = results.iter().filter_map(|r| r["ms"].as_u64()).sum();
    let average = if results.is_empty() { 0 } else { (total as f64 / results.len() as f64).round() as u64 };
    if let Some(fields) = counts.as_object_mut() {
        let clean = fields.shift_remove("ok").unwrap_or_default();
        let errors = fields.shift_remove("errors").unwrap_or_default();
        let warnings = fields.shift_remove("warnings").unwrap_or_default();
        fields.extend([("ok".into(), clean), ("errors".into(), errors), ("warnings".into(), warnings), ("avgMs".into(), average.into())]);
    }
    Ok(json!({ "success": true, "base": base, "summary": counts, "results": results }))
}

/// `POST /api/admin/seo/crawl`
pub async fn crawl(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized();
    }
    let asked = write::json_body(body).await.and_then(|b| b["limit"].as_f64());
    let limit = asked.map_or(MAX_CRAWL, |n| n.clamp(1.0, MAX_CRAWL)) as usize;
    crawl_sitemap(&site_url(), limit).await.map(ok).unwrap_or_else(|err| failed("/api/admin/seo/crawl", StatusCode::INTERNAL_SERVER_ERROR, err))
}

// ── indexing ───────────────────────────────────────────────────────────────────────────────────────────

/// `POST /api/admin/seo/index`: `{ urls, type }`.
pub async fn index(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized();
    }
    let body = write::json_body(body).await.unwrap_or_else(|| json!({}));
    let kind = indexing::TYPES.into_iter().find(|t| body["type"] == *t).unwrap_or(indexing::TYPES[0]);
    let urls: Vec<String> = body["urls"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|u| if truthy(u) { js_string(u).trim().to_string() } else { String::new() })
        .filter(|u| !u.is_empty())
        .take(100)
        .collect();
    if urls.is_empty() {
        return failure(StatusCode::BAD_REQUEST, "No URLs provided.");
    }
    let result: anyhow::Result<Response> = async {
        let account = match indexing::account(&state).await? {
            None => return Ok(failure(StatusCode::BAD_REQUEST, "No Google service account configured.")),
            Some(None) => return Ok(failure(StatusCode::BAD_REQUEST, "Stored service account could not be decrypted.")),
            Some(Some(account)) => account,
        };
        let results = indexing::ping(&state, &account, &urls, kind).await?;
        indexing::record(&state, &results, kind, "").await?;
        let sent = results.iter().filter(|r| r.ok).count();
        let listed: Vec<Value> = results.iter().map(indexing::Ping::json).collect();
        Ok(ok(json!({ "success": true, "type": kind, "sent": results.len(), "ok": sent, "results": listed })))
    }
    .await;
    result.unwrap_or_else(|err| failed("/api/admin/seo/index", StatusCode::INTERNAL_SERVER_ERROR, err))
}

// ── AI fixes ───────────────────────────────────────────────────────────────────────────────────────────

const ONLY: &str = " Output ONLY the description text with no quotes, no markdown, and no conversational filler.";

async fn generate(state: &AppState, config: &Value, system: &str, prompt: String, mode: &str) -> anyhow::Result<String> {
    let prompt = Value::String(prompt);
    let rules = Rules { google_only: true, accept_empty: true };
    let won = match ai_core::first_answer(state, &config["ai"], "textPriority", system, &prompt, None, rules).await {
        Ok(won) => won,
        Err(Miss::NoModels) => anyhow::bail!("No AI models configured in priority list. Please check settings."),
        Err(Miss::Failed(last)) => anyhow::bail!("All configured AI fallback mechanisms failed. Last API error: {last}"),
    };
    anyhow::ensure!(!won.answer.text.is_empty(), "All configured AI fallback mechanisms failed. Last API error: Unknown configuration issue.");
    ai_core::record(state, &won.provider, &won.model, mode.into(), &prompt, &won.answer).await;
    Ok(won.answer.text.trim().to_string())
}

fn has(issues: &[Value], field: &str) -> bool {
    issues.iter().any(|i| i["field"] == field)
}

/// `techStack?.join(', ') || ''`
fn stack(row: &Value) -> String {
    row["techStack"].as_array().map(|t| t.iter().map(js_string).collect::<Vec<_>>().join(", ")).unwrap_or_default()
}

/// Writes the description of a project or an app when it has an issue there.
async fn describe(state: &AppState, config: &Value, table: &write::Table, id: &str, row: &Value, what: (&str, &str)) -> anyhow::Result<Vec<&'static str>> {
    if !has(&content_issues(row), "description") {
        return Ok(Vec::new());
    }
    let (subject, label) = what;
    let system = format!("You are an expert copywriter and SEO specialist. Write a concise and compelling {subject}.{ONLY}");
    let prompt = format!("{label}: \"{}\"\nTech Stack: \"{}\"", js_string(&row["name"]), stack(row));
    let written = generate(state, config, &system, prompt, "refine_project_description").await?;
    if written.is_empty() {
        return Ok(Vec::new());
    }
    write::update(&state.db, table, id, write::prepare(table, &json!({ "description": written }))?).await?;
    Ok(vec!["description"])
}

async fn fix_blog(state: &AppState, config: &Value, id: &str, blog: &Value) -> anyhow::Result<Vec<&'static str>> {
    let issues = blog_issues(blog);
    let mut patch = Map::new();
    let mut fixed = Vec::new();
    if has(&issues, "seoDescription") {
        let system = format!("You are an expert copywriter and SEO specialist. Write a concise and compelling SEO meta description (50-160 characters) for a blog post.{ONLY}");
        let content: Vec<u16> = blog["content"].as_str().unwrap_or("").encode_utf16().take(1500).collect();
        let prompt = format!(
            "Title: \"{}\"\nExcerpt: \"{}\"\nContent: \"{}\"",
            js_string(&blog["title"]), js_string(&blog["excerpt"]), String::from_utf16_lossy(&content)
        );
        let written = generate(state, config, &system, prompt, "suggest_excerpt").await?;
        if !written.is_empty() {
            patch.insert("seoDescription".into(), written.into());
            fixed.push("seoDescription");
        }
    }
    if has(&issues, "imageAlt") && truthy(&blog["image"]) {
        let system = "You are an expert copywriter and accessibility specialist. Write a natural, descriptive alt text (under 125 characters) for the cover image of a blog post. Output ONLY the alt text description with no quotes, no markdown, and no conversational filler.";
        let about = if truthy(&blog["excerpt"]) { &blog["excerpt"] } else { &blog["seoDescription"] };
        let prompt = format!("Title: \"{}\"\nDescription: \"{}\"", js_string(&blog["title"]), js_string(about));
        let written = generate(state, config, system, prompt, "suggest_excerpt").await?;
        if !written.is_empty() {
            patch.insert("imageAlt".into(), written.into());
            fixed.push("imageAlt");
        }
    }
    if !patch.is_empty() {
        let table = &admin_blogs::BLOG;
        write::update(&state.db, table, id, write::prepare(table, &Value::Object(patch))?).await?;
    }
    Ok(fixed)
}

async fn fix_site(state: &AppState, config: &Value) -> anyhow::Result<Vec<&'static str>> {
    let issues = config_issues(config);
    // As in Next: the patch starts from a `data` key of the document, which it normally does not have.
    let mut patch = config["data"].as_object().cloned().unwrap_or_default();
    let mut fixed = Vec::new();
    let named = |patch: &Map<String, Value>, key: &str, fallback: &str| patch.get(key).filter(|v| truthy(v)).map_or_else(|| fallback.to_string(), js_string);
    if has(&issues, "siteTitle") {
        let system = "You are a creative copywriter. Suggest a concise, professional, and SEO-friendly site title (under 60 characters) for a software developer's portfolio site. Output ONLY the title text with no quotes, no markdown, and no conversational filler.";
        let prompt = format!("Author Name: \"{}\"\nProfession: \"{}\"", named(&patch, "authorName", "Developer"), named(&patch, "profession", "Software Engineer"));
        let written = generate(state, config, system, prompt, "suggest_title").await?;
        if !written.is_empty() {
            patch.insert("siteTitle".into(), written.into());
            fixed.push("siteTitle");
        }
    }
    if has(&issues, "description") {
        let system = format!("You are an expert copywriter and SEO specialist. Write a concise and compelling default site SEO description (50-160 characters) for a developer portfolio.{ONLY}");
        let prompt = format!(
            "Author Name: \"{}\"\nProfession: \"{}\"\nSite Title: \"{}\"",
            named(&patch, "authorName", "Developer"), named(&patch, "profession", "Software Engineer"), named(&patch, "siteTitle", "")
        );
        let written = generate(state, config, &system, prompt, "refine_summary").await?;
        if !written.is_empty() {
            patch.insert("siteDescription".into(), written.clone().into());
            patch.insert("seoDescription".into(), written.into());
            fixed.push("description");
        }
    }
    if !fixed.is_empty() {
        write::upsert_singleton(&state.db, &CONFIG, &patch).await?;
    }
    Ok(fixed)
}

/// `POST /api/admin/seo/fix`: `{ type, id }`.
pub async fn fix(State(state): State<AppState>, req: Request) -> Response {
    const ROUTE: &str = "/api/admin/seo/fix";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return unauthorized_with_message();
    }
    let result: anyhow::Result<Response> = async {
        let config = ai_core::stored_config(&state).await?;
        if !truthy(&config["ai"]["enabled"]) {
            return Ok(failure(StatusCode::FORBIDDEN, "AI system is disabled in settings."));
        }
        let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else { anyhow::bail!("Invalid JSON body") };
        if !truthy(&body["type"]) || !truthy(&body["id"]) {
            return Ok(failure(StatusCode::BAD_REQUEST, "Type and ID are required."));
        }
        let kind = js_string(&body["type"]);
        let missing = |what: &str| Ok(failure(StatusCode::from_u16(444).expect("a valid status"), &format!("{what} not found.")));
        let (table, what, subject, label) = match kind.as_str() {
            "blog" => (&admin_blogs::BLOG, "Blog post", "", ""),
            "project" => (&admin_content::PROJECT, "Project", "project description (50-160 characters) for a developer portfolio", "Project Name"),
            "app" => (&admin_content::DEPLOYMENT, "App/Deployment", "description (50-160 characters) for a hosted web application", "App Name"),
            "static" => {
                let fixed = fix_site(&state, &config).await?;
                return Ok(ok(json!({ "success": true, "fixedIssues": fixed })));
            }
            other => return Ok(failure(StatusCode::BAD_REQUEST, &format!("Unsupported type: {other}"))),
        };
        let Some(id) = body["id"].as_str() else { anyhow::bail!("Type and ID must be text") };
        let Some(row) = write::find(&state.db, table.name, id).await? else { return missing(what) };
        let fixed = if kind == "blog" {
            fix_blog(&state, &config, id, &row).await?
        } else {
            describe(&state, &config, table, id, &row, (subject, label)).await?
        };
        Ok(ok(json!({ "success": true, "fixedIssues": fixed })))
    }
    .await;
    result.unwrap_or_else(|err| failed(ROUTE, StatusCode::INTERNAL_SERVER_ERROR, err))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audit_rules_match_the_javascript() {
        let fields = |issues: Vec<Value>| issues.iter().map(|i| i["field"].as_str().unwrap().to_string()).collect::<Vec<_>>();
        assert_eq!(fields(blog_issues(&json!({ "image": "/a.png", "published": true, "noIndex": true }))), ["slug", "seoDescription", "imageAlt", "noIndex"]);
        assert_eq!(fields(content_issues(&json!({ "slug": "s", "description": "d".repeat(161), "image": "i" }))), ["description"]);
        assert_eq!(fields(config_issues(&json!({ "logoText": "a", "description": "d" }))), ["ogImage"]);
    }

    #[test]
    fn crawl_findings() {
        let html = r#"<link rel="canonical" href="https://s.example/b/"><meta name="robots" content="NoIndex">"#;
        let found = evaluate("https://s.example/a", 200, None, html, 1600);
        assert_eq!(found.len(), 3);
        assert_eq!(found[0]["message"], "Canonical points elsewhere -> https://s.example/b/");
        assert!(evaluate("https://s.example/b", 200, None, r#"<link rel="canonical" href="https://s.example/b/">"#, 1).is_empty());
        assert_eq!(evaluate("u", 308, Some("/x"), "", 1)[0]["message"], "Redirects (308) -> /x");
    }
}
