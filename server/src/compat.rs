//! What Next adds around public pages (`next.config.mjs` `headers()` and `src/proxy.js`), for the pages Rust serves:
//! the canonical-host redirect, the `Accept: text/markdown` variant, security headers and the CDN cache policy.
//! Pages still served by Next get all of this from Next.

use axum::{
    body::Body,
    extract::Request,
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Redirect, Response},
};
use std::sync::LazyLock;

/// `isProduction` in next.config.mjs.
pub static PRODUCTION: LazyLock<bool> = LazyLock::new(|| std::env::var("NODE_ENV").as_deref() == Ok("production"));

/// Public HTML: browsers revalidate, the CDN may cache 5 min and serve stale for a day (see next.config.mjs).
pub fn public_html_cache() -> HeaderValue {
    HeaderValue::from_static(if *PRODUCTION { "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" } else { "no-store" })
}

/// Same policy as next.config.mjs (keep both in sync); connect-src includes the GA4 collect hosts.
const CSP: &str = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://*.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.githubusercontent.com https://api.github.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com; frame-src 'self' https://pagead2.googlesyndication.com; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

const SECURED_PREFIXES: &[&str] = &["/about-me", "/apps", "/blogs", "/contact-us", "/gallery", "/github", "/projects"];

/// Paths next.config.mjs gives the security headers and the public HTML cache policy.
pub fn is_public_html(path: &str) -> bool {
    path == "/" || SECURED_PREFIXES.iter().any(|p| path == *p || path.strip_prefix(p).is_some_and(|r| r.starts_with('/')))
}

const AGENT_LINKS: &str = r#"</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </.well-known/openapi.json>; rel="service-desc"; type="application/openapi+json", </docs/api>; rel="service-doc"; type="text/markdown", </.well-known/oauth-protected-resource>; rel="describedby"; type="application/json", </.well-known/agent-skills/index.json>; rel="describedby"; type="application/json", </.well-known/mcp/server-card.json>; rel="describedby"; type="application/json""#;

/// `markdownPages` in src/proxy.js: (path, title, description, sections).
const MARKDOWN: &[(&str, &str, &str, &[(&str, &[&str])])] = &[
    ("/", "Aiyu Portfolio", "Aiyu is a developer portfolio for projects, writing, live deployments, gallery entries, and contact workflows.", &[
        ("Agent Discovery", &[
            "API catalog: /.well-known/api-catalog",
            "OpenAPI description: /.well-known/openapi.json",
            "API documentation: /docs/api",
            "Health status: /api/health",
            "OAuth protected resource metadata: /.well-known/oauth-protected-resource",
            "Agent skills index: /.well-known/agent-skills/index.json",
            "MCP server card: /.well-known/mcp/server-card.json",
        ]),
        ("Public Resources", &["Projects: /projects", "Blogs: /blogs", "Apps: /apps", "Gallery: /gallery", "GitHub stats: /github", "Contact: /contact-us"]),
    ]),
    ("/about-me", "About Aiyu", "Profile, professional summary, experience, and technical skills.", &[("Related APIs", &["About API: /api/about", "Homepage API: /api/home"])]),
    ("/apps", "Aiyu Apps", "Application and deployment highlights from the portfolio.", &[("Related APIs", &["Deployments API: /api/deployments"])]),
    ("/blogs", "Aiyu Blogs", "Published writing and technical notes.", &[("Related APIs", &["Blogs API: /api/blogs"])]),
    ("/contact-us", "Contact Aiyu", "Contact workflow for sending a message.", &[("Related APIs", &["Submit contact message: POST /api/contact/message"])]),
    ("/gallery", "Aiyu Gallery", "Gallery entries and visual work.", &[("Related APIs", &["Gallery API: /api/gallery"])]),
    ("/github", "Aiyu GitHub", "GitHub profile and repository statistics.", &[("Related APIs", &["GitHub stats API: /api/github/stats"])]),
    ("/projects", "Aiyu Projects", "Portfolio projects, technology stacks, and project details.", &[("Related APIs", &["Projects API: /api/projects"])]),
];

/// `getMarkdownPage`: exact path, else the longest prefix (never `/`).
pub fn markdown_page(path: &str) -> Option<String> {
    let page = MARKDOWN.iter().find(|(p, ..)| *p == path).or_else(|| {
        MARKDOWN
            .iter()
            .filter(|(p, ..)| *p != "/" && path.strip_prefix(p).is_some_and(|r| r.starts_with('/')))
            .max_by_key(|(p, ..)| p.len())
    })?;
    let (_, title, description, sections) = page;
    let sections: Vec<String> = sections
        .iter()
        .map(|(h, items)| format!("## {h}\n\n{}", items.iter().map(|i| format!("- {i}")).collect::<Vec<_>>().join("\n")))
        .collect();
    Some(format!("# {title}\n\n{description}\n\nCanonical path: {path}\n\n{}\n", sections.join("\n\n")))
}

fn accepts_markdown(headers: &HeaderMap) -> bool {
    headers
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|a| a.split(',').any(|e| e.split(';').next().unwrap_or("").trim().eq_ignore_ascii_case("text/markdown")))
}

/// `getCanonicalHostRedirect`: GET/HEAD on a non-local host other than SITE_URL's goes there (308).
fn canonical_redirect(req: &Request) -> Option<Response> {
    canonical_redirect_for(req.method(), req.headers(), req.uri())
}

pub fn canonical_redirect_for(method: &Method, h: &HeaderMap, uri: &axum::http::Uri) -> Option<Response> {
    if !matches!(*method, Method::GET | Method::HEAD) || std::env::var("CANONICAL_HOST_REDIRECT").as_deref() == Ok("false") {
        return None;
    }
    let site = std::env::var("SITE_URL").ok().filter(|v| !v.is_empty()).or_else(|| std::env::var("NEXT_PUBLIC_BASE_URL").ok())?;
    let canonical = reqwest::Url::parse(&site).ok().filter(|u| matches!(u.scheme(), "http" | "https"))?;
    let raw = h.get("x-forwarded-host").or_else(|| h.get(header::HOST)).and_then(|v| v.to_str().ok()).unwrap_or("");
    let host = raw.split(',').next().unwrap_or("").trim().split(':').next().unwrap_or("").to_ascii_lowercase();
    if host.is_empty() || is_local(&host) || Some(host.as_str()) == canonical.host_str() {
        return None;
    }
    let pq = uri.path_and_query().map(|p| p.as_str()).unwrap_or("/");
    Some(Redirect::permanent(&format!("{}{pq}", canonical.origin().ascii_serialization())).into_response())
}

fn is_local(h: &str) -> bool {
    let private_172 = h.strip_prefix("172.").and_then(|r| r.split('.').next()?.parse::<u8>().ok()).is_some_and(|n| (16..=31).contains(&n));
    matches!(h, "localhost" | "127.0.0.1" | "0.0.0.0" | "::1") || h.ends_with(".local") || h.starts_with("10.") || h.starts_with("192.168.") || private_172
}

/// Layer on the Vite page routes.
pub async fn public_page(req: Request, next: Next) -> Response {
    if let Some(r) = canonical_redirect(&req) {
        return r;
    }
    let path = req.uri().path().to_string();
    if accepts_markdown(req.headers()) {
        if let Some(md) = markdown_page(&path) {
            let tokens = md.split_whitespace().count().to_string();
            let mut res = Response::new(Body::from(md));
            let h = res.headers_mut();
            h.insert(header::CONTENT_TYPE, HeaderValue::from_static("text/markdown; charset=utf-8"));
            h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
            h.insert(header::LINK, HeaderValue::from_static(AGENT_LINKS));
            h.insert(header::VARY, HeaderValue::from_static("Accept"));
            h.insert("x-markdown-tokens", HeaderValue::from_str(&tokens).unwrap_or(HeaderValue::from_static("0")));
            return res;
        }
    }
    let mut res = next.run(req).await;
    if is_public_html(&path) && res.status() != StatusCode::PERMANENT_REDIRECT {
        let h = res.headers_mut();
        h.insert(header::CONTENT_SECURITY_POLICY, HeaderValue::from_static(CSP));
        h.insert(header::STRICT_TRANSPORT_SECURITY, HeaderValue::from_static("max-age=63072000; includeSubDomains; preload"));
        h.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
        h.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("SAMEORIGIN"));
        h.insert(header::REFERRER_POLICY, HeaderValue::from_static("strict-origin-when-cross-origin"));
        if path == "/" {
            h.insert(header::LINK, HeaderValue::from_static(AGENT_LINKS));
        }
    }
    res
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn markdown_matches_proxy_js() {
        assert_eq!(
            markdown_page("/blogs/x").unwrap(),
            "# Aiyu Blogs\n\nPublished writing and technical notes.\n\nCanonical path: /blogs/x\n\n## Related APIs\n\n- Blogs API: /api/blogs\n"
        );
        assert!(markdown_page("/games").is_none());
        assert!(markdown_page("/blogsx").is_none());
    }

    #[test]
    fn public_html_paths() {
        assert!(is_public_html("/") && is_public_html("/blogs") && is_public_html("/projects/x"));
        assert!(!is_public_html("/games") && !is_public_html("/blogsx") && !is_public_html("/ai"));
        assert!(is_local("172.20.0.1") && !is_local("172.40.0.1") && is_local("localhost"));
    }
}
