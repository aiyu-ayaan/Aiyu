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

use axum::http::request::Parts;

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
    /// DEFAULT_AI_PAGE from src/lib/aiPageDefaults.js (written by the Vite build).
    pub ai_defaults: Value,
    /// `{ presets, legacy }` from src/lib/themePresets.js (written by the Vite build).
    pub themes: Value,
    /// The /.well-known documents and MCP card defaults (written by the Vite build), with this site's URL.
    pub discovery: Value,
    /// `/admin/...` page patterns (`[id]` segments match anything), one per src/app/_admin page.
    admin_routes: Vec<String>,
}

impl WebApp {
    pub fn load(dir: &std::path::Path) -> anyhow::Result<Arc<Self>> {
        let template = std::fs::read_to_string(dir.join("index.html"))?;
        let meta = serde_json::from_str(&std::fs::read_to_string(dir.join("route-meta.json"))?)?;
        let ai_defaults = serde_json::from_str(&std::fs::read_to_string(dir.join("ai-defaults.json"))?)?;
        let admin_routes = serde_json::from_str(&std::fs::read_to_string(dir.join("admin-routes.json"))?)?;
        let themes = serde_json::from_str(&std::fs::read_to_string(dir.join("themes.json"))?)?;
        // The build writes a placeholder origin; the site URL is only known at runtime.
        let discovery = std::fs::read_to_string(dir.join("discovery.json"))?.replace("https://aiyu-site.invalid", &site_url());
        let discovery = serde_json::from_str(&discovery)?;
        Ok(Arc::new(Self { template, meta, ai_defaults, themes, discovery, admin_routes }))
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
    render(&web, &state, req.uri().path(), req.headers(), &site, status, head, json!(null), json!(null), String::new())
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
    render(&web, &state, req.uri().path(), req.headers(), &site, StatusCode::OK, head.render(), shell, page, fallback)
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
            return render(&web, &state, req.uri().path(), req.headers(), &site, StatusCode::NOT_FOUND, head, json!(null), json!(null), String::new());
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
    head.googlebot = None;
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
    render(&web, &state, req.uri().path(), req.headers(), &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// One public section page (`/about-me`, `/apps`, ...): metadata merged with the admin social overrides, breadcrumb.
pub struct Section {
    pub path: &'static str,
    /// Breadcrumb label when the header nav has no link for `path`.
    pub crumb: &'static str,
    /// `${baseName} | <title>`
    pub title: &'static str,
    pub description: &'static str,
}

/// Render a section page. `page` is the data the Vite route reads; `fallback` is the crawler HTML.
async fn section(web: &WebApp, state: &AppState, req: &Parts, site: Site, sec: &Section, page: Value, fallback: String) -> Response {
    let social = pages::social_meta(&state.db).await;
    let shell = pages::shell_data(state, &site.config).await;
    let mut head = section_head(&site, &social, sec.path, &format!("{} | {}", site.base_name, sec.title), sec.description, sec.path);
    head.json_ld.push(breadcrumb(&site, &shell, sec.path, sec.crumb, &[]));
    render(web, state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// A page's `generateMetadata` after `applySocialOverrides(base, social, key, { baseUrl, fallbackImage: config.ogImage })`:
/// the page's OpenGraph replaces the root's whole group (no site_name/locale); the image is optional.
fn section_head(site: &Site, social: &Value, key: &str, title: &str, description: &str, path: &str) -> Head {
    let pick = |v: &Value| v.as_str().map(str::trim).filter(|v| !v.is_empty()).map(str::to_string);
    let entry = &social["pages"][key];
    let title = pick(&entry["title"]).unwrap_or_else(|| title.to_string());
    let description = pick(&entry["description"]).unwrap_or_else(|| description.to_string());
    let image = pick(&entry["image"])
        .or_else(|| pick(&social["defaultImage"]))
        .or_else(|| pick(&site.config["ogImage"]))
        .map(|i| pages::absolute(&site.base_url, &i))
        .unwrap_or_default();
    let url = format!("{}{path}", site.base_url);
    let mut head = Head::site(site, &title, &description);
    head.canonical = url.clone();
    head.og = vec![("og:title", title.clone()), ("og:description", description.clone()), ("og:url", url), ("og:type", "website".into())];
    if !image.is_empty() {
        head.og.extend([("og:image", image.clone()), ("og:image:width", "1200".into()), ("og:image:height", "630".into())]);
    }
    head.twitter = Some((title, description, image));
    head
}

macro_rules! web_or_next {
    ($state:expr, $req:expr) => {
        match $state.web.clone() {
            Some(w) => w,
            None => return crate::proxy::forward(State($state), $req).await,
        }
    };
}

/// `/about-me`: port of src/app/(site)/about-me/page.js.
pub async fn about_me(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let about = pages::singleton(&state.db, "About", false).await;
    let s = |k: &str| about.get(k).and_then(Value::as_str).unwrap_or_default();
    let fallback = format!("<main><h1>{}</h1><p>{}</p></main>", escape(s("name")), escape(s("professionalSummary")));
    let sec = Section { path: "/about-me", crumb: "About Me", title: "About Me", description: "Learn more about my background, skills, and experience." };
    section(&web, &state, &req, Site::load(&state).await, &sec, json!({ "about": about }), fallback).await
}

/// Crawler HTML for a list page: heading plus one link per item.
fn link_list(heading: &str, items: &[Value], name_key: &str, base: &str) -> String {
    let mut h = format!("<main><h1>{}</h1><ul>", escape(heading));
    for it in items {
        let name = it[name_key].as_str().unwrap_or_default();
        let slug = it["slug"].as_str().filter(|s| !s.is_empty()).or(it["_id"].as_str()).unwrap_or_default();
        h.push_str(&format!(r#"<li><a href="{base}/{}">{}</a></li>"#, escape(slug), escape(name)));
    }
    h.push_str("</ul></main>");
    h
}

/// `/apps`: port of src/app/(site)/apps/page.js.
pub async fn apps(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let deployments = match pages::deployments(&state.db).await {
        Ok(d) => d,
        Err(err) => return server_error(err),
    };
    let fallback = link_list("Apps", &deployments, "name", "/apps");
    let sec = Section { path: "/apps", crumb: "Apps", title: "Apps", description: "Hosted apps and services as a live process table — V2 edition." };
    section(&web, &state, &req, Site::load(&state).await, &sec, json!({ "deployments": deployments }), fallback).await
}

/// `/projects`: port of src/app/(site)/projects/page.js.
pub async fn projects(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let projects = match pages::projects(&state.db, true).await {
        Ok(p) => p,
        Err(err) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let fallback = link_list("Open Source & Community", &projects, "name", "/projects");
    let sec = Section {
        path: "/projects",
        crumb: "Open Source",
        title: "Open Source & Community",
        description: "Open source libraries, apps and experiments — built and maintained in the open.",
    };
    let page = json!({ "projects": projects, "config": site.config });
    section(&web, &state, &req, site, &sec, page, fallback).await
}

/// `/gallery`: port of src/app/(site)/gallery/page.js.
pub async fn gallery(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let images = match pages::client_rows(&state.db, "Gallery", r#"ORDER BY "isPinned" DESC, "order" ASC, "createdAt" DESC"#).await {
        Ok(i) => i,
        Err(err) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let mut fallback = String::from("<main><h1>Gallery</h1>");
    for i in &images {
        fallback.push_str(&format!(r#"<img src="{}" alt="{}" loading="lazy" />"#, escape(i["thumbnail"].as_str().or(i["src"].as_str()).unwrap_or_default()), escape(i["description"].as_str().unwrap_or_default())));
    }
    fallback.push_str("</main>");
    let sec = Section { path: "/gallery", crumb: "Gallery", title: "Gallery", description: "A pure photo wall — the visual archive with nothing but the frames. V2 edition." };
    let page = json!({ "images": images, "config": site.config });
    section(&web, &state, &req, site, &sec, page, fallback).await
}

/// `/github`: port of src/app/(site)/github/page.js (the stats load in the browser).
pub async fn github(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let sec = Section { path: "/github", crumb: "GitHub", title: "GitHub", description: "Open source contributions, repositories, and GitHub statistics — V2 edition." };
    section(&web, &state, &req, Site::load(&state).await, &sec, json!({}), "<main><h1>GitHub</h1></main>".into()).await
}

/// `/contact-us`: port of src/app/(site)/contact-us/page.js.
pub async fn contact(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let site = Site::load(&state).await;
    let c = &site.config;
    let s = |k: &str| c.get(k).and_then(Value::as_str).filter(|v| !v.is_empty()).map(str::to_string);
    // public_config already turned an uploaded resume into "/api/resume", like the page's `type === 'file'` branch.
    let resume = c["resume"]["value"].as_str().filter(|v| !v.is_empty());
    let page = json!({
        "location": s("contactLocation").unwrap_or_else(|| "Remote / Worldwide".into()),
        "status": s("contactStatus").unwrap_or_else(|| "Open to opportunities".into()),
        "email": c.get("contactEmail"),
        "hasResume": resume.is_some(),
        "resumeHref": resume.unwrap_or("#"),
    });
    let fallback = format!("<main><h1>Contact</h1><p>{}</p></main>", escape(page["status"].as_str().unwrap_or_default()));
    let sec = Section { path: "/contact-us", crumb: "Contact", title: "Contact", description: "Let's collaborate on something amazing." };
    section(&web, &state, &req, site, &sec, page, fallback).await
}

/// Head of the project/app detail pages: their own OpenGraph (no social overrides), raw image fallback chain.
fn detail_head(site: &Site, row: &Value, canonical: &str, og_type: &str) -> Head {
    let name = row["name"].as_str().unwrap_or_default().to_string();
    let description: String = row["description"].as_str().filter(|d| !d.is_empty()).unwrap_or("").chars().take(160).collect();
    let pick = |v: &Value| v.as_str().map(str::trim).filter(|v| !v.is_empty()).map(str::to_string);
    let image = pick(&row["image"]).or_else(|| pick(&site.config["ogImage"])).unwrap_or_else(|| format!("{}/og-image.png", site.base_url));
    let mut head = Head::site(site, &format!("{} | {name}", site.base_name), &description);
    head.googlebot = Some(GOOGLEBOT_DETAIL);
    head.canonical = canonical.to_string();
    head.og = vec![
        ("og:title", name.clone()),
        ("og:description", description.clone()),
        ("og:url", canonical.to_string()),
        ("og:type", og_type.into()),
        ("og:image", image.clone()),
        ("og:image:width", "1200".into()),
        ("og:image:height", "630".into()),
    ];
    head.twitter = Some((name, description, image));
    head
}

fn is_http_url(v: &Value) -> bool {
    v.as_str().and_then(|s| reqwest::Url::parse(s).ok()).is_some_and(|u| matches!(u.scheme(), "http" | "https"))
}

async fn not_found_page(web: &WebApp, state: &AppState, req: &Parts) -> Response {
    let site = Site::load(state).await;
    render(web, state, req.uri.path(), &req.headers, &site, StatusCode::NOT_FOUND, site.not_found_head(), json!(null), json!(null), String::new())
}

/// `/projects/{id}`: port of src/app/(site)/projects/[id]/page.js.
pub async fn project_detail(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let project = match pages::entity_by_identifier(&state.db, "Project", "project", "/projects", &id).await {
        Ok(pages::Lookup::Found(p)) => p,
        Ok(pages::Lookup::Redirect(to)) => return Redirect::permanent(&to).into_response(),
        Ok(pages::Lookup::NotFound) => return not_found_page(&web, &state, &req).await,
        Err(err) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let slug = pages::entity_slug(&project, "project");
    let base = site.base_url.clone();
    let canonical = format!("{base}/projects/{slug}");
    let pid = project["_id"].as_str().unwrap_or_default().to_string();
    let related_apps = match pages::app_links_for_project(&state.db, &pid).await {
        Ok(a) => a,
        Err(err) => return server_error(err),
    };
    // getLegalLinksForDeployments: every app's legal links, de-duplicated by href.
    let mut legal: Vec<Value> = vec![];
    for app in &related_apps {
        if let Some(links) = pages::legal_links_for_deployment(&state.db, app["id"].as_str().unwrap_or_default()).await["links"].as_array() {
            for l in links {
                if !legal.iter().any(|x| x["href"] == l["href"]) {
                    legal.push(l.clone());
                }
            }
        }
    }

    let mut head = detail_head(&site, &project, &canonical, "article");
    let stack: Vec<Value> = project["techStack"].as_array().cloned().unwrap_or_default();
    let repo = &project["repoData"];
    let mut ld = serde_json::Map::new();
    ld.insert("@context".into(), "https://schema.org".into());
    ld.insert("@type".into(), "SoftwareSourceCode".into());
    ld.insert("name".into(), project["name"].clone());
    if project["description"].as_str().is_some_and(|d| !d.is_empty()) {
        ld.insert("description".into(), project["description"].clone());
    }
    ld.insert("url".into(), canonical.clone().into());
    if project["image"].as_str().is_some_and(|i| !i.is_empty()) {
        ld.insert("image".into(), project["image"].clone());
    }
    let lang = repo["language"].as_str().filter(|l| !l.is_empty());
    if !stack.is_empty() || lang.is_some() {
        let mut langs: Vec<Value> = vec![];
        for v in lang.map(Value::from).into_iter().chain(stack.iter().cloned()) {
            if v.as_str().is_some_and(|s| !s.is_empty()) && !langs.contains(&v) {
                langs.push(v);
            }
        }
        ld.insert("programmingLanguage".into(), langs.into());
    }
    for (k, from) in [("license", "license"), ("dateModified", "pushedAt"), ("dateCreated", "createdAt")] {
        if repo[from].as_str().is_some_and(|v| !v.is_empty()) {
            ld.insert(k.into(), repo[from].clone());
        }
    }
    if repo["stars"].as_f64().is_some_and(|n| n > 0.0) {
        ld.insert("interactionStatistic".into(), json!({ "@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction", "userInteractionCount": repo["stars"] }));
    }
    if is_http_url(&project["codeLink"]) {
        ld.insert("codeRepository".into(), project["codeLink"].clone());
    }
    if !related_apps.is_empty() {
        let products: Vec<Value> = related_apps.iter().map(|a| json!({ "@type": "SoftwareApplication", "name": a["name"], "url": format!("{base}{}", a["href"].as_str().unwrap_or_default()) })).collect();
        ld.insert("targetProduct".into(), products.into());
    }
    ld.insert("author".into(), json!({ "@type": "Person", "name": std::env::var("NEXT_PUBLIC_AUTHOR_NAME").unwrap_or_else(|_| "Portfolio Owner".into()) }));
    ld.insert("mainEntityOfPage".into(), json!({ "@type": "WebPage", "@id": canonical }));
    head.json_ld.push(Value::Object(ld));
    let name = project["name"].as_str().unwrap_or_default().to_string();
    head.json_ld.push(breadcrumb(&site, &shell, "/projects", "Open Source", &[(name.clone(), format!("/projects/{slug}"))]));

    let fallback = format!("<main><article><h1>{}</h1><p>{}</p></article></main>", escape(&name), escape(project["description"].as_str().unwrap_or_default()));
    let page = json!({ "project": project, "relatedApps": related_apps, "legal": legal });
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/apps/{id}`: port of src/app/(site)/apps/[id]/page.js.
pub async fn app_detail(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let app = match pages::entity_by_identifier(&state.db, "Deployment", "app", "/apps", &id).await {
        Ok(pages::Lookup::Found(a)) => a,
        Ok(pages::Lookup::Redirect(to)) => return Redirect::permanent(&to).into_response(),
        Ok(pages::Lookup::NotFound) => return not_found_page(&web, &state, &req).await,
        Err(err) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let slug = pages::entity_slug(&app, "app");
    let base = site.base_url.clone();
    let app_url = format!("{base}/apps/{slug}");
    let aid = app["_id"].as_str().unwrap_or_default().to_string();
    let project_link = pages::project_link_for_deployment(&state.db, app["projectId"].as_str()).await;
    let legal = pages::legal_links_for_deployment(&state.db, &aid).await;
    let product = pages::product_path(&state.db, &aid).await;
    // A linked product page (/<slug>) is the canonical home of the product.
    let canonical = product.as_ref().map(|p| format!("{base}{p}")).unwrap_or_else(|| app_url.clone());

    let mut head = detail_head(&site, &app, &canonical, "website");
    let mut ld = serde_json::Map::new();
    ld.insert("@context".into(), "https://schema.org".into());
    ld.insert("@type".into(), "SoftwareApplication".into());
    ld.insert("name".into(), app["name"].clone());
    if app["description"].as_str().is_some_and(|d| !d.is_empty()) {
        ld.insert("description".into(), app["description"].clone());
    }
    let url = match &product {
        Some(p) => format!("{base}{p}"),
        None if is_http_url(&app["hostedUrl"]) => app["hostedUrl"].as_str().unwrap_or_default().to_string(),
        None => app_url.clone(),
    };
    ld.insert("url".into(), url.into());
    ld.insert("applicationCategory".into(), app["appType"].as_str().filter(|t| !t.is_empty()).unwrap_or("WebApplication").into());
    ld.insert("operatingSystem".into(), "Web".into());
    if app["image"].as_str().is_some_and(|i| !i.is_empty()) {
        ld.insert("image".into(), app["image"].clone());
    }
    let stack: Vec<&str> = app["techStack"].as_array().map(|a| a.iter().filter_map(Value::as_str).collect()).unwrap_or_default();
    if !stack.is_empty() {
        ld.insert("softwareRequirements".into(), stack.join(", ").into());
    }
    if !project_link.is_null() {
        ld.insert("isBasedOn".into(), json!({ "@type": "SoftwareSourceCode", "name": project_link["name"], "url": format!("{base}{}", project_link["href"].as_str().unwrap_or_default()) }));
    }
    ld.insert("mainEntityOfPage".into(), json!({ "@type": "WebPage", "@id": app_url }));
    head.json_ld.push(Value::Object(ld));
    let name = app["name"].as_str().unwrap_or_default().to_string();
    head.json_ld.push(breadcrumb(&site, &shell, "/apps", "Apps", &[(name.clone(), format!("/apps/{slug}"))]));

    let fallback = format!("<main><article><h1>{}</h1><p>{}</p></article></main>", escape(&name), escape(app["description"].as_str().unwrap_or_default()));
    let page = json!({ "deployment": app, "relatedProject": project_link, "legal": legal, "productHref": product });
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

const AI_HUB_DESCRIPTION: &str = "The AI stack I build with — skills my agents can use, recommended tools, free-credit resources, live telemetry, and a reusable prompt library.";
// Next joins a keywords array with "," (no space).
const AI_HUB_KEYWORDS: &str = "AI developer,AI agent skills,AI tools,free AI credits,free AI API,RAG,prompt engineering,LLM,Groq,OpenRouter,Gemini";

fn breadcrumb_list(items: &[(String, String)]) -> Value {
    json!({
        "@type": "BreadcrumbList",
        "itemListElement": items.iter().enumerate().map(|(i, (n, u))| json!({ "@type": "ListItem", "position": i + 1, "name": n, "item": u })).collect::<Vec<_>>(),
    })
}

/// `/ai`: port of src/app/(site)/ai/page.js.
pub async fn ai_hub(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let (config, stats) = match crate::ai::page_data(&state.db, &web.ai_defaults).await {
        Ok(d) => d,
        Err(err) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let social = pages::social_meta(&state.db).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let base = site.base_url.clone();
    let url = format!("{base}/ai");
    let title = format!("{} | AI Hub", site.base_name);

    let mut head = section_head(&site, &social, "/ai", &title, AI_HUB_DESCRIPTION, "/ai");
    head.keywords = AI_HUB_KEYWORDS.into();
    head.og.insert(4, ("og:site_name", site.base_name.clone()));
    // generateAiHubSchema: the WebPage, then an ItemList of every skill.
    let mut schemas = vec![json!({
        "@context": "https://schema.org", "@type": "WebPage", "@id": url, "url": url, "name": title, "description": AI_HUB_DESCRIPTION,
        "isPartOf": { "@type": "WebSite", "url": base },
        "breadcrumb": breadcrumb_list(&[("Home".into(), base.clone()), (nav_label(&shell, "/ai", "AI Hub"), url.clone())]),
    })];
    if let Some(skills) = crate::ai::renderable_section(&config, "skills") {
        let items: Vec<&Value> = skills["data"]["categories"].as_array().into_iter().flatten()
            .flat_map(|c| c["items"].as_array().into_iter().flatten())
            .filter(|i| i["name"].as_str().is_some_and(|n| !n.is_empty()))
            .collect();
        if !items.is_empty() {
            let list: Vec<Value> = items.iter().enumerate().map(|(i, it)| {
                let mut o = serde_json::Map::new();
                o.insert("@type".into(), "ListItem".into());
                o.insert("position".into(), (i + 1).into());
                o.insert("name".into(), it["name"].clone());
                for k in ["description", "url"] {
                    if it[k].as_str().is_some_and(|v| !v.is_empty()) {
                        o.insert(k.into(), it[k].clone());
                    }
                }
                Value::Object(o)
            }).collect();
            let name = skills["title"].as_str().filter(|t| !t.is_empty()).unwrap_or("AI skills & specializations");
            schemas.push(json!({ "@context": "https://schema.org", "@type": "ItemList", "name": name, "numberOfItems": items.len(), "itemListElement": list }));
        }
    }
    head.json_ld.push(Value::Array(schemas));

    let mut fallback = format!("<main><h1>{}</h1><p>{}</p><ul>", escape(&title), escape(AI_HUB_DESCRIPTION));
    for (kind, slug, fallback_title) in crate::ai::SUBPAGES {
        if let Some(s) = crate::ai::renderable_section(&config, kind) {
            fallback.push_str(&format!(r#"<li><a href="/ai/{slug}">{}</a></li>"#, escape(s["title"].as_str().unwrap_or(fallback_title))));
        }
    }
    fallback.push_str("</ul></main>");
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, json!({ "config": config, "stats": stats }), fallback)
}

/// `/ai/{section}`: port of src/app/(site)/ai/[section]/page.js.
pub async fn ai_section(State(state): State<AppState>, Path(slug): Path<String>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let Some(&(kind, slug, fallback_title)) = crate::ai::SUBPAGES.iter().find(|(_, s, _)| *s == slug) else {
        return not_found_page(&web, &state, &req).await;
    };
    let (config, stats) = match crate::ai::page_data(&state.db, &web.ai_defaults).await {
        Ok(d) => d,
        Err(err) => return server_error(err),
    };
    let Some(section) = crate::ai::renderable_section(&config, kind).cloned() else {
        return not_found_page(&web, &state, &req).await;
    };
    let site = Site::load(&state).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let base = site.base_url.clone();
    let url = format!("{base}/ai/{slug}");
    let heading = section["title"].as_str().filter(|t| !t.is_empty()).unwrap_or(fallback_title).to_string();
    let title = format!("{} | {heading}", site.base_name);
    // describeSection: subtitle, else title, else the fallback title; 160 chars.
    let description: String = section["subtitle"].as_str().filter(|t| !t.is_empty())
        .or(section["title"].as_str().filter(|t| !t.is_empty()))
        .unwrap_or(fallback_title)
        .trim()
        .chars()
        .take(160)
        .collect();
    let og_image = site.config["ogImage"].as_str().map(str::trim).filter(|v| !v.is_empty())
        .map(|v| pages::absolute(&base, v))
        .unwrap_or_else(|| format!("{base}/og-image.png"));

    let mut head = Head::site(&site, &title, &description);
    head.canonical = url.clone();
    head.og = vec![
        ("og:title", title.clone()),
        ("og:description", description.clone()),
        ("og:url", url.clone()),
        ("og:site_name", site.base_name.clone()),
        ("og:image", og_image.clone()),
        ("og:image:width", "1200".into()),
        ("og:image:height", "630".into()),
        ("og:image:alt", format!("{} — {heading}", site.base_name)),
        ("og:type", "website".into()),
    ];
    head.twitter = Some((title.clone(), description.clone(), og_image));
    let hub_label = nav_label(&shell, "/ai", "AI Hub");
    let mut crumbs = json!({ "@context": "https://schema.org" });
    if let (Some(o), Value::Object(list)) = (crumbs.as_object_mut(), breadcrumb_list(&[("Home".into(), base.clone()), (hub_label.clone(), format!("{base}/ai")), (heading.clone(), url.clone())])) {
        o.extend(list);
    }
    head.json_ld.push(crumbs);

    let fallback = format!("<main><h1>{}</h1><p>{}</p></main>", escape(&heading), escape(&description));
    let page = json!({ "section": section, "stats": if kind == "stats" { stats } else { Value::Null }, "slug": slug, "hubLabel": hub_label });
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/sitemap` (HTML): port of src/app/(site)/sitemap/page.js. The Vite route builds the columns (it owns the games list).
pub async fn sitemap_page(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let db = &state.db;
    let blogs: Vec<String> = match sqlx::query_scalar(r#"SELECT slug FROM "Blog" WHERE published AND slug <> '' ORDER BY "createdAt" DESC"#).fetch_all(db).await {
        Ok(b) => b,
        Err(err) => return server_error(err.into()),
    };
    let entry = |rows: Vec<Value>, prefix: &str| -> Vec<Value> { rows.iter().map(|r| json!({ "name": r["name"], "slug": pages::entity_slug(r, prefix) })).collect() };
    let (projects, apps) = match (pages::projects(db, true).await, pages::deployments(db).await) {
        (Ok(p), Ok(a)) => (entry(p, "project"), entry(a, "app")),
        (Err(err), _) | (_, Err(err)) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let mut head = Head::site(&site, &format!("{} | HTML Sitemap", site.base_name), &format!("Complete HTML Sitemap of {} covering all projects, blogs, apps, and pages.", site.base_name));
    head.robots = "noindex, follow".into();
    head.googlebot = None;
    head.canonical = format!("{}/sitemap", site.base_url);
    head.json_ld.push(breadcrumb(&site, &shell, "/sitemap", "Sitemap", &[]));

    let mut fallback = String::from("<main><h1>Sitemap</h1><ul>");
    for (prefix, list) in [("/apps", &apps), ("/projects", &projects)] {
        for e in list {
            fallback.push_str(&format!(r#"<li><a href="{prefix}/{}">{}</a></li>"#, escape(e["slug"].as_str().unwrap_or_default()), escape(e["name"].as_str().unwrap_or_default())));
        }
    }
    for b in &blogs {
        fallback.push_str(&format!(r#"<li><a href="/blogs/{0}">{1}</a></li>"#, escape(b), escape(&b.replace('-', " "))));
    }
    fallback.push_str("</ul></main>");
    let page = json!({ "blogs": blogs, "projects": projects, "apps": apps });
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/`: port of src/app/(site)/page.js.
pub async fn home(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let db = &state.db;
    let (projects, blogs) = match (pages::projects(db, true).await, pages::recent_blogs(db).await) {
        (Ok(p), Ok(b)) => (p, b),
        (Err(err), _) | (_, Err(err)) => return server_error(err),
    };
    let home = pages::singleton(db, "Home", false).await;
    let about = pages::singleton(db, "About", false).await;
    let site = Site::load(&state).await;
    let social = pages::social_meta(db).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let base = site.base_url.clone();
    let c = &site.config;
    let cs = |k: &str| c[k].as_str().filter(|v| !v.is_empty());

    let mut head = section_head(&site, &social, "/", &site.site_title, &site.description, "");
    head.googlebot = Some(GOOGLEBOT_ROOT);
    head.og.insert(4, ("og:locale", "en_US".into()));
    head.og.insert(5, ("og:site_name", site.site_title.clone()));
    // generateWebsiteSchema, generateOrganizationSchema, generatePersonSchema (the public config has none of the
    // Person fields, so those are the defaults).
    head.json_ld.push(json!([
        {
            "@context": "https://schema.org", "@type": "WebSite", "url": base, "name": cs("siteTitle").unwrap_or("Portfolio"),
            "description": "Portfolio & Blog",
            "potentialAction": { "@type": "SearchAction", "target": { "@type": "EntryPoint", "urlTemplate": format!("{base}/search?q={{search_term_string}}") }, "query_input": "required name=search_term_string" },
        },
        {
            "@context": "https://schema.org", "@type": "Organization", "name": cs("siteName").or(cs("siteTitle")).unwrap_or("Portfolio"), "url": base,
            "logo": cs("logo").unwrap_or("/logo.png"), "description": cs("siteDescription").unwrap_or("Full Stack Developer Portfolio"),
            "contactPoint": { "@type": "ContactPoint", "contactType": "General Inquiries", "email": cs("contactEmail").unwrap_or("contact@example.com") },
            "sameAs": c.get("socialLinks").cloned().unwrap_or(json!([])),
        },
        {
            "@context": "https://schema.org", "@type": "Person", "name": cs("name").unwrap_or("Portfolio Owner"), "url": base,
            "description": cs("description").unwrap_or("Full Stack Developer & Designer"), "image": cs("profileImage").unwrap_or("/og-image.png"),
            "email": cs("email").unwrap_or("contact@example.com"), "jobTitle": cs("title").unwrap_or("Full Stack Developer"),
            "worksFor": cs("company").unwrap_or("Self-employed"), "sameAs": c.get("socialLinks").cloned().unwrap_or(json!([])),
        },
    ]));

    let s = |v: &Value, k: &str| v[k].as_str().unwrap_or_default().to_string();
    let mut fallback = format!("<main><h1>{}</h1><p>{}</p><ul>", escape(&s(&home, "name")), escape(&site.description));
    for p in projects.iter().take(6) {
        fallback.push_str(&format!(r#"<li><a href="/projects/{}">{}</a></li>"#, escape(&pages::entity_slug(p, "project")), escape(&s(p, "name"))));
    }
    for b in &blogs {
        fallback.push_str(&format!(r#"<li><a href="/blogs/{}">{}</a></li>"#, escape(&s(b, "slug")), escape(&s(b, "title"))));
    }
    fallback.push_str("</ul></main>");
    let page = json!({ "home": home, "about": about, "projects": projects, "blogs": blogs, "config": site.config });
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// JS `text.slice(0, n)` (UTF-16 units).
fn js_slice(text: &str, n: usize) -> String {
    let units: Vec<u16> = text.encode_utf16().take(n).collect();
    String::from_utf16_lossy(&units)
}

/// Not a legal page: let Next answer (files, unported routes, its 404).
async fn to_next(state: AppState, parts: Parts) -> Response {
    crate::proxy::forward(State(state), Request::from_parts(parts, Body::empty())).await
}

/// Legal pages are served by Rust only after the database says so; RSC requests get the same empty reply as the
/// other Vite pages, and the canonical-host redirect applies like Next's middleware.
fn legal_guard(req: &Parts) -> Option<Response> {
    if let Some(r) = crate::compat::canonical_redirect_for(&req.method, &req.headers, &req.uri) {
        return Some(r);
    }
    req.headers.contains_key("rsc").then(|| {
        let mut res = Response::new(Body::empty());
        res.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static("text/plain"));
        res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        res
    })
}

/// `/{legalApp}`: port of src/app/[legalApp]/page.js. Paths that are not legal apps go on to Next.
pub async fn legal_app(State(state): State<AppState>, Path(raw): Path<String>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let (Some(web), Some(slug)) = (state.web.clone(), crate::legal::candidate(&raw)) else {
        return crate::proxy::forward(State(state), Request::from_parts(parts, body)).await;
    };
    let app = match crate::legal::public_app(&state.db, &slug).await {
        Ok(Some(a)) => a,
        Ok(None) => return to_next(state, parts).await,
        // The catch-all must never break other paths: on a database error, let Next answer.
        Err(err) => {
            tracing::warn!(error = %err, "legal lookup failed; passing to Next");
            return to_next(state, parts).await;
        }
    };
    if let Some(r) = legal_guard(&parts) {
        return r;
    }
    let showcase = match crate::legal::showcase(&state.db, &app).await {
        Ok(s) => s,
        Err(err) => return server_error(err),
    };
    let docs = app["documents"].as_array().cloned().unwrap_or_default();
    let product = &showcase["app"];
    // Nothing to show: no linked product and no published legal pages.
    if product.is_null() && docs.is_empty() {
        return not_found_page(&web, &state, &parts).await;
    }
    let site = Site::load(&state).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let base = site.base_url.clone();
    let st = |v: &Value, k: &str| v[k].as_str().unwrap_or_default().to_string();
    let name = st(&app, "name");
    let url = format!("{base}/{}", st(&app, "slug"));
    let label = |t: &str| if t.is_empty() { "App".to_string() } else if regex_word(t, "app") { t.to_string() } else { format!("{t} App") };
    let title = if product.is_null() { format!("{name} — Legal") } else { format!("{name} — {}", label(&st(product, "type"))) };
    let lede = [st(&app, "description"), st(product, "description"), st(&showcase["project"], "description")].into_iter().find(|t| !t.is_empty()).unwrap_or_default();
    let description = if !lede.is_empty() {
        if lede.encode_utf16().count() > 160 { format!("{}…", js_slice(&lede, 157).trim_end()) } else { lede.clone() }
    } else {
        let titles: Vec<String> = docs.iter().map(|d| st(d, "title")).collect();
        js_slice(&format!("{name}: {}.", titles.join(", ")), 160)
    };
    let pick = |v: &Value| v.as_str().filter(|v| !v.is_empty()).map(str::to_string);
    let image = pick(&product["image"]).or_else(|| pick(&showcase["project"]["image"])).or_else(|| pick(&site.config["ogImage"])).unwrap_or_else(|| format!("{base}/og-image.png"));
    let mut keywords: Vec<String> = vec![];
    let candidates = [Some(name.clone()), Some(format!("{name} app")), pick(&product["type"])]
        .into_iter()
        .flatten()
        .chain(product["techStack"].as_array().into_iter().flatten().filter_map(|v| pick(v)))
        .chain(docs.iter().map(|d| format!("{name} {}", st(d, "title"))));
    for k in candidates {
        if !k.is_empty() && !keywords.contains(&k) {
            keywords.push(k);
        }
    }

    let mut head = Head::site(&site, &format!("{title} | {}", site.base_name), &description);
    head.keywords = keywords.join(",");
    head.canonical = url.clone();
    head.googlebot = Some("index, follow, max-image-preview:large, max-snippet:-1");
    head.og = vec![
        ("og:title", title.clone()), ("og:description", description.clone()), ("og:url", url.clone()), ("og:site_name", site.base_name.clone()),
        ("og:image", image.clone()), ("og:image:width", "1200".into()), ("og:image:height", "630".into()), ("og:image:alt", name.clone()),
        ("og:type", "website".into()),
    ];
    head.twitter = Some((title.clone(), description.clone(), image));

    let package = st(&app, "packageName");
    let mut graph = vec![];
    let mut webpage = json!({
        "@type": "WebPage", "@id": format!("{url}#webpage"), "url": url, "name": title, "description": description,
        "isPartOf": { "@type": "WebSite", "url": base }, "breadcrumb": { "@id": format!("{url}#breadcrumb") },
    });
    if !product.is_null() {
        webpage["mainEntity"] = json!({ "@id": format!("{url}#app") });
    }
    webpage["hasPart"] = docs.iter().map(|d| json!({ "@type": "WebPage", "name": d["title"], "url": format!("{url}/{}", st(d, "slug")) })).collect();
    graph.push(webpage);
    graph.push(json!({
        "@type": "BreadcrumbList", "@id": format!("{url}#breadcrumb"),
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": if base.is_empty() { "/".to_string() } else { base.clone() } },
            { "@type": "ListItem", "position": 2, "name": name, "item": url },
        ],
    }));
    if !product.is_null() {
        let kind = st(product, "type");
        let os = if regex_ci(&kind, &["android"]) { Some("Android") }
            else if regex_word(&kind, "ios") || regex_ci(&kind, &["iphone", "ipad"]) { Some("iOS") }
            else if regex_ci(&kind, &["web", "site", "saas"]) { Some("Web") }
            else if !package.is_empty() { Some("Android") } else { None };
        let external = st(product, "externalUrl");
        let external = (external.to_lowercase().starts_with("http://") || external.to_lowercase().starts_with("https://")).then_some(external);
        let mut ld = serde_json::Map::new();
        ld.insert("@type".into(), "SoftwareApplication".into());
        ld.insert("@id".into(), format!("{url}#app").into());
        ld.insert("name".into(), name.clone().into());
        ld.insert("url".into(), url.clone().into());
        if !lede.is_empty() { ld.insert("description".into(), lede.clone().into()); }
        if let Some(i) = pick(&product["image"]) { ld.insert("image".into(), i.into()); }
        ld.insert("applicationCategory".into(), (if kind.is_empty() { "Application".to_string() } else { kind.clone() }).into());
        if let Some(os) = os { ld.insert("operatingSystem".into(), os.into()); }
        if !package.is_empty() { ld.insert("identifier".into(), package.clone().into()); }
        let stack: Vec<&str> = product["techStack"].as_array().map(|a| a.iter().filter_map(Value::as_str).collect()).unwrap_or_default();
        if !stack.is_empty() { ld.insert("softwareRequirements".into(), stack.join(", ").into()); }
        let mut same = vec![Value::from(format!("{base}{}", st(product, "href")))];
        if let Some(e) = external { same.push(e.into()); }
        ld.insert("sameAs".into(), same.into());
        if !showcase["project"].is_null() {
            ld.insert("isBasedOn".into(), json!({ "@type": "SoftwareSourceCode", "name": showcase["project"]["name"], "url": format!("{base}{}", st(&showcase["project"], "href")) }));
        }
        graph.push(Value::Object(ld));
    }
    head.json_ld.push(json!({ "@context": "https://schema.org", "@graph": graph }));

    let mut fallback = format!("<main><h1>{}</h1><p>{}</p><ul>", escape(&name), escape(&lede));
    for d in &docs {
        fallback.push_str(&format!(r#"<li><a href="/{}/{}">{}</a></li>"#, escape(&st(&app, "slug")), escape(&st(d, "slug")), escape(&st(d, "title"))));
    }
    fallback.push_str("</ul></main>");
    let page = json!({ "app": app, "showcase": showcase, "lede": lede });
    render(&web, &state, parts.uri.path(), &parts.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/{legalApp}/{legalDoc}`: port of src/app/[legalApp]/[legalDoc]/page.js.
pub async fn legal_doc(State(state): State<AppState>, Path((raw_app, raw_doc)): Path<(String, String)>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let (Some(web), Some(slug)) = (state.web.clone(), crate::legal::candidate(&raw_app)) else {
        return crate::proxy::forward(State(state), Request::from_parts(parts, body)).await;
    };
    let app = match crate::legal::public_app(&state.db, &slug).await {
        Ok(Some(a)) => a,
        Ok(None) => return to_next(state, parts).await,
        // The catch-all must never break other paths: on a database error, let Next answer.
        Err(err) => {
            tracing::warn!(error = %err, "legal lookup failed; passing to Next");
            return to_next(state, parts).await;
        }
    };
    if let Some(r) = legal_guard(&parts) {
        return r;
    }
    let want = raw_doc.trim().to_lowercase();
    let Some(doc) = app["documents"].as_array().and_then(|d| d.iter().find(|d| d["slug"].as_str() == Some(want.as_str()))).cloned() else {
        return not_found_page(&web, &state, &parts).await;
    };
    let linked = match crate::legal::linked_deployment(&state.db, &app).await {
        Ok(l) => l,
        Err(err) => return server_error(err),
    };
    let site = Site::load(&state).await;
    let shell = pages::shell_data(&state, &site.config).await;
    let base = site.base_url.clone();
    let st = |v: &Value, k: &str| v[k].as_str().unwrap_or_default().to_string();
    let (name, doc_title) = (st(&app, "name"), st(&doc, "title"));
    let url = format!("{base}/{}/{}", st(&app, "slug"), st(&doc, "slug"));
    let title = format!("{doc_title} — {name}");
    let package = st(&app, "packageName");
    let description = match st(&doc, "seoDescription") {
        d if !d.is_empty() => d,
        _ => js_slice(&format!("{doc_title} for {name}{}: how the app handles your information, your rights, and how to get in touch.", if package.is_empty() { String::new() } else { format!(" ({package})") }), 160),
    };

    let mut head = Head::site(&site, &format!("{title} | {}", site.base_name), &description);
    head.canonical = url.clone();
    if doc["noIndex"] == Value::Bool(true) {
        head.robots = "noindex, follow".into();
        head.googlebot = None;
    } else {
        head.googlebot = Some("index, follow, max-snippet:-1");
    }
    head.og = vec![("og:title", title.clone()), ("og:description", description.clone()), ("og:url", url.clone()), ("og:site_name", site.base_name.clone()), ("og:type", "article".into())];
    if let Some(m) = doc["updatedAt"].as_str().filter(|m| !m.is_empty()) {
        head.og.push(("article:modified_time", m.to_string()));
    }
    head.twitter = Some((title.clone(), description.clone(), String::new()));
    head.twitter_card = "summary";

    let mut page_ld = serde_json::Map::new();
    page_ld.insert("@context".into(), "https://schema.org".into());
    page_ld.insert("@type".into(), "WebPage".into());
    page_ld.insert("name".into(), title.clone().into());
    page_ld.insert("description".into(), description.clone().into());
    page_ld.insert("url".into(), url.clone().into());
    page_ld.insert("inLanguage".into(), "en".into());
    for (k, from) in [("dateModified", "updatedAt"), ("datePublished", "createdAt")] {
        if let Some(v) = doc[from].as_str().filter(|v| !v.is_empty()) {
            page_ld.insert(k.into(), v.into());
        }
    }
    let mut about = serde_json::Map::new();
    about.insert("@type".into(), "SoftwareApplication".into());
    about.insert("name".into(), name.clone().into());
    if !linked.is_null() {
        about.insert("url".into(), format!("{base}{}", st(&linked, "href")).into());
    }
    if !package.is_empty() {
        about.insert("identifier".into(), package.into());
    }
    page_ld.insert("about".into(), Value::Object(about));
    page_ld.insert("isPartOf".into(), json!({ "@type": "WebSite", "url": base }));
    head.json_ld.push(json!([
        Value::Object(page_ld),
        {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": if base.is_empty() { "/".to_string() } else { base.clone() } },
                { "@type": "ListItem", "position": 2, "name": name, "item": format!("{base}/{}", st(&app, "slug")) },
                { "@type": "ListItem", "position": 3, "name": doc_title, "item": url },
            ],
        },
    ]));

    let fallback = format!("<main><article><h1>{}</h1>{}</article></main>", escape(&doc_title), pages::markdown_html(&st(&doc, "content")));
    let page = json!({ "app": app, "document": doc, "linkedApp": linked });
    render(&web, &state, parts.uri.path(), &parts.headers, &site, StatusCode::OK, head.render(), shell, page, fallback)
}

/// `/\bword\b/i` for an ASCII word.
fn regex_word(text: &str, word: &str) -> bool {
    let t = text.to_ascii_lowercase();
    let is_w = |c: char| c.is_ascii_alphanumeric() || c == '_';
    t.match_indices(word).any(|(i, _)| {
        let before = t[..i].chars().next_back().is_none_or(|c| !is_w(c));
        let after = t[i + word.len()..].chars().next().is_none_or(|c| !is_w(c));
        before && after
    })
}

/// `/a|b|c/i`
fn regex_ci(text: &str, any: &[&str]) -> bool {
    let t = text.to_ascii_lowercase();
    any.iter().any(|w| t.contains(w))
}

fn admin_route_exists(routes: &[String], path: &str) -> bool {
    let want: Vec<&str> = path.split('/').collect();
    routes.iter().any(|r| {
        let pat: Vec<&str> = r.split('/').collect();
        pat.len() == want.len() && pat.iter().zip(&want).all(|(p, w)| (p.starts_with('[') && !w.is_empty()) || p == w)
    })
}

/// `/admin` and everything under it: the session gate from src/proxy.js (a valid session JWT, like Next's
/// middleware; the API routes still check the Session row), the old redirect pages, then the Vite admin app.
pub async fn admin(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let path = req.uri.path().trim_end_matches('/').to_string();
    let signed_in = req.headers.get(header::COOKIE).and_then(|v| v.to_str().ok()).and_then(session_cookie).is_some_and(|t| state.sessions.verify(t).is_some());
    let login = path == "/admin/login";
    if login && signed_in {
        return Redirect::temporary("/admin").into_response();
    }
    if !login && !signed_in {
        return Redirect::temporary("/admin/login").into_response();
    }
    // Pages that only redirected in Next.
    let moved = match path.as_str() {
        "/admin/blogs/api" => Some("/admin/api-reference".to_string()),
        "/admin/deployments" => Some("/admin/apps".to_string()),
        p => p.strip_prefix("/admin/deployments/").filter(|r| !r.is_empty() && !r.contains('/')).map(|r| format!("/admin/apps/{r}")),
    };
    if let Some(to) = moved {
        return Redirect::temporary(&to).into_response();
    }
    let site = Site::load(&state).await;
    if !admin_route_exists(&web.admin_routes, &path) {
        return render(&web, &state, &path, &req.headers, &site, StatusCode::NOT_FOUND, site.not_found_head(), json!(null), json!(null), String::new());
    }
    // src/app/_admin/layout.js metadata (ads/page.js had its own title).
    let title = if path == "/admin/ads" { "AdSense Config | Admin Dashboard" } else { "Admin | Aiyu Portfolio" };
    let page = if login { json!({ "githubEnabled": std::env::var("GITHUB_AUTH_ENABLED").as_deref() == Ok("true") }) } else { Value::Null };
    render(&web, &state, &path, &req.headers, &site, StatusCode::OK, site.root_head(title, "Admin Dashboard"), Value::Null, page, String::new())
}

/// `/desktop` apps, for the JSON-LD feature list and the crawler summary (same list as the Vite route shows).
const DESKTOP_FEATURES: &[(&str, &str)] = &[
    ("File Explorer", "Browse the portfolio as a file system — projects, blog posts, gallery images and the résumé as files."),
    ("Code Editor", "A syntax-highlighted viewer for this site’s own source."),
    ("Terminal", "A working shell with commands for navigating the portfolio."),
    ("Browser", "An in-desktop browser that opens the live portfolio pages."),
    ("Widgets Board", "A Windows 11 style feed of recent projects, open-source repositories, posts and photos."),
    ("Markdown Viewer", "Reads README and post files from the file explorer."),
    ("Photos & Whiteboard", "A gallery viewer and a freehand drawing surface."),
];
const DEFAULT_WALLPAPER: &str = "https://images.unsplash.com/photo-1702539336564-b37d0f3276e7?q=80&w=2064&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

/// `/desktop`: port of src/app/desktop/page.js.
pub async fn desktop(State(state): State<AppState>, req: Request) -> Response {
    let web = web_or_next!(state, req);
    let req = req.into_parts().0;
    let site = Site::load(&state).await;
    // Only the keys the desktop reads (the full Config blob carries the resume source and long copy).
    let full = pages::singleton(&state.db, "Config", false).await;
    let mut config = serde_json::Map::new();
    for k in ["siteTitle", "authorName", "deviceName", "osVersion", "desktopDeviceName", "desktopOsVersion"] {
        if let Some(v) = full.get(k) {
            config.insert(k.into(), v.clone());
        }
    }
    config.insert("hasCustomFavicon".into(), site.config["hasCustomFavicon"].clone());
    let wallpaper = full["desktopWallpaper"].as_str().map(str::trim).filter(|w| !w.is_empty()).unwrap_or(DEFAULT_WALLPAPER).to_string();

    let base = site.base_url.clone();
    let title = "Aiyu OS — a desktop environment in the browser";
    let description = "A Windows 11 style desktop built in the browser: file explorer, code editor, terminal, markdown viewer, photo gallery, widgets board and a working browser — all rendered in React.";
    let base_name = site.config["siteTitle"].as_str().or(site.config["logoText"].as_str()).filter(|v| !v.is_empty()).unwrap_or("Aiyu Portfolio").to_string();
    let image = site.config["ogImage"].as_str().map(str::trim).filter(|v| !v.is_empty()).map(str::to_string).unwrap_or_else(|| format!("{base}/og-image.png"));
    let alt = "Aiyu OS desktop environment";
    let mut head = Head::site(&site, title, description);
    head.keywords = "browser desktop environment,web based operating system,Windows 11 clone,React desktop UI,Next.js portfolio,interactive portfolio,Aiyu OS".into();
    head.googlebot = Some("index, follow, max-image-preview:large, max-snippet:-1");
    head.canonical = format!("{base}/desktop");
    head.og = vec![
        ("og:title", format!("{title} | {base_name}")), ("og:description", description.into()), ("og:url", format!("{base}/desktop")),
        ("og:image", image.clone()), ("og:image:width", "1200".into()), ("og:image:height", "630".into()), ("og:image:alt", alt.into()),
        ("og:type", "website".into()),
    ];
    head.twitter = Some((title.into(), description.into(), image));
    // Next copies the OpenGraph image (with its size and alt) into the Twitter card; the wallpaper is the LCP.
    head.extra = format!(
        r#"<meta name="twitter:image:width" content="1200" /><meta name="twitter:image:height" content="630" /><meta name="twitter:image:alt" content="{alt}" /><link rel="preload" as="image" href="{}" fetchpriority="high" />"#,
        escape(&wallpaper)
    );
    let author = config.get("authorName").and_then(Value::as_str).filter(|a| !a.is_empty()).map(str::to_string)
        .or_else(|| std::env::var("NEXT_PUBLIC_AUTHOR_NAME").ok())
        .unwrap_or_else(|| "Aiyu".into());
    head.json_ld.push(json!({
        "@context": "https://schema.org", "@type": "WebApplication", "name": "Aiyu OS", "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any (web browser)", "url": format!("{base}/desktop"),
        "description": "A Windows 11 style desktop environment running in the browser, built with React and Next.js.",
        "browserRequirements": "Requires JavaScript.", "featureList": DESKTOP_FEATURES.iter().map(|(n, _)| *n).collect::<Vec<_>>(),
        "author": { "@type": "Person", "name": author }, "isPartOf": { "@type": "WebSite", "url": base },
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    }));

    let mut fallback = format!("<main><h1>{title}</h1><p>Aiyu OS is an interactive Windows 11 style desktop built with React, running entirely in the browser.</p><h2>Applications</h2><ul>");
    for (n, d) in DESKTOP_FEATURES {
        fallback.push_str(&format!("<li><strong>{}</strong>: {}</li>", escape(n), escape(d)));
    }
    fallback.push_str(r#"</ul><p><a href="/projects">Projects</a> · <a href="/blogs">Blog</a> · <a href="/about-me">About</a></p></main>"#);
    let page = json!({ "wallpaper": wallpaper, "config": config, "features": DESKTOP_FEATURES });
    render(&web, &state, req.uri.path(), &req.headers, &site, StatusCode::OK, head.render(), Value::Null, page, fallback)
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

/// Next's router asks for RSC payloads (`RSC: 1`), and prefetches every visible link to these pages. Answer with an
/// empty non-RSC body: Next then does a full page load instead of costing a whole page render per prefetch.
pub async fn skip_next_rsc(req: Request, next: axum::middleware::Next) -> Response {
    if req.headers().contains_key("rsc") {
        let mut res = Response::new(Body::empty());
        let h = res.headers_mut();
        h.insert(header::CONTENT_TYPE, HeaderValue::from_static("text/plain"));
        h.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        h.append(header::VARY, HeaderValue::from_static("rsc"));
        return res;
    }
    next.run(req).await
}

// ── rendering ────────────────────────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn render(web: &WebApp, state: &AppState, path: &str, headers: &HeaderMap, site: &Site, status: StatusCode, head: String, shell: Value, page: Value, fallback: String) -> Response {
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
        // CDNs ignore Vary on custom headers: never let a cache hold the JSON variant.
        res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
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
    // Admins get their own HTML (no GA id): never shared. Visitor pages get the public CDN policy.
    let public = !is_admin && status == StatusCode::OK && crate::compat::is_public_html(path);
    h.insert(header::CACHE_CONTROL, if public { crate::compat::public_html_cache() } else { HeaderValue::from_static("no-cache") });
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

const GOOGLEBOT_ROOT: &str = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";
/// Project and app detail pages list the keys in another order.
const GOOGLEBOT_DETAIL: &str = "index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1";

/// One page's `<head>`. Starts from the root layout's metadata; pages replace whole groups like Next does.
struct Head {
    title: String,
    description: String,
    keywords: String,
    robots: String,
    /// `googleBot` robots as Next renders it; the order depends on how the page wrote the object.
    googlebot: Option<&'static str>,
    canonical: String,
    og: Vec<(&'static str, String)>,
    /// (title, description, image); the root's site card by default.
    twitter: Option<(String, String, String)>,
    twitter_card: &'static str,
    /// Raw tags appended after the generated ones (already escaped).
    extra: String,
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
            googlebot: Some(GOOGLEBOT_ROOT),
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
                ("og:image:alt", site.base_name.clone()),
                ("og:type", "website".into()),
            ],
            twitter: Some((site.site_title.clone(), site.description.clone(), site.og_image.clone())),
            twitter_card: "summary_large_image",
            extra: String::new(),
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
        if let Some(g) = self.googlebot {
            h.push_str(&format!(r#"<meta name="googlebot" content="{g}" />"#));
        }
        h.push_str(&format!(r#"<link rel="canonical" href="{}" />"#, e(&self.canonical)));
        for (p, v) in &self.og {
            h.push_str(&format!(r#"<meta property="{p}" content="{}" />"#, e(v)));
        }
        if let Some((t, d, i)) = &self.twitter {
            h.push_str(&format!(r#"<meta name="twitter:card" content="{}" />"#, self.twitter_card));
            h.push_str(&format!(r#"<meta name="twitter:title" content="{}" /><meta name="twitter:description" content="{}" />"#, e(t), e(d)));
            if !i.is_empty() {
                h.push_str(&format!(r#"<meta name="twitter:image" content="{}" />"#, e(i)));
            }
        }
        for rel in ["shortcut icon", "icon", "apple-touch-icon"] {
            h.push_str(&format!(r#"<link rel="{rel}" href="{}" />"#, e(&self.icon)));
        }
        h.push_str(&self.extra);
        for ld in &self.json_ld {
            h.push_str(&format!(r#"<script type="application/ld+json">{}</script>"#, script_json(ld)));
        }
        h
    }
}

/// BreadcrumbSchema: Home, the section (labelled from the header nav when present), then `trail`.
fn breadcrumb(site: &Site, shell: &Value, path: &str, name: &str, trail: &[(String, String)]) -> Value {
    let label = nav_label(shell, path, name);
    let base = &site.base_url;
    let mut items = vec![("Home".to_string(), base.clone()), (label.to_string(), format!("{base}{path}"))];
    items.extend(trail.iter().filter(|(n, _)| !n.is_empty()).map(|(n, p)| (n.clone(), format!("{base}{p}"))));
    json!({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": items.iter().enumerate().map(|(i, (n, u))| json!({ "@type": "ListItem", "position": i + 1, "name": n, "item": u })).collect::<Vec<_>>(),
    })
}

/// `resolveNavLabel`: the header nav's name for `path` (prettified), else `fallback`.
fn nav_label(shell: &Value, path: &str, fallback: &str) -> String {
    shell["header"]["navLinks"]
        .as_array()
        .and_then(|links| links.iter().find(|l| l["href"].as_str().map(|h| h.trim().trim_end_matches('/')) == Some(path)))
        .and_then(|l| l["name"].as_str())
        .map(prettify_nav_name)
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

/// `prettifyNavName` in BreadcrumbSchema.js: "about-me" -> "About Me".
fn prettify_nav_name(v: &str) -> String {
    let word = |c: char| c.is_ascii_alphanumeric() || c == '_';
    let mut cleaned = String::new();
    let mut sep = false;
    for c in v.trim_start_matches('_').chars() {
        if c == '-' || c == '_' {
            sep = true;
        } else {
            if sep {
                cleaned.push(' ');
                sep = false;
            }
            cleaned.push(c);
        }
    }
    let mut out = String::new();
    let mut prev_word = false;
    for c in cleaned.trim().chars() {
        out.push(if word(c) && !prev_word { c.to_ascii_uppercase() } else { c });
        prev_word = word(c);
    }
    out
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

/// `new URL(value, getSiteUrl()).toString()` for site-relative values.
pub fn absolute_url(value: &str) -> String {
    let base = site_url();
    reqwest::Url::parse(&format!("{base}/")).and_then(|b| b.join(value)).map(|u| u.to_string()).unwrap_or_else(|_| pages::absolute(&base, value))
}

/// `getSiteUrl()` in src/lib/siteUrl.js.
pub(crate) fn site_url() -> String {
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
    fn js_regex_helpers() {
        assert!(regex_word("Android App", "app") && !regex_word("Apps", "app") && regex_word("iOS", "ios"));
        assert!(regex_ci("SaaS tool", &["web", "site", "saas"]) && !regex_ci("Desktop", &["web"]));
        assert_eq!(js_slice("a😀b", 2), "a\u{FFFD}");
    }

    #[test]
    fn admin_routes_match_patterns() {
        let r = vec!["/admin".to_string(), "/admin/apps/[id]".to_string(), "/admin/legal/[id]/pages/[docId]".to_string()];
        assert!(admin_route_exists(&r, "/admin") && admin_route_exists(&r, "/admin/apps/x1") && admin_route_exists(&r, "/admin/legal/a/pages/b"));
        assert!(!admin_route_exists(&r, "/admin/apps") && !admin_route_exists(&r, "/admin/apps/x/y") && !admin_route_exists(&r, "/admin/nope"));
    }

    #[test]
    fn nav_names() {
        assert_eq!(prettify_nav_name("about-me"), "About Me");
        assert_eq!(prettify_nav_name("__blogs"), "Blogs");
        assert_eq!(prettify_nav_name("open_source--x"), "Open Source X");
    }

    #[test]
    fn iso_dates() {
        assert_eq!(iso(Some(&json!("2026-08-24T18:30"))).as_deref(), Some("2026-08-24T18:30:00.000Z"));
        assert_eq!(iso(Some(&json!("2026-09-07T12:22:43.036Z"))).as_deref(), Some("2026-09-07T12:22:43.036Z"));
        assert_eq!(iso(Some(&json!("not a date"))), None);
    }
}
