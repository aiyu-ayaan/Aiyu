//! More public `/api/*` reads ported from src/app/api, plus the `/.well-known/*` discovery documents:
//! themes, the /desktop widgets and source browser, global search, agent discovery and the MCP server card.
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

/// `GET /.well-known/mcp/server-card.json`: `buildMcpServerCard(getMcpConfig())`.
pub async fn mcp_server_card(State(state): State<AppState>) -> Response {
    let Some(web) = state.web.clone() else { return crate::web::unavailable() };
    // getMcpConfig never throws: a database error serves the defaults.
    let stored = pages::try_singleton(&state.db, "McpConfig", true).await.unwrap_or_else(|err| {
        tracing::warn!(error = %err, "mcp config read failed, using defaults");
        Value::Null
    });
    let card = mcp_card(&stored, &web.discovery["mcpDefaults"], &crate::web::site_url());
    discovery_json(&card, None)
}

fn as_object(v: &Value) -> Map<String, Value> {
    v.as_object().cloned().unwrap_or_default()
}

fn as_array(v: &Value) -> Vec<Value> {
    v.as_array().cloned().unwrap_or_default()
}

/// `{ ...defaults, ...stored }`
fn merged(defaults: &Value, stored: &Value) -> Map<String, Value> {
    let mut out = as_object(defaults);
    out.extend(as_object(stored));
    out
}

/// `mergeMcpConfig(stored)`: the shape the admin editor saves. `defaults` is DEFAULT_MCP_CONFIG.
pub fn merge_mcp_config(stored: &Value, defaults: &Value) -> Value {
    let data = as_object(stored);
    let get = |v: &Value, key: &str| v.get(key).cloned().unwrap_or(Value::Null);
    // `String(v || '')`
    let text = |v: &Value, key: &str| str_or_empty(&get(v, key));
    let flag = |v: &Value, key: &str| truthy(&get(v, key));
    // `v.enabled !== false`
    let on = |v: &Value| get(v, "enabled") != Value::Bool(false);
    let list = |key: &str| if data.contains_key(key) { as_array(&data[key]) } else { as_array(&defaults[key]) };
    let own = |key: &str| as_array(data.get(key).unwrap_or(&Value::Null));
    let section = |key: &str| data.get(key).cloned().unwrap_or(Value::Null);

    let capabilities: Map<String, Value> = ["tools", "resources", "prompts", "logging", "completions"]
        .iter()
        .map(|&k| (k.to_string(), Value::Object(merged(&defaults["capabilities"][k], &get(&section("capabilities"), k)))))
        .collect();
    let tools: Vec<Value> = list("tools")
        .iter()
        .map(|t| {
            let ann = get(t, "annotations");
            json!({
                "name": text(t, "name"), "title": text(t, "title"), "description": text(t, "description"), "enabled": on(t),
                "inputSchema": get(t, "inputSchema").as_str().unwrap_or(""),
                "annotations": {
                    "readOnlyHint": flag(&ann, "readOnlyHint"), "destructiveHint": flag(&ann, "destructiveHint"),
                    "idempotentHint": flag(&ann, "idempotentHint"), "openWorldHint": flag(&ann, "openWorldHint"),
                },
            })
        })
        .collect();
    let transports: Vec<Value> = list("transports")
        .iter()
        .map(|t| {
            let kind = text(t, "type");
            let kind = if kind.is_empty() { "webmcp".to_string() } else { kind };
            json!({ "type": kind, "endpoint": text(t, "endpoint"), "description": text(t, "description") })
        })
        .collect();
    let resources: Vec<Value> = own("resources")
        .iter()
        .map(|r| {
            json!({
                "uri": text(r, "uri"), "name": text(r, "name"), "title": text(r, "title"),
                "description": text(r, "description"), "mimeType": text(r, "mimeType"), "enabled": on(r),
            })
        })
        .collect();
    let prompts: Vec<Value> = own("prompts")
        .iter()
        .map(|p| {
            let arguments: Vec<Value> = as_array(&get(p, "arguments"))
                .iter()
                .map(|a| json!({ "name": text(a, "name"), "description": text(a, "description"), "required": flag(a, "required") }))
                .collect();
            json!({ "name": text(p, "name"), "title": text(p, "title"), "description": text(p, "description"), "enabled": on(p), "arguments": arguments })
        })
        .collect();
    let links: Vec<Value> = list("links").iter().map(|l| json!({ "name": text(l, "name"), "url": text(l, "url") })).collect();

    json!({
        "enabled": on(stored),
        "server": merged(&defaults["server"], &section("server")),
        "transports": transports,
        "capabilities": capabilities,
        "tools": tools,
        "resources": resources,
        "prompts": prompts,
        "links": links,
        // Write access stays off unless switched on.
        "write": { "enabled": section("write")["enabled"] == Value::Bool(true) },
    })
}

/// `buildMcpServerCard(mergeMcpConfig(stored))` from src/lib/mcpConfig.js. `defaults` is DEFAULT_MCP_CONFIG,
/// `base` is the site URL. Every tool `/api/mcp` serves is listed after the configured ones.
pub fn mcp_card(stored: &Value, defaults: &Value, base: &str) -> Value {
    let data = as_object(stored);
    let pick = |key: &str| if data.contains_key(key) { as_array(&data[key]) } else { as_array(&defaults[key]) };
    let resolve = |v: &Value| -> String {
        let v = str_or_empty(v);
        if v.is_empty() {
            return v;
        }
        let scheme = v.split_once(':').is_some_and(|(s, _)| {
            let mut c = s.chars();
            c.next().is_some_and(|f| f.is_ascii_alphabetic()) && c.all(|x| x.is_ascii_alphanumeric() || "+.-".contains(x))
        });
        if scheme {
            return v;
        }
        // toAbsoluteSiteUrl
        let t = v.trim();
        if t.is_empty() { base.to_string() } else if t.starts_with('/') { format!("{base}{t}") } else { format!("{base}/{t}") }
    };
    let caps = as_object(&data.get("capabilities").cloned().unwrap_or(Value::Null));
    let cap = |k: &str| merged(&defaults["capabilities"][k], caps.get(k).unwrap_or(&Value::Null));
    let flag = |m: &Map<String, Value>, k: &str| m.get(k).is_some_and(truthy);
    let server = merged(&defaults["server"], data.get("server").unwrap_or(&Value::Null));
    let sv = |k: &str| server.get(k).cloned().unwrap_or(Value::Null);

    let mut server_info = Map::new();
    server_info.insert("name".into(), sv("name"));
    server_info.insert("version".into(), sv("version"));
    for k in ["title", "description"] {
        if truthy(&sv(k)) {
            server_info.insert(k.into(), sv(k));
        }
    }
    if truthy(&sv("websiteUrl")) {
        server_info.insert("websiteUrl".into(), resolve(&sv("websiteUrl")).into());
    }

    let mut capabilities = Map::new();
    let tools_cap = cap("tools");
    if flag(&tools_cap, "enabled") {
        let mut tools: Vec<Value> = vec![];
        for t in pick("tools") {
            let t = as_object(&t);
            let enabled = t.get("enabled") != Some(&Value::Bool(false));
            let name = str_or_empty(t.get("name").unwrap_or(&Value::Null));
            if !enabled || name.is_empty() {
                continue;
            }
            let mut out = Map::new();
            out.insert("name".into(), name.into());
            for k in ["title", "description"] {
                let v = str_or_empty(t.get(k).unwrap_or(&Value::Null));
                if !v.is_empty() {
                    out.insert(k.into(), v.into());
                }
            }
            if let Some(schema) = t.get("inputSchema").and_then(Value::as_str).filter(|s| !s.trim().is_empty()) {
                if let Ok(parsed @ (Value::Object(_) | Value::Array(_))) = serde_json::from_str::<Value>(schema) {
                    out.insert("inputSchema".into(), parsed);
                }
            }
            let ann = as_object(t.get("annotations").unwrap_or(&Value::Null));
            let mut annotations = Map::new();
            for k in ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"] {
                if flag(&ann, k) {
                    annotations.insert(k.into(), true.into());
                }
            }
            if !annotations.is_empty() {
                out.insert("annotations".into(), Value::Object(annotations));
            }
            tools.push(Value::Object(out));
        }
        let names: Vec<Value> = tools.iter().map(|t| t["name"].clone()).collect();
        tools.extend(crate::mcp::read_tool_schemas().into_iter().filter(|t| !names.contains(&t["name"])));
        capabilities.insert("tools".into(), json!({ "listChanged": flag(&tools_cap, "listChanged"), "tools": tools }));
    }
    let res_cap = cap("resources");
    if flag(&res_cap, "enabled") {
        let resources: Vec<Value> = as_array(data.get("resources").unwrap_or(&Value::Null)).iter().filter_map(|r| {
            let r = as_object(r);
            let s = |k: &str| str_or_empty(r.get(k).unwrap_or(&Value::Null));
            if r.get("enabled") == Some(&Value::Bool(false)) || s("uri").is_empty() {
                return None;
            }
            let mut out = Map::new();
            out.insert("uri".into(), resolve(&s("uri").into()).into());
            out.insert("name".into(), if s("name").is_empty() { s("uri") } else { s("name") }.into());
            for k in ["title", "description", "mimeType"] {
                if !s(k).is_empty() {
                    out.insert(k.into(), s(k).into());
                }
            }
            Some(Value::Object(out))
        }).collect();
        let mut c = Map::new();
        c.insert("subscribe".into(), flag(&res_cap, "subscribe").into());
        c.insert("listChanged".into(), flag(&res_cap, "listChanged").into());
        if !resources.is_empty() {
            c.insert("resources".into(), resources.into());
        }
        capabilities.insert("resources".into(), Value::Object(c));
    }
    let prompt_cap = cap("prompts");
    if flag(&prompt_cap, "enabled") {
        let prompts: Vec<Value> = as_array(data.get("prompts").unwrap_or(&Value::Null)).iter().filter_map(|p| {
            let p = as_object(p);
            let s = |k: &str| str_or_empty(p.get(k).unwrap_or(&Value::Null));
            if p.get("enabled") == Some(&Value::Bool(false)) || s("name").is_empty() {
                return None;
            }
            let mut out = Map::new();
            out.insert("name".into(), s("name").into());
            for k in ["title", "description"] {
                if !s(k).is_empty() {
                    out.insert(k.into(), s(k).into());
                }
            }
            let args: Vec<Value> = as_array(p.get("arguments").unwrap_or(&Value::Null)).iter().map(|a| {
                let a = as_object(a);
                let mut arg = Map::new();
                arg.insert("name".into(), str_or_empty(a.get("name").unwrap_or(&Value::Null)).into());
                let d = str_or_empty(a.get("description").unwrap_or(&Value::Null));
                if !d.is_empty() {
                    arg.insert("description".into(), d.into());
                }
                if flag(&a, "required") {
                    arg.insert("required".into(), true.into());
                }
                Value::Object(arg)
            }).collect();
            if !args.is_empty() {
                out.insert("arguments".into(), args.into());
            }
            Some(Value::Object(out))
        }).collect();
        let mut c = Map::new();
        c.insert("listChanged".into(), flag(&prompt_cap, "listChanged").into());
        if !prompts.is_empty() {
            c.insert("prompts".into(), prompts.into());
        }
        capabilities.insert("prompts".into(), Value::Object(c));
    }
    for k in ["logging", "completions"] {
        if flag(&cap(k), "enabled") {
            capabilities.insert(k.into(), json!({}));
        }
    }

    let mut links = Map::new();
    for l in pick("links") {
        let l = as_object(&l);
        let (name, url) = (str_or_empty(l.get("name").unwrap_or(&Value::Null)), str_or_empty(l.get("url").unwrap_or(&Value::Null)));
        if !name.is_empty() && !url.is_empty() {
            links.insert(name, resolve(&url.into()).into());
        }
    }
    let transports: Vec<Value> = pick("transports").iter().filter_map(|t| {
        let t = as_object(t);
        let s = |k: &str| str_or_empty(t.get(k).unwrap_or(&Value::Null));
        // mergeTransport defaults a missing type to "webmcp".
        let kind = if s("type").is_empty() { "webmcp".to_string() } else { s("type") };
        let mut out = Map::new();
        out.insert("type".into(), kind.into());
        out.insert("endpoint".into(), resolve(&s("endpoint").into()).into());
        if !s("description").is_empty() {
            out.insert("description".into(), s("description").into());
        }
        Some(Value::Object(out))
    }).collect();

    let mut card = Map::new();
    card.insert("serverInfo".into(), Value::Object(server_info));
    card.insert("transports".into(), transports.into());
    card.insert("capabilities".into(), Value::Object(capabilities));
    card.insert("links".into(), Value::Object(links));
    if truthy(&sv("instructions")) {
        card.insert("instructions".into(), sv("instructions"));
    }
    Value::Object(card)
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

    #[test]
    fn mcp_card_resolves_relative_urls() {
        let defaults = json!({
            "server": { "name": "aiyu", "version": "1.0.0", "title": "", "description": "", "websiteUrl": "", "instructions": "" },
            "transports": [{ "type": "streamable-http", "endpoint": "/api/mcp", "description": "x" }],
            "capabilities": { "tools": { "enabled": true }, "resources": { "enabled": false }, "prompts": { "enabled": false },
                "logging": { "enabled": false }, "completions": { "enabled": false } },
            "tools": [], "links": [{ "name": "docs", "url": "/docs/api" }, { "name": "ext", "url": "https://x.dev" }],
        });
        let card = mcp_card(&Value::Null, &defaults, "https://s.io");
        assert_eq!(card["transports"][0]["endpoint"], "https://s.io/api/mcp");
        assert_eq!(card["links"]["docs"], "https://s.io/docs/api");
        assert_eq!(card["links"]["ext"], "https://x.dev");
        let tools = card["capabilities"]["tools"]["tools"].as_array().unwrap();
        assert!(tools.iter().any(|t| t["name"] == "search_portfolio"));
    }
}
