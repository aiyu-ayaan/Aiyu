//! More public `/api/*` reads ported from src/app/api, plus the `/.well-known/*` discovery documents:
//! themes, the /desktop widgets and source browser, global search and agent discovery.
//! Same JSON, status codes and cache headers as the Next handlers.

use crate::db;
use axum::{
    Json,
    extract::{Path, RawQuery, State},
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Map, Value, json};
use std::cmp::Ordering;

use crate::{
    AppState,
    api::{PUBLIC_MEDIUM, PUBLIC_SHORT, error, log_error, medium, public_json, truthy},
    pages,
};

/// `createPublicCacheHeaders(cache)` on an existing response.
fn with_public_cache(mut res: Response, cache: &'static str) -> Response {
    for name in ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] {
        res.headers_mut().insert(name, HeaderValue::from_static(cache));
    }
    res
}

/// The debug key header carries a request value (an id, a query); it is informative only.
fn with_key(mut res: Response, key: &str) -> Response {
    if let Ok(h) = HeaderValue::from_str(key) {
        res.headers_mut().insert("x-app-cache-key", h);
    }
    res
}

/// `String(v)` for the scalar values these handlers coerce.
pub(crate) fn js_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => "null".into(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Array(a) => a.iter().map(|x| if x.is_null() { String::new() } else { js_string(x) }).collect::<Vec<_>>().join(","),
        Value::Object(_) => "[object Object]".into(),
    }
}

/// `String(v || '')`
fn str_or_empty(v: &Value) -> String {
    if truthy(v) { js_string(v) } else { String::new() }
}

/// `v || fallback`
fn or<'a>(v: &'a Value, fallback: &'a Value) -> &'a Value {
    if truthy(v) { v } else { fallback }
}

/// `Number(v) || 0`
fn js_number(v: &Value) -> Value {
    let n = match v {
        Value::Number(n) => n.as_f64().unwrap_or(0.0),
        Value::Bool(b) => f64::from(u8::from(*b)),
        Value::String(s) if s.trim().is_empty() => 0.0,
        Value::String(s) => s.trim().parse().unwrap_or(0.0),
        _ => 0.0,
    };
    if !n.is_finite() || n == 0.0 {
        json!(0)
    } else if n.fract() == 0.0 && n.abs() < 9e15 {
        json!(n as i64)
    } else {
        json!(n)
    }
}

/// `str.substring(0, n)`: counts UTF-16 code units like JS.
fn js_substring(s: &str, n: usize) -> String {
    let mut units = 0;
    let mut out = String::new();
    for c in s.chars() {
        units += c.len_utf16();
        if units > n {
            break;
        }
        out.push(c);
    }
    out
}

// ── themes ─────────────────────────────────────────────────────────────────────────────────────────────

fn theme_error(err: &anyhow::Error) -> Response {
    log_error("/api/themes", err);
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "success": false, "error": err.to_string() }))).into_response()
}

/// `getTheme(slug)`: a predefined preset, current or legacy.
fn preset<'a>(themes: &'a Value, slug: &str) -> Option<&'a Value> {
    themes["presets"].get(slug).or_else(|| themes["legacy"].get(slug))
}

/// `GET /api/themes`: predefined, legacy, then custom themes (newest first).
pub async fn themes(State(state): State<AppState>) -> Response {
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    let custom = match pages::client_rows(&state.db, "Theme", r#"ORDER BY "createdAt" DESC"#).await {
        Ok(rows) => rows,
        Err(err) => return theme_error(&err),
    };
    let tagged = |group: &Value, legacy: bool| -> Vec<Value> {
        group.as_object().into_iter().flat_map(|m| m.values()).map(|t| {
            let mut t = t.clone();
            if let Some(o) = t.as_object_mut() {
                o.insert("isLegacy".into(), legacy.into());
            }
            t
        }).collect()
    };
    let predefined = tagged(&web.themes["presets"], false);
    let legacy = tagged(&web.themes["legacy"], true);
    let count = json!({
        "predefined": predefined.len(), "legacy": legacy.len(), "custom": custom.len(),
        "total": predefined.len() + legacy.len() + custom.len(),
    });
    let all: Vec<Value> = predefined.into_iter().chain(legacy).chain(custom).collect();
    public_json(json!({ "success": true, "data": all, "count": count }), PUBLIC_MEDIUM, "db:themes:list")
}

/// `GET /api/themes/active`: the active theme, variant and per-page settings from the config.
pub async fn active_theme(State(state): State<AppState>) -> Response {
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    let mut config = match pages::try_singleton(&state.db, "Config", false).await {
        Ok(c) => c,
        Err(err) => return theme_error(&err),
    };
    // No config row: create one with the default theme.
    if config.is_null() {
        let defaults = json!({ "activeTheme": "vs-code-dark", "activeThemeVariant": "dark", "allowThemeSwitching": true });
        let patch = defaults.as_object().cloned().unwrap_or_default();
        config = match crate::write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &patch).await {
            Ok(c) => c,
            Err(err) => return theme_error(&err),
        };
    }
    let slug = config["activeTheme"].as_str().filter(|s| !s.is_empty()).unwrap_or("vs-code-dark").to_string();
    let mut theme = match preset(&web.themes, &slug) {
        Some(t) => t.clone(),
        None => match sqlx::query_scalar::<_, String>(&format!(r#"SELECT {} FROM "Theme" WHERE slug = $1 LIMIT 1"#, db::row_json("Theme")))
            .bind(&slug)
            .fetch_optional(&state.db)
            .await
        {
            Ok(Some(raw)) => serde_json::from_str(&raw).map(pages::to_client_row).unwrap_or(Value::Null),
            Ok(None) => Value::Null,
            Err(err) => return theme_error(&err.into()),
        },
    };
    if theme.is_null() {
        theme = preset(&web.themes, "vs-code-dark").cloned().unwrap_or(Value::Null);
    }
    let mut data = Map::new();
    data.insert("theme".into(), theme);
    data.insert("activeVariant".into(), or(&config["activeThemeVariant"], &json!("dark")).clone());
    // `undefined` drops the key from the JSON.
    if let Some(v) = config.get("allowThemeSwitching") {
        data.insert("allowThemeSwitching".into(), v.clone());
    }
    data.insert("perPageThemes".into(), or(&config["perPageThemes"], &json!({ "enabled": false, "pages": {} })).clone());
    public_json(json!({ "success": true, "data": data }), PUBLIC_SHORT, "db:themes:active")
}

/// `GET /api/themes/{id}`: a preset by slug, else a custom theme by slug or id.
pub async fn theme(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    if let Some(t) = preset(&web.themes, &id) {
        return with_public_cache(Json(json!({ "success": true, "data": t })).into_response(), PUBLIC_MEDIUM);
    }
    let sql = format!(r#"SELECT {} FROM "Theme" WHERE slug = $1 OR id = $1 LIMIT 1"#, db::row_json("Theme"));
    let row = sqlx::query_scalar::<_, String>(&sql)
        .bind(&id)
        .fetch_optional(&state.db)
        .await;
    match row {
        Ok(Some(raw)) => match serde_json::from_str(&raw) {
            Ok(v) => with_key(
                public_json(json!({ "success": true, "data": pages::to_client_row(v) }), PUBLIC_MEDIUM, "db:theme:detail"),
                &format!("db:theme:detail:{id}"),
            ),
            Err(err) => theme_error(&err.into()),
        },
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({ "success": false, "error": "Theme not found" }))).into_response(),
        Err(err) => theme_error(&err.into()),
    }
}

// ── /desktop ───────────────────────────────────────────────────────────────────────────────────────────

/// `cleanUrl`: blank strings become null.
fn clean_url(v: &Value) -> Value {
    match v.as_str() {
        Some(s) if !s.trim().is_empty() => v.clone(),
        _ => Value::Null,
    }
}

/// The JS `.catch(() => [])` on each query: a failing table only empties its bucket.
async fn rows_or_empty(state: &AppState, table: &str, rest: &str) -> Vec<Value> {
    pages::client_rows(&state.db, table, rest).await.unwrap_or_else(|err| {
        log_error("/api/desktop/widgets", &err);
        vec![]
    })
}

/// `toLocaleDateString()` (en-US) for a blog without a date.
fn locale_date(v: &Value) -> Option<String> {
    let s = v.as_str()?;
    let d = chrono::NaiveDate::parse_from_str(s.get(..10)?, "%Y-%m-%d").ok()?;
    use chrono::Datelike;
    Some(format!("{}/{}/{}", d.month(), d.day(), d.year()))
}

/// `GET /api/desktop/widgets`: the mixed feed of the /desktop widgets.
pub async fn desktop_widgets(State(state): State<AppState>) -> Response {
    let (blogs, gallery, projects, deployments) = tokio::join!(
        rows_or_empty(&state, "Blog", r#"WHERE published = true ORDER BY "createdAt" DESC LIMIT 10"#),
        rows_or_empty(&state, "Gallery", r#"ORDER BY "isPinned" DESC, "createdAt" DESC LIMIT 10"#),
        rows_or_empty(&state, "Project", r#"ORDER BY "displayOrder" ASC LIMIT 10"#),
        rows_or_empty(&state, "Deployment", r#"ORDER BY "displayOrder" ASC LIMIT 10"#),
    );
    let id_of = |r: &Value| js_string(or(&r["_id"], &r["id"]));
    let slug_or_id = |r: &Value| js_string(or(&r["slug"], &r["_id"]));

    let blog_items: Vec<Value> = blogs.iter().map(|b| {
        let date = if truthy(&b["date"]) {
            b["date"].clone()
        } else {
            locale_date(&b["createdAt"]).map(Value::from).unwrap_or_else(|| "2026".into())
        };
        let image = match clean_url(&b["socialImage"]) { Value::Null => clean_url(&b["image"]), v => v };
        json!({
            "id": format!("blog-{}", id_of(b)), "type": "blog", "category": "Blogs", "title": b["title"],
            "image": image,
            "excerpt": or(or(&b["excerpt"], &b["seoDescription"]), &json!("Read full article on portfolio.")),
            "date": date, "readTime": "4 min read",
            "tags": if b["tags"].is_array() { b["tags"].clone() } else { json!([]) },
            "url": format!("/blogs/{}", slug_or_id(b)),
        })
    }).collect();

    let image_items: Vec<Value> = gallery.iter().enumerate().filter_map(|(idx, g)| {
        let src = clean_url(&g["src"]);
        if src.is_null() {
            return None;
        }
        Some(json!({
            "id": format!("img-{}", id_of(g)), "type": "image", "category": "Images",
            "title": or(&g["description"], &json!(format!("Portfolio Shot {}", idx + 1))),
            "src": src,
            "description": or(&g["description"], &json!("Portfolio gallery artwork.")),
            "url": src,
            "badge": if truthy(&g["isPinned"]) { "Pinned" } else { "Photo" },
        }))
    }).collect();

    let project_items: Vec<Value> = projects.iter().map(|p| {
        let repo = if p["source"] == "github" && truthy(&p["repoData"]) { Some(&p["repoData"]) } else { None };
        let detail = format!("/projects/{}", slug_or_id(p));
        let url = match repo {
            Some(_) => json!(detail),
            None => or(or(&p["codeLink"], &p["blogLink"]), &json!(detail)).clone(),
        };
        let repo_json = repo.map_or(Value::Null, |r| json!({
            "fullName": or(&r["fullName"], &json!("")), "stars": js_number(&r["stars"]), "forks": js_number(&r["forks"]),
            "language": or(&r["language"], &json!("")), "license": or(&r["license"], &json!("")),
            "pushedAt": or(&r["pushedAt"], &Value::Null), "isArchived": truthy(&r["isArchived"]),
        }));
        json!({
            "id": format!("proj-{}", id_of(p)), "type": "project", "category": "Projects", "title": p["name"],
            "image": clean_url(&p["image"]), "description": p["description"],
            "techStack": if p["techStack"].is_array() { p["techStack"].clone() } else { json!(["React", "Next.js"]) },
            "status": or(&p["status"], &json!("Active")),
            "url": url, "repo": repo_json,
            "hasReadme": p["readme"].as_str().is_some_and(|r| !r.trim().is_empty()),
        })
    }).collect();

    let app_items: Vec<Value> = deployments.iter().map(|d| json!({
        "id": format!("app-{}", id_of(d)), "type": "app", "category": "Apps", "title": d["name"],
        "image": clean_url(&d["image"]), "description": d["description"], "icon": "Code", "appKey": "browser",
        "url": or(or(&d["hostedUrl"], &d["blogLink"]), &json!(format!("/apps/{}", slug_or_id(d)))),
    })).collect();

    // Interleave the buckets for a mixed staggered grid.
    let buckets = [&image_items, &blog_items, &project_items, &app_items];
    let max = buckets.iter().map(|b| b.len()).max().unwrap_or(0);
    let mut items: Vec<Value> = vec![];
    for i in 0..max {
        for b in buckets {
            if let Some(x) = b.get(i) {
                items.push(x.clone());
            }
        }
    }
    if deployments.len() < 3 {
        items.extend([
            json!({ "id": "app-vscode", "type": "app", "category": "Apps", "title": "Visual Studio Code",
                "description": "Web-based source editor with multi-file tabs & syntax highlighting.", "icon": "Code", "appKey": "code", "url": "/desktop" }),
            json!({ "id": "app-terminal", "type": "app", "category": "Apps", "title": "Terminal & Powershell",
                "description": "Interactive CLI terminal supporting system commands.", "icon": "Terminal", "appKey": "terminal", "url": "/desktop" }),
            json!({ "id": "app-explorer", "type": "app", "category": "Apps", "title": "File Explorer",
                "description": "Browse virtual system files, images & documents.", "icon": "Folder", "appKey": "explorer", "url": "/desktop" }),
        ]);
    }
    items.extend([
        json!({ "id": "skill-agentic", "type": "skill", "category": "AI Skills", "title": "AI Pair Programming & Multi-Agent Workflows",
            "description": "Multi-agent orchestration, CodeGraph indexing, tool calling & autonomous execution.", "level": "Expert",
            "icon": "Bot", "tags": ["Agents", "LLM", "CodeGraph", "MCP"], "url": "/about" }),
        json!({ "id": "skill-next16", "type": "skill", "category": "AI Skills", "title": "Fullstack Next.js 16 & React 19",
            "description": "App Router architecture, React Server Components, streaming SSR & PostgreSQL Prisma.", "level": "Advanced",
            "icon": "Cpu", "tags": ["Next.js 16", "React 19", "Prisma", "Tailwind 4"], "url": "/about" }),
        json!({ "id": "skill-motion", "type": "skill", "category": "AI Skills", "title": "GSAP Motion & Physical UI Polish",
            "description": "GPU-accelerated layout transitions, spring physics, glassmorphism & fluid responsiveness.", "level": "Expert",
            "icon": "Zap", "tags": ["GSAP", "Framer Motion", "Tailwind 4"], "url": "/about" }),
    ]);
    medium(json!({ "success": true, "items": items }))
}

/// Files the /desktop code editor may show (ALLOWLIST in src/app/api/desktop/source/route.js). A request must
/// match an entry exactly before the filesystem is touched, so there is no traversal surface.
const SOURCE_ALLOWLIST: &[&str] = &[
    "web/src/routes/desktop.tsx",
    "server/src/web.rs",
    "src/app/components/desktop/Desktop.js",
    "src/app/components/desktop/Window.js",
    "src/app/components/desktop/Taskbar.js",
    "src/app/components/desktop/StartMenu.js",
    "src/app/components/desktop/apps/FileExplorer.js",
    "src/app/components/desktop/apps/CodeEditor.js",
    "src/app/components/desktop/apps/Browser.js",
    "src/app/components/desktop/apps/Settings.js",
    "src/app/components/desktop/apps/AboutThisPC.js",
    "src/app/api/desktop/source/route.js",
    "src/app/api/config/route.js",
    "prisma/schema.prisma",
    "package.json",
    "next.config.mjs",
];

/// `localeCompare` for the file names here (ASCII): case-insensitive first, lowercase before uppercase on ties.
fn locale_cmp(a: &str, b: &str) -> Ordering {
    // ICU root order: whitespace, punctuation, symbols, digits, letters.
    let rank = |c: char| match c {
        c if c.is_whitespace() => 0,
        c if c.is_ascii_punctuation() && !"`^¨+<=>|~$".contains(c) => 1,
        c if c.is_ascii_punctuation() => 2,
        c if c.is_ascii_digit() => 3,
        _ => 4,
    };
    let key = |s: &str| s.chars().map(|c| (rank(c), c.to_lowercase().next().unwrap_or(c))).collect::<Vec<_>>();
    key(a).cmp(&key(b)).then_with(|| {
        let tert = |s: &str| s.chars().map(|c| c.is_uppercase()).collect::<Vec<_>>();
        tert(a).cmp(&tert(b))
    })
}

/// `buildTree`: nested `{ name, path, type, children }`, directories first, then by name.
fn source_tree(paths: &[&str]) -> Value {
    #[derive(Default)]
    struct Node {
        children: Vec<(String, Node)>,
        path: Option<String>,
    }
    let mut root = Node::default();
    for rel in paths {
        let parts: Vec<&str> = rel.split('/').collect();
        let mut node = &mut root;
        for (i, part) in parts.iter().enumerate() {
            let pos = match node.children.iter().position(|(n, _)| n == part) {
                Some(p) => p,
                None => {
                    let path = (i == parts.len() - 1).then(|| (*rel).to_string());
                    node.children.push(((*part).to_string(), Node { children: vec![], path }));
                    node.children.len() - 1
                }
            };
            node = &mut node.children[pos].1;
        }
    }
    fn to_array(node: &Node) -> Vec<Value> {
        let mut out: Vec<(bool, &str, Value)> = node.children.iter().map(|(name, child)| {
            let v = match &child.path {
                Some(p) => json!({ "name": name, "path": p, "type": "file" }),
                None => json!({ "name": name, "type": "dir", "children": to_array(child) }),
            };
            (child.path.is_none(), name.as_str(), v)
        }).collect();
        out.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| locale_cmp(a.1, b.1)));
        out.into_iter().map(|x| x.2).collect()
    }
    Value::Array(to_array(&root))
}

/// `GET /api/desktop/source`: the file tree, or `?path=` one allowlisted file.
pub async fn desktop_source(RawQuery(q): RawQuery) -> Response {
    let params = crate::api::query_map(&q);
    let requested = params.get("path").filter(|p| !p.is_empty());
    let Some(requested) = requested else {
        return medium(json!({ "tree": source_tree(SOURCE_ALLOWLIST) }));
    };
    if !SOURCE_ALLOWLIST.contains(&requested.as_str()) {
        return error(StatusCode::NOT_FOUND, "File not available");
    }
    match tokio::fs::read_to_string(requested).await {
        Ok(content) => {
            let ext = std::path::Path::new(requested).extension().and_then(|e| e.to_str()).unwrap_or("");
            let language = match ext {
                "js" | "jsx" | "mjs" => "javascript",
                "ts" | "tsx" => "typescript",
                "json" => "json",
                "prisma" => "prisma",
                "md" => "markdown",
                "css" => "css",
                _ => "text",
            };
            let lines = content.split('\n').count();
            medium(json!({ "path": requested, "language": language, "content": content, "readOnly": true, "lines": lines }))
        }
        // A trimmed build may not ship the sources.
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Source not available in this build", "path": requested, "readOnly": true })),
        )
            .into_response(),
    }
}

// ── global search ──────────────────────────────────────────────────────────────────────────────────────

/// `GET /api/global-search?q=`
pub async fn global_search(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let params = crate::api::query_map(&q);
    let query = params.get("q").map(|s| s.trim().to_string()).unwrap_or_default();
    if query.is_empty() {
        return with_public_cache(Json(json!({ "results": [] })).into_response(), PUBLIC_SHORT);
    }
    match search(&state, &query).await {
        Ok(results) => with_key(
            public_json(json!({ "results": results }), PUBLIC_SHORT, "db:search"),
            &format!("db:search:{}", query.to_lowercase()),
        ),
        Err(err) => {
            log_error("/api/global-search", &err);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Internal Server Error", "results": [] }))).into_response()
        }
    }
}

/// Words that carry no meaning in a search (the common ones Postgres's English dictionary dropped).
const STOP_WORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how", "i", "in", "is", "it", "its", "my", "no",
    "not", "of", "on", "or", "so", "such", "that", "the", "their", "then", "there", "these", "they", "this", "to", "was",
    "what", "when", "where", "which", "who", "will", "with",
];

/// A search box query as an FTS5 expression, read like Postgres's `websearch_to_tsquery`: all words, `"a phrase"`,
/// `or`, `-word`. Every term is quoted, so nothing the visitor types is FTS5 syntax. None when nothing is asked for.
fn fts_query(query: &str) -> Option<String> {
    let (mut any, mut none): (Vec<Vec<String>>, Vec<String>) = (vec![vec![]], vec![]);
    // Odd pieces are inside quotes.
    for (index, piece) in query.split('"').enumerate() {
        let quoted = index % 2 == 1;
        let terms: Vec<&str> = if quoted { vec![piece] } else { piece.split_whitespace().collect() };
        for term in terms {
            let negated = !quoted && term.starts_with('-');
            let words: Vec<&str> = term.split(|c: char| !c.is_alphanumeric()).filter(|w| !w.is_empty()).collect();
            if words.is_empty() {
                continue;
            }
            if !quoted && term.eq_ignore_ascii_case("or") {
                any.push(vec![]);
                continue;
            }
            if !quoted && words.len() == 1 && STOP_WORDS.contains(&words[0].to_lowercase().as_str()) {
                continue;
            }
            let phrase = format!("\"{}\"", words.join(" "));
            if negated {
                none.push(phrase);
            } else if let Some(group) = any.last_mut() {
                group.push(phrase);
            }
        }
    }
    let groups: Vec<String> = any.into_iter().filter(|g| !g.is_empty()).map(|g| g.join(" AND ")).collect();
    if groups.is_empty() {
        return None;
    }
    let mut expression = format!("({})", groups.join(" OR "));
    for phrase in none {
        expression.push_str(&format!(" NOT {phrase}"));
    }
    Some(expression)
}

async fn search(state: &AppState, query: &str) -> anyhow::Result<Vec<Value>> {
    // `new RegExp(escapeRegex(q), 'i')`: a literal, case-insensitive substring test.
    let needle = query.to_lowercase();
    let matches = |v: &Value| js_string(v).to_lowercase().contains(&needle);
    let pattern = db::like(query);
    let now_iso = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    let blog_sql = r#"SELECT json_object('id', b.id, 'title', b.title, 'content', b.content, 'date', b.date, 'slug', b.slug)
        FROM "BlogSearch" JOIN "Blog" b ON b.id = "BlogSearch".id
        WHERE "BlogSearch" MATCH $1 AND b.published
        ORDER BY bm25("BlogSearch", 0.0, 10.0, 4.0, 1.0), b."createdAt" DESC LIMIT 12"#;
    let project_sql = r#"SELECT json_object('id', id, 'name', name, 'slug', slug, 'description', description, 'year', year) FROM "Project"
        WHERE name LIKE $1 ESCAPE '\' OR description LIKE $1 ESCAPE '\'
           OR (SELECT group_concat(value, ' ') FROM json_each("techStack")) LIKE $1 ESCAPE '\'
        ORDER BY "displayOrder" ASC, year DESC LIMIT 12"#;
    let deployment_sql = r#"SELECT json_object('id', id, 'name', name, 'slug', slug, 'description', description,
            'hostingProvider', "hostingProvider", 'environment', environment) FROM "Deployment"
        WHERE name LIKE $1 ESCAPE '\' OR description LIKE $1 ESCAPE '\'
           OR (SELECT group_concat(value, ' ') FROM json_each("techStack")) LIKE $1 ESCAPE '\'
           OR "hostingProvider" LIKE $1 ESCAPE '\' OR "appType" LIKE $1 ESCAPE '\' OR environment LIKE $1 ESCAPE '\'
        ORDER BY "displayOrder" ASC, "updatedAt" DESC LIMIT 10"#;
    let fetch = |sql: &'static str, bind: String| {
        let db = state.db.clone();
        async move {
            let rows: Vec<String> = sqlx::query_scalar(sql).bind(bind).fetch_all(&db).await?;
            rows.iter().map(|r| Ok(pages::to_client_row(serde_json::from_str(r)?))).collect::<anyhow::Result<Vec<Value>>>()
        }
    };
    let (blogs, projects, deployments, home, about) = tokio::join!(
        async {
            match fts_query(query) {
                Some(expression) => fetch(blog_sql, expression).await,
                None => Ok(vec![]),
            }
        },
        fetch(project_sql, pattern.clone()),
        fetch(deployment_sql, pattern.clone()),
        pages::try_singleton(&state.db, "Home", false),
        pages::try_singleton(&state.db, "About", false),
    );
    let (blogs, projects, deployments, home, about) = (blogs?, projects?, deployments?, home?, about?);

    let excerpt = |v: &Value| match v.as_str() {
        Some(s) if !s.is_empty() => format!("{}...", js_substring(s, 100)),
        _ => String::new(),
    };
    let mut results: Vec<Value> = vec![];
    for b in &blogs {
        let slug = pages::entity_slug(&json!({ "_id": b["_id"], "slug": b["slug"], "name": b["title"] }), "blog");
        results.push(json!({ "type": "blog", "title": b["title"], "description": excerpt(&b["content"]), "path": format!("/blogs/{slug}"), "date": b["date"] }));
    }
    for p in &projects {
        results.push(json!({ "type": "project", "title": p["name"], "description": excerpt(&p["description"]),
            "path": format!("/projects/{}", pages::entity_slug(p, "project")), "date": p["year"] }));
    }
    for d in &deployments {
        let env = if truthy(&d["environment"]) { format!("• {}", js_string(&d["environment"])) } else { String::new() };
        let provider = if truthy(&d["hostingProvider"]) { js_string(&d["hostingProvider"]) } else { "Hosted".into() };
        results.push(json!({ "type": "page", "title": d["name"], "description": format!("{provider} {env}").trim(),
            "path": format!("/apps/{}", pages::entity_slug(d, "app")), "date": now_iso }));
    }
    let any = |v: &Value, f: &dyn Fn(&Value) -> bool| v.as_array().is_some_and(|a| a.iter().any(f));
    // `isMatch(text)`: falsy text never matches.
    let is_match = |v: &Value| truthy(v) && matches(v);

    let home_hit = !home.is_null()
        && (matches(or(&home["name"], &json!(""))) || any(&home["homeRoles"], &matches) || any(&home["codeSnippets"], &matches));
    if home_hit {
        let first_role = home["homeRoles"].get(0).filter(|r| truthy(r)).map(js_string).unwrap_or_default();
        let name = if home.get("name").is_some() { js_string(&home["name"]) } else { "undefined".into() };
        results.push(json!({ "type": "page", "title": "Home", "description": format!("Home content: {name} - {first_role}..."), "path": "/", "date": now_iso }));
    }

    let exp_hit = |e: &Value| matches(or(&e["company"], &json!(""))) || matches(or(&e["role"], &json!("")));
    let skill_hit = |s: &Value| matches(or(&s["name"], &json!("")));
    let about_hit = !about.is_null()
        && (matches(or(&about["name"], &json!("")))
            || matches(or(&about["professionalSummary"], &json!("")))
            || any(&about["experiences"], &exp_hit)
            || any(&about["skills"], &skill_hit));
    if about_hit {
        let a = &about;
        let summary = || match a["professionalSummary"].as_str() {
            Some(s) if !s.is_empty() => format!("{}...", js_substring(s, 100)),
            _ => format!("About {}", if a.get("name").is_some() { js_string(&a["name"]) } else { "undefined".into() }),
        };
        let mut hits = vec![];
        if is_match(&a["name"]) || is_match(&a["professionalSummary"]) {
            hits.push(json!({ "type": "page", "title": "About - Summary", "description": summary(), "path": "/about-me#summary", "date": now_iso }));
        }
        if any(&a["experiences"], &|e: &Value| is_match(&e["company"]) || is_match(&e["role"])) {
            hits.push(json!({ "type": "page", "title": "About - Experience", "description": "Professional experience and roles.", "path": "/about-me#experience", "date": now_iso }));
        }
        if any(&a["skills"], &|s: &Value| is_match(&s["name"])) {
            hits.push(json!({ "type": "page", "title": "About - Skills", "description": "Technical skills and proficiencies.", "path": "/about-me#skills", "date": now_iso }));
        }
        if hits.is_empty() {
            hits.push(json!({ "type": "page", "title": "About", "description": summary(), "path": "/about-me", "date": now_iso }));
        }
        results.extend(hits);
    }
    // `(b.date || '').localeCompare(a.date || '')`: newest-looking first, stable.
    results.sort_by(|a, b| locale_cmp(&str_or_empty(&b["date"]), &str_or_empty(&a["date"])));
    Ok(results)
}

// ── /.well-known ───────────────────────────────────────────────────────────────────────────────────────

const DISCOVERY_CACHE: &str = "public, max-age=300, s-maxage=300";

fn discovery_json(value: &Value, content_type: Option<&'static str>) -> Response {
    let mut res = Json(value).into_response();
    let h = res.headers_mut();
    if let Some(t) = content_type {
        h.insert(header::CONTENT_TYPE, HeaderValue::from_static(t));
    }
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static(DISCOVERY_CACHE));
    res
}

macro_rules! discovery_doc {
    ($name:ident, $key:literal, $type:expr) => {
        pub async fn $name(State(state): State<AppState>) -> Response {
            match state.web.clone() {
                Some(web) => discovery_json(&web.discovery[$key], $type),
                None => crate::web::unavailable(),
            }
        }
    };
}

discovery_doc!(api_catalog, "apiCatalog", Some("application/linkset+json; charset=utf-8"));
discovery_doc!(openapi, "openapi", Some("application/openapi+json; charset=utf-8"));
discovery_doc!(oauth_metadata, "oauth", None);
discovery_doc!(protected_resource, "protectedResource", None);
discovery_doc!(jwks, "jwks", None);
discovery_doc!(skills_index, "skillsIndex", None);

/// `GET /.well-known/agent-skills/{skill}/SKILL.md`
pub async fn skill_md(State(state): State<AppState>, Path(skill): Path<String>) -> Response {
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    match web.discovery["skills"].get(&skill).and_then(Value::as_str) {
        Some(md) => (
            [(header::CONTENT_TYPE, "text/markdown; charset=utf-8"), (header::CACHE_CONTROL, DISCOVERY_CACHE)],
            md.to_string(),
        )
            .into_response(),
        None => (StatusCode::NOT_FOUND, [(header::CONTENT_TYPE, "text/plain; charset=utf-8")], "Not found").into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn substring_counts_utf16_units() {
        assert_eq!(js_substring("ab😀cd", 3), "ab");
        assert_eq!(js_substring("ab😀cd", 4), "ab😀");
    }

    #[test]
    fn locale_order_is_case_insensitive() {
        assert_eq!(locale_cmp("apps", "Browser.js"), Ordering::Less);
        assert_eq!(locale_cmp("a", "A"), Ordering::Less);
        assert_eq!(locale_cmp("2026", "2025-12-01"), Ordering::Greater);
    }

    #[test]
    fn searches_become_safe_fts_expressions() {
        for (query, want) in [
            ("rust async", Some(r#"("rust" AND "async")"#)),
            ("the \"borrow checker\" or lifetimes -unsafe", Some(r#"("borrow checker" OR "lifetimes") NOT "unsafe""#)),
            ("c++ node.js", Some(r#"("c" AND "node js")"#)),
            ("NEAR(a b) col:x *", Some(r#"("NEAR a" AND "b" AND "col x")"#)),
            ("-only", None),
            ("the", None),
            ("\" * ( )", None),
        ] {
            assert_eq!(fts_query(query).as_deref(), want, "{query}");
        }
    }
}
