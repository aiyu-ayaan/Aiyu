//! Paths no page or API handler owns: the old-address redirects (`next.config.mjs` `redirects()`, src/proxy.js)
//! and the files under `public/` with the uploads.

use axum::{
    Router,
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use tower::ServiceExt;
use tower_http::services::ServeDir;

use crate::{AppState, compat};

/// `redirects()` in next.config.mjs: old first segment, new one, and whether paths below it move too.
const MOVED: &[(&str, &str, bool)] = &[
    ("/blog", "/blogs", true),
    ("/about", "/about-me", false),
    ("/contact", "/contact-us", false),
    ("/app", "/apps", true),
    ("/project", "/projects", true),
    ("/deployments", "/apps", true),
    ("/live-deployments", "/apps", true),
];

/// A path that can only name this site: `//host` and `/\host` would send a browser elsewhere.
fn local(path: &str) -> String {
    format!("/{}", path.trim_start_matches(['/', '\\']))
}

/// `path` below `prefix` ("" for the prefix itself), or None.
fn below<'a>(path: &'a str, prefix: &str) -> Option<&'a str> {
    path.strip_prefix(prefix).filter(|rest| rest.is_empty() || rest.starts_with('/'))
}

/// Pages that only existed in the removed classic site.
fn removed_page(path: &str) -> Option<&'static str> {
    match path {
        "/live-deployments" => Some("/apps"),
        "/work-in-progress" => Some("/"),
        p if p.starts_with("/gallery/") => Some("/gallery"),
        _ => None,
    }
}

/// Where an old address moved to, with the status Next answered.
pub fn moved(method: &Method, path: &str, query: Option<&str>) -> Option<(StatusCode, String)> {
    let to = |status, target: String| {
        let target = local(&target);
        let target = match query {
            Some(q) => format!("{target}?{q}"),
            None => target,
        };
        Some((status, target))
    };
    // `trailingSlash: false`.
    if path.len() > 1 && path.ends_with('/') {
        return to(StatusCode::PERMANENT_REDIRECT, path.trim_end_matches('/').to_string());
    }
    for &(from, new, nested) in MOVED {
        if let Some(rest) = below(path, from).filter(|rest| nested || rest.is_empty()) {
            return to(StatusCode::PERMANENT_REDIRECT, format!("{new}{rest}"));
        }
    }
    if !matches!(*method, Method::GET | Method::HEAD) || below(path, "/api").is_some() {
        return None;
    }
    let (status, inner) = match (below(path, "/v1"), below(path, "/v2")) {
        (Some(rest), _) => (StatusCode::MOVED_PERMANENTLY, Some(rest)),
        (_, Some(rest)) => (StatusCode::PERMANENT_REDIRECT, Some(rest)),
        _ => (StatusCode::MOVED_PERMANENTLY, None),
    };
    let page = inner.map_or(path, |rest| if rest.is_empty() { "/" } else { rest });
    match removed_page(page) {
        Some(target) => to(status, target.to_string()),
        None if inner.is_some() => to(status, page.to_string()),
        None => None,
    }
}

/// Layer on the whole router: old addresses redirect before any route sees them.
pub async fn redirects(req: Request, next: Next) -> Response {
    let path = req.uri().path();
    // Next answered the markdown variant of a public page before looking at removed pages.
    let markdown = compat::accepts_markdown(req.headers()) && path.starts_with("/gallery/") && !path.ends_with('/');
    let Some((status, target)) = moved(req.method(), path, req.uri().query()).filter(|_| !markdown) else {
        return next.run(req).await;
    };
    let Ok(location) = HeaderValue::from_str(&target) else { return next.run(req).await };
    let mut res = (status, [(header::LOCATION, location)]).into_response();
    if compat::is_public_html(path) {
        compat::security_headers(res.headers_mut());
    }
    res
}

fn cache(value: &'static str) -> HeaderValue {
    HeaderValue::from_static(value)
}

/// next.config.mjs: `/uploads/*` and `/images/*` are cached for a day.
fn media_cache() -> HeaderValue {
    cache(if *compat::PRODUCTION { "public, max-age=86400, stale-while-revalidate=43200" } else { "no-store" })
}

/// `/uploads/*`, read from the uploads folder (a volume in Docker).
pub fn uploads(state: &AppState) -> Router<AppState> {
    Router::new()
        .nest_service("/uploads", ServeDir::new(&state.config.uploads_dir).append_index_html_on_directories(false))
        .layer(axum::middleware::map_response(|mut res: Response| async move {
            if res.status().is_success() || res.status() == StatusCode::NOT_MODIFIED {
                res.headers_mut().insert(header::CACHE_CONTROL, media_cache());
            }
            res.headers_mut().insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
            res
        }))
}

/// A GET or HEAD for a file under `public/`; None when there is no such file.
pub async fn public_file(state: &AppState, method: &Method, uri: &axum::http::Uri, headers: &HeaderMap) -> Option<Response> {
    if !matches!(*method, Method::GET | Method::HEAD) {
        return None;
    }
    let mut req = Request::new(Body::empty());
    *req.method_mut() = method.clone();
    *req.uri_mut() = uri.clone();
    *req.headers_mut() = headers.clone();
    let res = ServeDir::new(&state.config.public_dir).append_index_html_on_directories(false).oneshot(req).await.ok()?;
    if !(res.status().is_success() || res.status() == StatusCode::NOT_MODIFIED || res.status() == StatusCode::RANGE_NOT_SATISFIABLE) {
        return None;
    }
    let mut res = res.map(Body::new);
    // Next's default for `public/` files; the images folder had its own rule.
    let value = if uri.path().starts_with("/images/") { media_cache() } else { cache("public, max-age=0") };
    res.headers_mut().insert(header::CACHE_CONTROL, value);
    Some(res)
}

/// Whatever no route claimed: a public file, else the page Next would have answered.
pub async fn fallback(State(state): State<AppState>, req: Request) -> Response {
    if let Some(res) = public_file(&state, req.method(), req.uri(), req.headers()).await {
        return res;
    }
    // src/proxy.js: the canonical host and the markdown variant also apply to paths below the public pages.
    let path = req.uri().path();
    if path != "/api" && !path.starts_with("/api/") {
        if let Some(redirect) = compat::canonical_redirect_for(req.method(), req.headers(), req.uri()) {
            return redirect;
        }
        if let Some(markdown) = compat::accepts_markdown(req.headers()).then(|| compat::markdown_response(path)).flatten() {
            return markdown;
        }
    }
    crate::proxy::forward(State(state), req).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get(path: &str) -> Option<(u16, String)> {
        moved(&Method::GET, path, None).map(|(s, to)| (s.as_u16(), to))
    }

    #[test]
    fn old_addresses_move_like_next() {
        for (from, status, to) in [
            ("/blog", 308, "/blogs"),
            ("/blog/a-post", 308, "/blogs/a-post"),
            ("/about", 308, "/about-me"),
            ("/contact", 308, "/contact-us"),
            ("/app/x", 308, "/apps/x"),
            ("/project", 308, "/projects"),
            ("/deployments/x", 308, "/apps/x"),
            ("/live-deployments/x", 308, "/apps/x"),
            ("/v1", 301, "/"),
            ("/v1/projects", 301, "/projects"),
            ("/v1/gallery/abc", 301, "/gallery"),
            ("/v2", 308, "/"),
            ("/v2/apps/x", 308, "/apps/x"),
            ("/v2/live-deployments", 308, "/apps"),
            ("/gallery/abc", 301, "/gallery"),
            ("/work-in-progress", 301, "/"),
            ("/projects/", 308, "/projects"),
        ] {
            assert_eq!(get(from), Some((status, to.to_string())), "{from}");
        }
        for stays in ["/", "/blogs", "/about-me", "/about/team", "/contact/x", "/apps", "/v10", "/gallery", "/api/v1/x", "/my-app"] {
            assert_eq!(get(stays), None, "{stays}");
        }
    }

    #[test]
    fn query_and_method_follow_next() {
        assert_eq!(moved(&Method::GET, "/v1/blogs", Some("a=1")).unwrap().1, "/blogs?a=1");
        assert_eq!(moved(&Method::POST, "/blog", None).unwrap().0, StatusCode::PERMANENT_REDIRECT);
        assert_eq!(moved(&Method::POST, "/v1/blogs", None), None);
    }

    #[test]
    fn redirects_never_leave_the_site() {
        for path in ["/v1//evil.example", "/v2//evil.example", r"/v1/\evil.example", "//evil.example/", r"/\evil.example/"] {
            let (_, to) = get(path).unwrap();
            assert!(to.starts_with('/') && !to.starts_with("//") && !to.starts_with("/\\"), "{path} -> {to}");
        }
    }
}
