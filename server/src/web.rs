//! Pages served by the Vite app (`web/`). Rust sends `web/dist/index.html` with:
//! - the `<head>` crawlers need: Next merges page metadata over the root layout's, replacing whole groups
//!   (OG, Twitter, robots); `Head` reproduces that per page
//! - `#__DATA__`: server values for the shell (GA id, AdSense, logo), the v2 chrome data and the page data
//! - crawler HTML inside #root (React replaces it on mount)
//! Keep the route list in sync with `web/src/appRoutes.ts`.

use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Redirect, Response},
};
use serde_json::{Value, json};
use std::{collections::HashMap, sync::Arc};

use crate::{AppState, pages, session::session_cookie};

#[derive(serde::Deserialize, Clone)]
pub struct PageMeta {
    pub title: String,
    pub description: String,
}

/// Loaded once at startup.
pub struct WebApp {
    template: String,
    meta: HashMap<String, PageMeta>,
}

impl WebApp {
    pub fn load(dir: &std::path::Path) -> anyhow::Result<Arc<Self>> {
        let template = std::fs::read_to_string(dir.join("index.html"))?;
        let meta = serde_json::from_str(&std::fs::read_to_string(dir.join("route-meta.json"))?)?;
        Ok(Arc::new(Self { template, meta }))
    }
}

// ── routes ───────────────────────────────────────────────────────────────────────────────────────────

/// `/games`, `/games/{slug}`: title/description from route-meta.json; unknown or hidden cabinets are 404.
pub async fn page(State(state): State<AppState>, req: Request) -> Response {
    let Some(web) = state.web.clone() else { return crate::proxy::forward(State(state), req).await };
    let path = req.uri().path().trim_end_matches('/').to_string();
    let site = Site::load(&state).await;
    let (status, head) = match web.meta.get(&path) {
        Some(m) => (StatusCode::OK, site.root_head(&m.title, &m.description)),
        None => (StatusCode::NOT_FOUND, site.not_found_head()),
    };
    render(&web, &state, req.headers(), &site, status, head, json!(null), json!(null), String::new())
}

/// `/blogs`: port of src/app/(site)/blogs/page.js.
pub async fn blogs_index(State(state): State<AppState>, req: Request) -> Response {
    let Some(web) = state.web.clone() else { return crate::proxy::forward(State(state), req).await };
    let site = Site::load(&state).await;
    let blogs = match pages::blog_list(&state.db).await {
        Ok(b) => b,
        Err(err) => return server_error(err),
    };
    let shell = pages::shell_data(&state, &site.config).await;
    let base = &site.base_url;
    let title = format!("{} | Writing", site.base_name);
    let description = "Every post as a plain editorial index — fast, server-rendered, no scripts. V2 edition.";
    let mut head = Head::site(&site, &title, description);
    head.canonical = format!("{base}/blogs");
    head.og = vec![
        ("og:title", title.clone()),
        ("og:description", description.into()),
        ("og:url", format!("{base}/blogs")),
        ("og:type", "website".into()),
    ];
    head.json_ld.push(breadcrumb(&site, &shell, "/blogs", "Blogs", &[]));

    let mut fallback = format!("<main><h1>Notes from the workbench.</h1><ul>");
    for b in &blogs {
        let slug = b["slug"].as_str().unwrap_or_default();
        fallback.push_str(&format!(r#"<li><a href="/blogs/{}">{}</a></li>"#, escape(slug), escape(b["title"].as_str().unwrap_or_default())));
    }
    fallback.push_str("</ul></main>");

    let page = json!({ "blogs": blogs, "config": site.config });
    render(&web, &state, req.headers(), &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/blogs/{id}`: port of src/app/(site)/blogs/[id]/page.js.
pub async fn blog_detail(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let Some(web) = state.web.clone() else { return crate::proxy::forward(State(state), req).await };
    let site = Site::load(&state).await;
    let blog = match pages::blog_by_identifier(&state.db, &id).await {
        Ok(pages::BlogLookup::Found(b)) => b,
        Ok(pages::BlogLookup::Redirect(to)) => return Redirect::permanent(&to).into_response(),
        Ok(pages::BlogLookup::NotFound) => {
            let mut head = site.not_found_head();
            head = head.replace("404 - Page Not Found", &format!("Blog Not Found | {}", escape(&site.base_name)));
            return render(&web, &state, req.headers(), &site, StatusCode::NOT_FOUND, head, json!(null), json!(null), String::new());
        }
        Err(err) => return server_error(err),
    };
    let s = |k: &str| blog.get(k).and_then(Value::as_str).filter(|v| !v.is_empty()).map(str::to_string);
    let base = site.base_url.clone();
    let slug = s("slug").unwrap_or_else(|| id.clone());
    let content = s("content").unwrap_or_default();
    let seo_title = s("seoTitle").or_else(|| s("title")).unwrap_or_else(|| site.base_name.clone());
    let fallback_desc: String = content.chars().take(160).collect();
    let description = s("seoDescription").or_else(|| s("excerpt")).unwrap_or(fallback_desc);
    let social_title = s("socialTitle").unwrap_or_else(|| seo_title.clone());
    let social_desc = s("socialDescription").unwrap_or_else(|| description.clone());
    let og_image = pages::absolute(&base, &s("socialImage").or_else(|| s("image")).unwrap_or_else(|| site.og_image.clone()));
    let canonical = safe_canonical(&base, s("canonicalUrl").as_deref(), &format!("/blogs/{slug}"));
    let keywords = ["keywords", "tags"]
        .iter()
        .filter_map(|k| blog.get(*k).and_then(Value::as_array).filter(|a| !a.is_empty()))
        .next()
        .map(|a| a.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(","))
        .unwrap_or_default();
    let published = iso(blog.get("date")).or_else(|| iso(blog.get("createdAt")));
    let modified = iso(blog.get("updatedAt")).or_else(|| published.clone());

    let mut head = Head::site(&site, &format!("{} | {seo_title}", site.base_name), &description);
    head.keywords = keywords;
    head.robots = if blog.get("noIndex") == Some(&Value::Bool(true)) { "noindex, follow, nocache".into() } else { "index, follow".into() };
    head.googlebot = false;
    head.canonical = canonical.clone();
    head.og = vec![
        ("og:title", social_title.clone()),
        ("og:description", social_desc.clone()),
        ("og:url", canonical.clone()),
        ("og:site_name", site.base_name.clone()),
        ("og:image", og_image.clone()),
        ("og:image:width", "1200".into()),
        ("og:image:height", "630".into()),
        ("og:image:alt", s("socialImageAlt").or_else(|| s("imageAlt")).or_else(|| s("title")).unwrap_or_else(|| "Blog cover image".into())),
        ("og:type", "article".into()),
    ];
    if let Some(p) = &published {
        head.og.push(("article:published_time", p.clone()));
    }
    if let Some(m) = &modified {
        head.og.push(("article:modified_time", m.clone()));
    }
    head.twitter = Some((social_title, social_desc, og_image));
    let shell = pages::shell_data(&state, &site.config).await;
    head.json_ld.push(json!({
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": blog.get("title"), "description": description,
        "image": s("socialImage").or_else(|| s("image")),
        "datePublished": blog.get("createdAt"), "dateModified": blog.get("updatedAt"),
        "author": { "@type": "Person", "name": std::env::var("NEXT_PUBLIC_AUTHOR_NAME").unwrap_or_else(|_| "Portfolio Owner".into()) },
        "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
        "wordCount": content.encode_utf16().count(),
    }));
    let title = s("title").unwrap_or_default();
    head.json_ld.push(breadcrumb(&site, &shell, "/blogs", "Blogs", &[(title.clone(), format!("/blogs/{slug}"))]));

    let view_count = if site.config.get("showBlogViewCount") == Some(&Value::Bool(true)) {
        json!(pages::blog_view_count(&state.db, blog["_id"].as_str().unwrap_or_default()).await)
    } else {
        Value::Null
    };
    let fallback = format!("<main><article><h1>{}</h1>{}</article></main>", escape(&title), pages::markdown_html(&content));
    let page = json!({ "blog": blog, "config": site.config, "adsConfig": pages::ads_config(&state).await, "viewCount": view_count });
    render(&web, &state, req.headers(), &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/_img/blog/{id}`: a blog cover stored inline as a data URI.
pub async fn blog_image(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    match pages::blog_inline_image(&state.db, &id).await {
        Some((mime, bytes)) => {
            let mut res = Response::new(Body::from(bytes));
            let h = res.headers_mut();
            if let Ok(v) = HeaderValue::from_str(&mime) {
                h.insert(header::CONTENT_TYPE, v);
            }
            h.insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=86400"));
            h.insert("x-content-type-options", HeaderValue::from_static("nosniff"));
            res
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

// ── rendering ────────────────────────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn render(web: &WebApp, state: &AppState, headers: &HeaderMap, site: &Site, status: StatusCode, head: String, shell: Value, page: Value, fallback: String) -> Response {
    // isAdminViewer: a valid JWT is enough (no Session row check), as in src/lib/adminPresence.js.
    let is_admin = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(session_cookie)
        .is_some_and(|t| state.sessions.verify(t).is_some());
    let title = head.split_once("<title>").and_then(|(_, r)| r.split_once("</title>")).map(|(t, _)| t).unwrap_or("");
    // Client-side navigation asks for the same page as JSON (see web/src/pageData.ts).
    if headers.contains_key("x-aiyu-data") {
        let body = json!({ "status": status.as_u16(), "title": unescape(title), "shell": shell, "page": page });
        let mut res = axum::Json(body).into_response();
        *res.status_mut() = status;
        res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
        res.headers_mut().append(header::VARY, HeaderValue::from_static("x-aiyu-data"));
        return res;
    }
    let data = json!({
        "logoText": site.config.get("logoText"),
        "gaId": if is_admin { None } else { site.ga_id.clone() },
        "adsenseClientId": site.adsense_client_id,
        "status": status.as_u16(),
        "shell": shell,
        "page": page,
    });
    let html = web
        .template
        .replacen("<!--app-head-->", &head, 1)
        .replacen("<!--app-data-->", &script_json(&data), 1)
        .replacen(r#"<div id="root"></div>"#, &format!(r#"<div id="root">{fallback}</div>"#), 1);
    let mut res = Response::new(Body::from(html));
    *res.status_mut() = status;
    let h = res.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"));
    // Embeds per-request data (admin vs visitor); never cache it.
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    // HTML and JSON share the URL: caches must key on the data header.
    h.append(header::VARY, HeaderValue::from_static("x-aiyu-data"));
    res
}

fn server_error(err: anyhow::Error) -> Response {
    tracing::error!(error = %err, "page data failed");
    (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response()
}

/// Site-wide values: root layout metadata inputs plus shell data.
struct Site {
    base_url: String,
    base_name: String,
    site_title: String,
    description: String,
    keywords: String,
    og_image: String,
    icon: String,
    config: Value,
    ga_id: Option<String>,
    adsense_client_id: Option<String>,
}

impl Site {
    async fn load(state: &AppState) -> Self {
        let base_url = site_url();
        let config = pages::public_config(&state.db, &base_url).await;
        let s = |k: &str| config.get(k).and_then(Value::as_str).filter(|v| !v.is_empty()).map(str::to_string);
        let base_name = s("siteTitle").or_else(|| s("logoText")).unwrap_or_else(|| "Portfolio".into());
        let profession = s("profession");
        let og_image = match config.get("ogImage") {
            Some(Value::String(v)) if !v.trim().is_empty() => pages::absolute(&base_url, v.trim()),
            Some(Value::Object(o)) => o.get("value").and_then(Value::as_str).filter(|v| !v.is_empty()).map(|v| pages::absolute(&base_url, v)).unwrap_or_else(|| format!("{base_url}/og-image.png")),
            _ => format!("{base_url}/og-image.png"),
        };
        let has_favicon = config.get("hasCustomFavicon") == Some(&Value::Bool(true));
        let icon = pages::absolute(&base_url, if has_favicon { "/api/favicon" } else { "/favicon.ico" });
        let ga_id = s("googleAnalyticsId").or_else(|| std::env::var("NEXT_PUBLIC_GA_MEASUREMENT_ID").ok());
        let ads: Option<(Option<bool>, Option<String>)> =
            sqlx::query_as(r#"SELECT (data->>'adsenseEnabled')::boolean, data->>'encryptedClientId' FROM "Ads" LIMIT 1"#)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None);
        let adsense_client_id = ads
            .filter(|(enabled, _)| *enabled == Some(true))
            .and_then(|(_, enc)| enc)
            .and_then(|enc| state.cipher.decrypt(&enc))
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());
        Self {
            site_title: format!("{base_name} | {} Portfolio", profession.as_deref().unwrap_or("Software Engineer")),
            keywords: format!("portfolio, developer, projects, blogs, web development, {}", profession.as_deref().unwrap_or("full stack")),
            description: s("siteDescription").unwrap_or_else(|| "Professional portfolio showcasing projects, blogs, and expertise.".into()),
            base_name,
            base_url,
            og_image,
            icon,
            config,
            ga_id,
            adsense_client_id,
        }
    }

    /// Root layout metadata with only title/description overridden (the games pages).
    fn root_head(&self, title: &str, description: &str) -> String {
        Head::site(self, title, description).render()
    }

    fn not_found_head(&self) -> String {
        format!(r#"<title>404 - Page Not Found</title><meta name="robots" content="noindex, nofollow" /><link rel="icon" href="{}" />"#, escape(&self.icon))
    }
}

/// One page's `<head>`. Starts from the root layout's metadata; pages replace whole groups like Next does.
struct Head {
    title: String,
    description: String,
    keywords: String,
    robots: String,
    googlebot: bool,
    canonical: String,
    og: Vec<(&'static str, String)>,
    /// (title, description, image); the root's site card by default.
    twitter: Option<(String, String, String)>,
    icon: String,
    json_ld: Vec<Value>,
}

impl Head {
    fn site(site: &Site, title: &str, description: &str) -> Self {
        Self {
            title: title.into(),
            description: description.into(),
            keywords: site.keywords.clone(),
            robots: "index, follow".into(),
            googlebot: true,
            canonical: site.base_url.clone(),
            og: vec![
                ("og:title", site.site_title.clone()),
                ("og:description", site.description.clone()),
                ("og:url", site.base_url.clone()),
                ("og:site_name", site.site_title.clone()),
                ("og:locale", "en_US".into()),
                ("og:image", site.og_image.clone()),
                ("og:image:width", "1200".into()),
                ("og:image:height", "630".into()),
                ("og:type", "website".into()),
            ],
            twitter: Some((site.site_title.clone(), site.description.clone(), site.og_image.clone())),
            icon: site.icon.clone(),
            json_ld: vec![],
        }
    }

    fn render(&self) -> String {
        let e = escape;
        let mut h = String::with_capacity(2048);
        h.push_str(&format!("<title>{}</title>", e(&self.title)));
        h.push_str(&format!(r#"<meta name="description" content="{}" />"#, e(&self.description)));
        h.push_str(r#"<link rel="manifest" href="/site.webmanifest" />"#);
        if !self.keywords.is_empty() {
            h.push_str(&format!(r#"<meta name="keywords" content="{}" />"#, e(&self.keywords)));
        }
        h.push_str(&format!(r#"<meta name="robots" content="{}" />"#, e(&self.robots)));
        if self.googlebot {
            h.push_str(r#"<meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />"#);
        }
        h.push_str(&format!(r#"<link rel="canonical" href="{}" />"#, e(&self.canonical)));
        for (p, v) in &self.og {
            h.push_str(&format!(r#"<meta property="{p}" content="{}" />"#, e(v)));
        }
        if let Some((t, d, i)) = &self.twitter {
            h.push_str(r#"<meta name="twitter:card" content="summary_large_image" />"#);
            h.push_str(&format!(r#"<meta name="twitter:title" content="{}" /><meta name="twitter:description" content="{}" /><meta name="twitter:image" content="{}" />"#, e(t), e(d), e(i)));
        }
        for rel in ["shortcut icon", "icon", "apple-touch-icon"] {
            h.push_str(&format!(r#"<link rel="{rel}" href="{}" />"#, e(&self.icon)));
        }
        for ld in &self.json_ld {
            h.push_str(&format!(r#"<script type="application/ld+json">{}</script>"#, script_json(ld)));
        }
        h
    }
}

/// BreadcrumbSchema: Home, the section (labelled from the header nav when present), then `trail`.
fn breadcrumb(site: &Site, shell: &Value, path: &str, name: &str, trail: &[(String, String)]) -> Value {
    let label = shell["header"]["navLinks"]
        .as_array()
        .and_then(|links| links.iter().find(|l| l["href"].as_str().map(|h| h.trim_end_matches('/')) == Some(path)))
        .and_then(|l| l["name"].as_str())
        .unwrap_or(name);
    let base = &site.base_url;
    let mut items = vec![("Home".to_string(), base.clone()), (label.to_string(), format!("{base}{path}"))];
    items.extend(trail.iter().filter(|(n, _)| !n.is_empty()).map(|(n, p)| (n.clone(), format!("{base}{p}"))));
    json!({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": items.iter().enumerate().map(|(i, (n, u))| json!({ "@type": "ListItem", "position": i + 1, "name": n, "item": u })).collect::<Vec<_>>(),
    })
}

/// `getSafeCanonicalUrl`: only same-origin http(s) canonicals are kept.
fn safe_canonical(base: &str, raw: Option<&str>, fallback_path: &str) -> String {
    let fallback = format!("{base}{}", fallback_path.trim_end_matches('/'));
    let Some(raw) = raw.map(str::trim).filter(|r| !r.is_empty()) else { return fallback };
    let abs = if raw.starts_with('/') { format!("{base}{raw}") } else { raw.to_string() };
    match abs.strip_prefix(base) {
        Some(rest) if rest.is_empty() || rest.starts_with('/') => {
            let path = rest.split(['?', '#']).next().unwrap_or("").trim_end_matches('/');
            format!("{base}{path}")
        }
        _ => fallback,
    }
}

/// `new Date(v).toISOString()` for the values blogs carry (ISO strings or "YYYY-MM-DDTHH:MM").
fn iso(v: Option<&Value>) -> Option<String> {
    let s = v?.as_str()?.trim();
    if let Ok(t) = chrono::DateTime::parse_from_rfc3339(s) {
        return Some(t.with_timezone(&chrono::Utc).format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string());
    }
    // JS parses date-times without an offset as local time; the server runs in UTC.
    for fmt in ["%Y-%m-%dT%H:%M:%S%.f", "%Y-%m-%dT%H:%M"] {
        if let Ok(t) = chrono::NaiveDateTime::parse_from_str(s, fmt) {
            return Some(crate::export::js_date(t));
        }
    }
    if let Ok(d) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return d.and_hms_opt(0, 0, 0).map(crate::export::js_date); // ISO date-only is UTC in JS
    }
    // "August 25, 2026" (how blog dates are stored): JS reads it as local midnight.
    use chrono::TimeZone;
    let d = chrono::NaiveDate::parse_from_str(s, "%B %d, %Y").ok()?;
    let local = chrono::Local.from_local_datetime(&d.and_hms_opt(0, 0, 0)?).earliest()?;
    Some(local.with_timezone(&chrono::Utc).format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
}

/// `getSiteUrl()` in src/lib/siteUrl.js.
fn site_url() -> String {
    let raw = std::env::var("SITE_URL").ok().filter(|v| !v.trim().is_empty())
        .or_else(|| std::env::var("NEXT_PUBLIC_BASE_URL").ok().filter(|v| !v.trim().is_empty()))
        .unwrap_or_default();
    let v = raw.trim();
    if v.starts_with("http://") || v.starts_with("https://") { v.trim_end_matches('/').to_string() } else { "https://me.aiyu.co.in".to_string() }
}

/// HTML-escape for text and double-quoted attributes (values are admin-controlled).
pub fn escape(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            '\'' => o.push_str("&#39;"),
            c => o.push(c),
        }
    }
    o
}

fn unescape(s: &str) -> String {
    s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'").replace("&amp;", "&")
}

/// JSON safe inside `<script>`: `<` can never close the tag.
pub fn script_json(v: &Value) -> String {
    serde_json::to_string(v).unwrap_or_else(|_| "{}".into()).replace('<', "\\u003c")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_admin_values() {
        assert_eq!(escape(r#"<b>"x"&'y'</b>"#), "&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;");
        assert!(!script_json(&json!({"t": "</script><script>alert(1)</script>"})).contains("</script>"));
    }

    #[test]
    fn canonical_is_same_origin_only() {
        let b = "https://a.b";
        assert_eq!(safe_canonical(b, None, "/blogs/x"), "https://a.b/blogs/x");
        assert_eq!(safe_canonical(b, Some("https://evil.c/x"), "/blogs/x"), "https://a.b/blogs/x");
        assert_eq!(safe_canonical(b, Some("/blogs/y/"), "/blogs/x"), "https://a.b/blogs/y");
        assert_eq!(safe_canonical(b, Some("https://a.b.evil/x"), "/blogs/x"), "https://a.b/blogs/x");
    }

    #[test]
    fn iso_dates() {
        assert_eq!(iso(Some(&json!("2026-08-24T18:30"))).as_deref(), Some("2026-08-24T18:30:00.000Z"));
        assert_eq!(iso(Some(&json!("2026-09-07T12:22:43.036Z"))).as_deref(), Some("2026-09-07T12:22:43.036Z"));
        assert_eq!(iso(Some(&json!("not a date"))), None);
    }
}
