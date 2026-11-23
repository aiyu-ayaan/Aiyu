//! Pages served by the Vite app (`web/`). Rust sends `web/dist/index.html` with the `<head>` crawlers need
//! (port of the root layout's `generateMetadata` plus the page title/description from `route-meta.json`)
//! and the server-side values the shell needs in `#__DATA__` (GA id, AdSense client, logo).
//! Keep the route list in sync with `web/src/appRoutes.ts`.

use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderValue, StatusCode, header},
    response::Response,
};
use serde_json::Value;
use std::{collections::HashMap, path::Path, sync::Arc};

use crate::{AppState, session::session_cookie};

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
    pub fn load(dir: &Path) -> anyhow::Result<Arc<Self>> {
        let template = std::fs::read_to_string(dir.join("index.html"))?;
        let meta = serde_json::from_str(&std::fs::read_to_string(dir.join("route-meta.json"))?)?;
        Ok(Arc::new(Self { template, meta }))
    }
}

/// `/games` and `/games/{slug}`. Unknown slugs (and hidden cabinets, which are absent from route-meta)
/// get the shell with status 404, like Next's `notFound()`.
pub async fn page(State(state): State<AppState>, req: Request) -> Response {
    let Some(web) = state.web.clone() else {
        return crate::proxy::forward(State(state), req).await;
    };
    let path = req.uri().path().trim_end_matches('/').to_string();
    let path = if path.is_empty() { "/".to_string() } else { path };
    let meta = web.meta.get(&path).cloned();

    let site = SiteHead::load(&state).await;
    let is_admin = req
        .headers()
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(session_cookie)
        .is_some_and(|t| state.sessions.verify(t).is_some()); // isAdminViewer: JWT only, like Node

    let head = match &meta {
        Some(m) => site.head(&m.title, &m.description),
        None => site.not_found_head(),
    };
    let data = serde_json::json!({
        "logoText": site.logo_text,
        "gaId": if is_admin { None } else { site.ga_id.clone() },
        "adsenseClientId": site.adsense_client_id,
    });
    let html = web.template.replacen("<!--app-head-->", &head, 1).replacen("<!--app-data-->", &script_json(&data), 1);

    let mut res = Response::new(Body::from(html));
    *res.status_mut() = if meta.is_some() { StatusCode::OK } else { StatusCode::NOT_FOUND };
    let h = res.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"));
    // The shell embeds per-request data (admin vs visitor); never cache it.
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    res
}

/// Root-layout metadata inputs (src/app/layout.js `generateMetadata`).
#[derive(Default)]
struct SiteHead {
    base_url: String,
    site_title: String,
    description: String,
    keywords: String,
    og_image: String,
    icon: String,
    logo_text: Option<String>,
    ga_id: Option<String>,
    adsense_client_id: Option<String>,
}

impl SiteHead {
    async fn load(state: &AppState) -> Self {
        let base_url = site_url();
        // Only the needed keys: Config.data is large (hundreds of KB).
        let row: Option<(Option<Value>,)> = sqlx::query_as(
            r#"SELECT jsonb_build_object(
                 'siteTitle', data->'siteTitle', 'logoText', data->'logoText', 'profession', data->'profession',
                 'siteDescription', data->'siteDescription', 'ogImage', data->'ogImage', 'favicon', data->'favicon',
                 'googleAnalyticsId', data->'googleAnalyticsId')::json
               FROM "Config" LIMIT 1"#,
        )
        .fetch_optional(&state.db)
        .await
        .unwrap_or_else(|err| {
            tracing::warn!(error = %err, "web: config read failed, using defaults");
            None
        });
        let c = row.and_then(|r| r.0).unwrap_or(Value::Null);
        let s = |k: &str| c.get(k).and_then(Value::as_str).filter(|v| !v.is_empty()).map(str::to_string);

        let base_name = s("siteTitle").or_else(|| s("logoText")).unwrap_or_else(|| "Portfolio".into());
        let profession = s("profession");
        let site_title = format!("{base_name} | {} Portfolio", profession.as_deref().unwrap_or("Software Engineer"));
        let og = match c.get("ogImage") {
            Some(Value::String(v)) if !v.trim().is_empty() => Some(v.trim().to_string()),
            Some(Value::Object(o)) => o.get("value").and_then(Value::as_str).filter(|v| !v.is_empty()).map(str::to_string),
            _ => None,
        };
        let og_image = og.map(|v| absolute(&base_url, &v)).unwrap_or_else(|| format!("{base_url}/og-image.png"));
        let fav = c.get("favicon");
        let has_favicon = ["value", "filename", "mimeType"]
            .iter()
            .any(|k| fav.and_then(|f| f.get(*k)).and_then(Value::as_str).is_some_and(|v| !v.is_empty()));
        let icon = absolute(&base_url, if has_favicon { "/api/favicon" } else { "/favicon.ico" });
        let ga_id = s("googleAnalyticsId").or_else(|| std::env::var("NEXT_PUBLIC_GA_MEASUREMENT_ID").ok());

        let ads: Option<(Option<bool>, Option<String>)> = sqlx::query_as(
            r#"SELECT (data->>'adsenseEnabled')::boolean, data->>'encryptedClientId' FROM "Ads" LIMIT 1"#,
        )
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
            keywords: format!(
                "portfolio, developer, projects, blogs, web development, {}",
                profession.as_deref().unwrap_or("full stack")
            ),
            description: s("siteDescription").unwrap_or_else(|| "Professional portfolio showcasing projects, blogs, and expertise.".into()),
            base_url,
            site_title,
            og_image,
            icon,
            logo_text: s("logoText"),
            ga_id,
            adsense_client_id,
        }
    }

    /// Same tags Next renders: the page's title/description, the site-wide OG/Twitter card, canonical = site root.
    fn head(&self, title: &str, description: &str) -> String {
        let e = escape;
        let mut h = String::with_capacity(2048);
        h.push_str(&format!("<title>{}</title>\n", e(title)));
        h.push_str(&format!(r#"<meta name="description" content="{}" />"#, e(description)));
        h.push_str(r#"<link rel="manifest" href="/site.webmanifest" />"#);
        h.push_str(&format!(r#"<meta name="keywords" content="{}" />"#, e(&self.keywords)));
        h.push_str(r#"<meta name="robots" content="index, follow" />"#);
        h.push_str(r#"<meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />"#);
        h.push_str(&format!(r#"<link rel="canonical" href="{}" />"#, e(&self.base_url)));
        for (p, v) in [
            ("og:title", &self.site_title),
            ("og:description", &self.description),
            ("og:url", &self.base_url),
            ("og:site_name", &self.site_title),
        ] {
            h.push_str(&format!(r#"<meta property="{p}" content="{}" />"#, e(v)));
        }
        h.push_str(r#"<meta property="og:locale" content="en_US" />"#);
        h.push_str(&format!(r#"<meta property="og:image" content="{}" />"#, e(&self.og_image)));
        h.push_str(r#"<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />"#);
        h.push_str(r#"<meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" />"#);
        h.push_str(&format!(r#"<meta name="twitter:title" content="{}" />"#, e(&self.site_title)));
        h.push_str(&format!(r#"<meta name="twitter:description" content="{}" />"#, e(&self.description)));
        h.push_str(&format!(r#"<meta name="twitter:image" content="{}" />"#, e(&self.og_image)));
        for rel in ["shortcut icon", "icon", "apple-touch-icon"] {
            h.push_str(&format!(r#"<link rel="{rel}" href="{}" />"#, e(&self.icon)));
        }
        h
    }

    fn not_found_head(&self) -> String {
        format!(
            r#"<title>404 - Page Not Found</title><meta name="robots" content="noindex, nofollow" /><link rel="icon" href="{}" />"#,
            escape(&self.icon)
        )
    }
}

/// `getSiteUrl()` in src/lib/siteUrl.js.
fn site_url() -> String {
    let raw = std::env::var("SITE_URL").ok().filter(|v| !v.trim().is_empty())
        .or_else(|| std::env::var("NEXT_PUBLIC_BASE_URL").ok().filter(|v| !v.trim().is_empty()))
        .unwrap_or_default();
    let v = raw.trim();
    if v.starts_with("http://") || v.starts_with("https://") {
        v.trim_end_matches('/').to_string()
    } else {
        "https://me.aiyu.co.in".to_string()
    }
}

fn absolute(base: &str, v: &str) -> String {
    if v.starts_with("http://") || v.starts_with("https://") {
        v.to_string()
    } else {
        format!("{base}/{}", v.trim_start_matches('/'))
    }
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

/// JSON safe inside `<script type="application/json">`: `<` can never close the tag.
pub fn script_json(v: &Value) -> String {
    serde_json::to_string(v).unwrap_or_else(|_| "{}".into()).replace('<', "\\u003c")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_admin_values() {
        assert_eq!(escape(r#"<b>"x"&'y'</b>"#), "&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;");
        let v = serde_json::json!({"logoText": "</script><script>alert(1)</script>"});
        assert!(!script_json(&v).contains("</script>"));
    }

    #[test]
    fn absolute_urls() {
        assert_eq!(absolute("https://a.b", "/api/uploads/x.webp"), "https://a.b/api/uploads/x.webp");
        assert_eq!(absolute("https://a.b", "https://cdn/x"), "https://cdn/x");
    }
}
