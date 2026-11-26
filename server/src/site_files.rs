//! The files crawlers and agents read: robots.txt, sitemap.xml, ads.txt, auth.md and /docs/*
//! (src/app/robots.js, sitemap.js, ads.txt, auth.md and docs).

use axum::{
    extract::State,
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{NaiveDateTime, SecondsFormat, Utc};
use serde_json::{Value, json};
use std::collections::HashSet;

use crate::{
    AppState, ai, pages, seo,
    api::{log_error, truthy},
    site_api::js_string,
    web::site_url,
};

fn file(content_type: &'static str, cache: &'static str, body: String) -> Response {
    ([(header::CONTENT_TYPE, content_type), (header::CACHE_CONTROL, cache)], body).into_response()
}

/// Always fresh, as Next's metadata routes answer.
const REVALIDATE: &str = "public, max-age=0, must-revalidate";

// ── robots.txt ─────────────────────────────────────────────────────────────────────────────────────────

/// `toCanonicalSiteUrl`
fn canonical(base: &str, path: &str) -> String {
    let path = path.trim();
    if path.is_empty() || path == "/" {
        return base.to_string();
    }
    let slash = if path.starts_with('/') { "" } else { "/" };
    format!("{base}{slash}{}", path.trim_end_matches('/'))
}

/// A value or a list of values, as lines.
fn lines(out: &mut String, name: &str, value: &Value) {
    match value {
        Value::Array(items) => items.iter().for_each(|v| out.push_str(&format!("{name}: {}\n", js_string(v)))),
        v => out.push_str(&format!("{name}: {}\n", js_string(v))),
    }
}

/// Next's `resolveRobots` over the rules of the SEO settings.
fn robots_text(config: &Value, base: &str) -> String {
    let robots = &config["robots"];
    let mut out = String::new();
    for rule in robots["rules"].as_array().into_iter().flatten() {
        let or = |v: &Value, fallback: &str| if truthy(v) && v.as_array().is_none_or(|a| !a.is_empty()) { v.clone() } else { fallback.into() };
        lines(&mut out, "User-Agent", &or(&rule["userAgent"], "*"));
        lines(&mut out, "Allow", &or(&rule["allow"], "/"));
        if rule["disallow"].is_array() {
            lines(&mut out, "Disallow", &rule["disallow"]);
        }
        if rule["crawlDelay"].as_f64().is_some_and(|d| d != 0.0) {
            lines(&mut out, "Crawl-delay", &rule["crawlDelay"]);
        }
        out.push('\n');
    }
    lines(&mut out, "Sitemap", &canonical(base, "/sitemap.xml").into());
    for extra in robots["extraSitemaps"].as_array().into_iter().flatten().filter(|v| truthy(v)) {
        lines(&mut out, "Sitemap", extra);
    }
    out
}

/// `GET /robots.txt`
pub async fn robots(State(state): State<AppState>) -> Response {
    // getSeoConfig never throws: a database error serves the defaults.
    let stored = pages::singleton(&state.db, "SeoConfig", false).await;
    file("text/plain", REVALIDATE, robots_text(&seo::merge_seo_config(&stored), &site_url()))
}

// ── sitemap.xml ────────────────────────────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct Entry {
    url: String,
    modified: String,
    frequency: String,
    priority: f64,
}

fn entry(url: String, modified: &str, frequency: &str, priority: f64) -> Entry {
    Entry { url, modified: modified.into(), frequency: frequency.into(), priority }
}

/// `origin + pathname` without a trailing slash; what routes are compared and listed by.
fn normalize(value: &str, base: &str) -> String {
    match reqwest::Url::parse(base).and_then(|b| b.join(value)) {
        Ok(u) => format!("{}{}", u.origin().ascii_serialization(), u.path().trim_end_matches('/')),
        Err(_) => value.trim_end_matches('/').to_string(),
    }
}

/// The first entry of every address.
fn unique(entries: Vec<Entry>, base: &str) -> Vec<Entry> {
    let mut seen = HashSet::new();
    entries
        .into_iter()
        .filter(|e| !e.url.is_empty())
        .filter_map(|e| {
            let url = normalize(&e.url, base);
            seen.insert(url.clone()).then_some(Entry { url, ..e })
        })
        .collect()
}

/// `applySitemapOverrides`: drop the excluded addresses, add the extra ones.
fn overrides(entries: Vec<Entry>, settings: &Value, base: &str, now: &str) -> Vec<Entry> {
    let excluded: HashSet<String> = settings["excludePaths"].as_array().into_iter().flatten().map(|p| normalize(&js_string(p), base)).collect();
    let extra = settings["extraUrls"].as_array().into_iter().flatten().filter(|e| truthy(&e["url"])).map(|e| Entry {
        url: js_string(&e["url"]),
        modified: now.into(),
        frequency: e["changeFrequency"].as_str().filter(|f| !f.is_empty()).unwrap_or("monthly").into(),
        priority: e["priority"].as_f64().unwrap_or(0.5),
    });
    unique(entries.into_iter().chain(extra).collect(), base).into_iter().filter(|e| !excluded.contains(&e.url)).collect()
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}

fn xml(entries: &[Entry]) -> String {
    let mut out = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
    for e in entries {
        out.push_str(&format!(
            "<url>\n<loc>{}</loc>\n<lastmod>{}</lastmod>\n<changefreq>{}</changefreq>\n<priority>{}</priority>\n</url>\n",
            escape_xml(&e.url),
            e.modified,
            escape_xml(&e.frequency),
            e.priority
        ));
    }
    out.push_str("</urlset>\n");
    out
}

fn iso(t: NaiveDateTime) -> String {
    t.and_utc().to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// When each content collection last changed.
#[derive(Default)]
struct Changed {
    blogs: Option<NaiveDateTime>,
    projects: Option<NaiveDateTime>,
    apps: Option<NaiveDateTime>,
}

/// The fixed pages, in sitemap order.
fn static_routes(base: &str, changed: &Changed, now: &str) -> Vec<Entry> {
    let at = |t: Option<NaiveDateTime>| t.map(iso).unwrap_or_else(|| now.to_string());
    let (projects, apps, blogs) = (at(changed.projects), at(changed.apps), at(changed.blogs));
    [
        ("", now, "weekly", 1.0),
        ("/about-me", now, "monthly", 0.8),
        ("/projects", &projects, "weekly", 0.9),
        ("/apps", &apps, "weekly", 0.85),
        ("/blogs", &blogs, "weekly", 0.8),
        ("/ai", now, "weekly", 0.85),
        ("/gallery", now, "monthly", 0.7),
        ("/games", now, "weekly", 0.85),
        ("/github", now, "weekly", 0.7),
        ("/desktop", now, "monthly", 0.75),
        ("/contact-us", now, "monthly", 0.7),
    ]
    .into_iter()
    .map(|(path, modified, frequency, priority)| entry(format!("{base}{path}"), modified, frequency, priority))
    .collect()
}

/// One entry per AI Hub section that has its own page.
async fn ai_routes(state: &AppState, base: &str, now: &str) -> Vec<Entry> {
    let Some(web) = state.web.as_ref() else { return vec![] };
    match ai::hydrated(&state.db, &web.ai_defaults).await {
        Ok(config) => ai::SUBPAGES
            .iter()
            .filter(|(kind, ..)| ai::renderable_section(&config, kind).is_some())
            .map(|(_, slug, _)| entry(format!("{base}/ai/{slug}"), now, "weekly", 0.8))
            .collect(),
        Err(err) => {
            tracing::warn!(error = %err, "sitemap: AI sub-pages skipped");
            vec![]
        }
    }
}

/// `(id, slug, name, updatedAt)` of a content table.
type Row = (String, String, String, NaiveDateTime);

fn slug(row: &Row, prefix: &str) -> String {
    pages::entity_slug(&json!({ "_id": row.0, "slug": row.1, "name": row.2 }), prefix)
}

/// Everything that comes from the database: content pages, product and legal pages, and the collections' dates.
async fn content_routes(state: &AppState, base: &str) -> anyhow::Result<(Changed, Vec<Entry>)> {
    let rows = async |sql: &str| sqlx::query_as::<_, Row>(sql).fetch_all(&state.db).await;
    let blogs = rows(r#"SELECT id, COALESCE(slug, ''), title, "updatedAt" FROM "Blog" WHERE published AND NOT "noIndex""#).await?;
    let projects = rows(r#"SELECT id, COALESCE(slug, ''), name, "updatedAt" FROM "Project""#).await?;
    let apps = rows(r#"SELECT id, COALESCE(slug, ''), name, "updatedAt" FROM "Deployment""#).await?;
    let latest = |r: &[Row]| r.iter().map(|r| r.3).max();
    let changed = Changed { blogs: latest(&blogs), projects: latest(&projects), apps: latest(&apps) };

    // A legal app pointing at a live deployment is that product's main page.
    let legal: Vec<(String, String, Option<String>, NaiveDateTime, bool)> = sqlx::query_as(
        r#"SELECT a.id, a.slug, a."deploymentId", a."updatedAt", EXISTS (SELECT 1 FROM "Deployment" d WHERE d.id = a."deploymentId")
           FROM "LegalApp" a"#,
    )
    .fetch_all(&state.db)
    .await?;
    let documents: Vec<(String, String, NaiveDateTime)> =
        sqlx::query_as(r#"SELECT "appId", slug, "updatedAt" FROM "LegalDocument" WHERE published AND NOT "noIndex""#).fetch_all(&state.db).await?;
    let products: HashSet<&str> = legal.iter().filter_map(|a| a.2.as_deref()).collect();

    let mut out = Vec::new();
    for b in &blogs {
        out.push(entry(canonical(base, &format!("/blogs/{}", slug(b, "blog"))), &iso(b.3), "monthly", 0.7));
    }
    for p in &projects {
        out.push(entry(canonical(base, &format!("/projects/{}", slug(p, "project"))), &iso(p.3), "monthly", 0.75));
    }
    // An app with a product page canonicalizes to it, so only that page is listed.
    for a in apps.iter().filter(|a| !products.contains(a.0.as_str())) {
        out.push(entry(canonical(base, &format!("/apps/{}", slug(a, "app"))), &iso(a.3), "weekly", 0.74));
    }
    for (id, app, _, updated, product) in &legal {
        let own: Vec<_> = documents.iter().filter(|d| &d.0 == id).collect();
        if own.is_empty() && !product {
            continue;
        }
        let newest = own.iter().map(|d| d.2).fold(*updated, NaiveDateTime::max);
        let (frequency, priority) = if *product { ("weekly", 0.85) } else { ("yearly", 0.3) };
        out.push(entry(canonical(base, &format!("/{app}")), &iso(newest), frequency, priority));
        for d in own {
            out.push(entry(canonical(base, &format!("/{app}/{}", d.1)), &iso(d.2), "yearly", 0.3));
        }
    }
    Ok((changed, out))
}

/// `GET /sitemap.xml`
pub async fn sitemap(State(state): State<AppState>) -> Response {
    // The games list comes from the web build; without it Next answers.
    let Some(web) = state.web.clone() else { return (StatusCode::SERVICE_UNAVAILABLE, "web build missing").into_response() };
    let base = site_url();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let ai = ai_routes(&state, &base, &now).await;
    let games: Vec<Entry> = web.discovery["games"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(|slug| entry(canonical(&base, &format!("/games/{slug}")), &now, "monthly", 0.75))
        .collect();

    let entries = match content_routes(&state, &base).await {
        Ok((changed, content)) => {
            let all = static_routes(&base, &changed, &now).into_iter().chain(ai).chain(content).chain(games).collect();
            let settings = seo::merge_seo_config(&pages::singleton(&state.db, "SeoConfig", false).await);
            overrides(unique(all, &base), &settings["sitemap"], &base, &now)
        }
        // Database unavailable: the fixed pages only.
        Err(err) => {
            log_error("/sitemap.xml", &err);
            unique(static_routes(&base, &Changed::default(), &now).into_iter().chain(ai).chain(games).collect(), &base)
        }
    };
    file("application/xml", REVALIDATE, xml(&entries))
}

// ── ads.txt, auth.md, docs ─────────────────────────────────────────────────────────────────────────────

/// `GET /ads.txt`
pub async fn ads_txt(State(state): State<AppState>) -> Response {
    match pages::try_singleton(&state.db, "Ads", true).await {
        Ok(ads) => {
            let text = if truthy(&ads["adsTxt"]) { js_string(&ads["adsTxt"]) } else { String::new() };
            file("text/plain; charset=utf-8", "public, max-age=3600, stale-while-revalidate=1800", text)
        }
        Err(err) => {
            log_error("/ads.txt", &err);
            (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response()
        }
    }
}

macro_rules! markdown_doc {
    ($name:ident, $key:literal) => {
        /// A markdown document exported by the web build.
        pub async fn $name(State(state): State<AppState>, req: axum::extract::Request) -> Response {
            match state.web.as_ref().and_then(|w| w.discovery[$key].as_str()) {
                Some(md) => file("text/markdown; charset=utf-8", "public, max-age=300, s-maxage=300", md.to_string()),
                None => crate::proxy::forward(State(state), req).await,
            }
        }
    };
}

markdown_doc!(auth_md, "authMd");
markdown_doc!(api_docs, "apiDocs");
markdown_doc!(mcp_docs, "mcpDocs");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn robots_lines_match_next() {
        let config = seo::merge_seo_config(&json!({ "robots": { "rules": [
            { "userAgent": ["a", "b"], "disallow": ["/x"], "crawlDelay": 2 },
            { "allow": [], "disallow": "no", "crawlDelay": 0 },
        ], "extraSitemaps": ["", "https://e.org/s.xml"] } }));
        assert_eq!(
            robots_text(&config, "https://s.org"),
            "User-Agent: a\nUser-Agent: b\nAllow: /\nDisallow: /x\nCrawl-delay: 2\n\nUser-Agent: *\nAllow: /\n\n\
             Sitemap: https://s.org/sitemap.xml\nSitemap: https://e.org/s.xml\n"
        );
    }

    #[test]
    fn sitemap_overrides_exclude_add_and_dedupe() {
        let base = "https://s.org";
        let list = unique(vec![entry(base.into(), "t", "weekly", 1.0), entry(format!("{base}/a/"), "t", "weekly", 0.8), entry(format!("{base}/a"), "u", "x", 0.1)], base);
        assert_eq!(list.iter().map(|e| e.url.as_str()).collect::<Vec<_>>(), [base, "https://s.org/a"]);
        let out = overrides(list, &json!({ "excludePaths": ["/a"], "extraUrls": [{ "url": "/b?q=1" }, {}] }), base, "n");
        assert_eq!(out.iter().map(|e| (e.url.as_str(), e.priority)).collect::<Vec<_>>(), [(base, 1.0), ("https://s.org/b", 0.5)]);
        assert!(xml(&out).contains("<priority>1</priority>"));
    }

    #[test]
    fn canonical_urls() {
        assert_eq!(canonical("https://s.org", "/"), "https://s.org");
        assert_eq!(canonical("https://s.org", "a/b/"), "https://s.org/a/b");
    }
}
