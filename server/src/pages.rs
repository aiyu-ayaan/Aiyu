//! Data for the public pages served by the Vite app, in the same shapes the Next data fetchers return
//! (src/lib/dataFetchers.js), so the shared React views render the same output.

use regex::Regex;
use serde_json::{Map, Value, json};
use crate::db::{Db, Stamp, row_json};
use std::sync::LazyLock;

use crate::AppState;

/// Ported to Rust from the public config whitelist in src/lib/dataFetchers.js (CONFIG_PUBLIC_SELECT).
const PUBLIC_CONFIG_KEYS: &[&str] = &[
    "siteTitle", "siteDescription", "logoText", "ogImage", "profession", "authorName", "googleAnalyticsId", "resume",
    "contactLocation", "contactEmail", "contactStatus", "footerText", "footerText2", "showWorkStatus", "workStatus",
    "footerVersion", "footerVersionLink", "terminal", "blogsTitle", "blogsSubtitle", "isBlogAutomated",
    "blogAutomationMessage", "showBlogViewCount", "projectsTitle", "projectsSubtitle", "galleryTitle", "gallerySubtitle",
];

/// `sanitizeConfigForPublic`, minus the resume file body: the uploaded PDF (base64, ~335 KB) is served by
/// /api/resume and never needs to reach the browser.
pub async fn public_config(db: &Db, base_url: &str) -> Value {
    let row: Option<String> = sqlx::query_scalar(r#"SELECT data FROM "Config" LIMIT 1"#).fetch_optional(db).await.unwrap_or(None);
    let mut data = match row.and_then(|r| serde_json::from_str(&r).ok()) {
        Some(Value::Object(data)) => data,
        _ => Map::new(),
    };
    let mut c: Map<String, Value> = PUBLIC_CONFIG_KEYS.iter().filter_map(|k| data.remove(*k).map(|v| (k.to_string(), v))).collect();
    // No public key stored: the same defaults as no row.
    if c.is_empty() {
        return json!({ "siteTitle": "Portfolio", "logoText": "< aiyu />", "profession": "full stack", "hasCustomFavicon": false });
    }
    c.insert("favicon".into(), data.remove("favicon").unwrap_or(Value::Null));
    let fav = c.remove("favicon").unwrap_or(Value::Null);
    let has_favicon = ["value", "filename", "mimeType"]
        .iter()
        .any(|k| fav.get(*k).and_then(Value::as_str).is_some_and(|v| !v.is_empty()));
    if fav.is_object() {
        c.insert(
            "favicon".into(),
            json!({ "filename": fav.get("filename").cloned().unwrap_or("".into()), "mimeType": fav.get("mimeType").cloned().unwrap_or("".into()) }),
        );
    }
    if let Some(Value::String(og)) = c.get("ogImage") {
        let og = og.trim();
        if !og.is_empty() {
            let abs = absolute(base_url, og);
            c.insert("ogImage".into(), abs.into());
        }
    }
    if let Some(Value::Object(resume)) = c.get_mut("resume") {
        if resume.get("type").and_then(Value::as_str) == Some("file") && resume.get("value").is_some_and(|v| !v.is_null()) {
            resume.insert("value".into(), "/api/resume".into());
        }
    }
    c.insert("hasCustomFavicon".into(), has_favicon.into());
    Value::Object(c)
}

/// `getLayoutData` for the v2 chrome: header, socials, public config, about name, package version.
pub async fn shell_data(state: &AppState, config: &Value) -> Value {
    let db = &state.db;
    let header = singleton(db, "Header", false).await;
    let socials = client_rows(db, "Social", "").await.unwrap_or_default();
    let about_name = singleton(db, "About", false).await.get("name").and_then(Value::as_str).map(str::to_string);
    json!({
        "header": header,
        "socials": socials,
        "config": config,
        "aboutName": about_name,
        "packageVersion": state.package_version,
    })
}

/// Timestamp columns end in `At` (createdAt, updatedAt, syncedAt, ...), except a cron's `lastRun` and `nextRun`.
fn normalize_timestamps(row: &mut Map<String, Value>) {
    for (k, v) in row.iter_mut() {
        if k.ends_with("At") || k == "lastRun" || k == "nextRun" {
            crate::export::normalize_timestamp_value(v);
        }
    }
}

/// `getSingleton(prisma, key)` for a json-blob model: `{ ...data, _id }` (+ timestamps when the model has them).
/// `table` is always a constant from this crate.
pub async fn singleton(db: &Db, table: &str, timestamps: bool) -> Value {
    try_singleton(db, table, timestamps).await.unwrap_or(Value::Null)
}

/// `singleton`, with database errors reported (the API answers 500 on those, pages render without the data).
pub async fn try_singleton(db: &Db, table: &str, timestamps: bool) -> anyhow::Result<Value> {
    let sql = format!(r#"SELECT {} FROM "{table}" LIMIT 1"#, row_json(table));
    let Some(raw) = sqlx::query_scalar::<_, String>(&sql).fetch_optional(db).await? else { return Ok(Value::Null) };
    let Value::Object(mut row) = serde_json::from_str::<Value>(&raw)? else { return Ok(Value::Null) };
    normalize_timestamps(&mut row);
    let mut out = match row.remove("data") {
        Some(Value::Object(d)) => d,
        _ => Map::new(),
    };
    out.insert("_id".into(), row.remove("id").unwrap_or(Value::Null));
    if timestamps {
        for k in ["createdAt", "updatedAt"] {
            out.insert(k.into(), row.remove(k).unwrap_or(Value::Null));
        }
    }
    Ok(Value::Object(out))
}

/// `toClientList(key, rows)` for a relational model: `id` becomes `_id` (first), other columns as-is.
/// `table` and `rest` (WHERE/ORDER BY) are always constants from this crate.
pub async fn client_rows(db: &Db, table: &str, rest: &str) -> anyhow::Result<Vec<Value>> {
    let sql = format!(r#"SELECT {} FROM "{table}" {rest}"#, row_json(table));
    let rows: Vec<String> = sqlx::query_scalar(&sql).fetch_all(db).await?;
    rows.iter().map(|raw| Ok(to_client_row(serde_json::from_str(raw)?))).collect()
}

pub fn to_client_row(v: Value) -> Value {
    let Value::Object(mut row) = v else { return v };
    normalize_timestamps(&mut row);
    let mut out = Map::new();
    out.insert("_id".into(), row.remove("id").unwrap_or(Value::Null));
    out.extend(row);
    Value::Object(out)
}

/// `getDeploymentsData` (sortDeployments): displayOrder ascending (unset last), then most recently updated.
pub async fn deployments(db: &Db) -> anyhow::Result<Vec<Value>> {
    client_rows(db, "Deployment", r#"ORDER BY "displayOrder" ASC NULLS LAST, "updatedAt" DESC, "createdAt" DESC"#).await
}

/// The last four digits in a row (the greedy `.*(\d{4})`), else 0.
fn last_year(text: &str) -> u32 {
    let found = text.as_bytes().windows(4).rev().find(|w| w.iter().all(u8::is_ascii_digit));
    found.map_or(0, |w| w.iter().fold(0, |n, d| n * 10 + u32::from(d - b'0')))
}

/// `getProjectsData` (sortProjects): displayOrder ascending (unset last), then the last 4-digit year, newest first.
/// `list`: the index only checks that a readme exists, so it gets a one-character marker instead of ~260 KB of text.
pub async fn projects(db: &Db, list: bool) -> anyhow::Result<Vec<Value>> {
    let mut rows = client_rows(db, "Project", r#"ORDER BY "displayOrder" ASC NULLS LAST, "createdAt" DESC"#).await?;
    // A stable sort keeps the newest first among equals.
    rows.sort_by_key(|r| (r["displayOrder"].as_i64().unwrap_or(i64::MAX), std::cmp::Reverse(last_year(r["year"].as_str().unwrap_or("")))));
    if list {
        for r in &mut rows {
            if let Some(v) = r.get_mut("readme") {
                if v.as_str().is_some_and(|t| !t.trim().is_empty()) {
                    *v = Value::String("…".into());
                }
            }
        }
    }
    Ok(rows)
}

pub enum Lookup {
    Found(Value),
    /// Reached through a non-canonical identifier: 308 to this path.
    Redirect(String),
    NotFound,
}

/// `generateSlug` in src/lib/seoHelper.js.
pub fn generate_slug(text: &str) -> String {
    let kept: String = text.to_lowercase().trim().chars().filter(|c| c.is_ascii_alphanumeric() || *c == '_' || c.is_whitespace() || *c == '-').collect();
    let mut out = String::new();
    let mut in_space = false;
    for c in kept.chars() {
        if c.is_whitespace() {
            in_space = true;
            continue;
        }
        if in_space {
            out.push('-');
            in_space = false;
        }
        out.push(c);
    }
    if in_space {
        out.push('-');
    }
    let mut collapsed = String::new();
    for c in out.chars() {
        if !(c == '-' && collapsed.ends_with('-')) {
            collapsed.push(c);
        }
    }
    collapsed
}

/// `getProjectSlug` / `getDeploymentSlug`: the stored slug, else one made from the name (or `<prefix>-<id tail>`).
pub fn entity_slug(row: &Value, prefix: &str) -> String {
    if let Some(s) = row["slug"].as_str().map(str::trim).filter(|s| !s.is_empty()) {
        return s.to_string();
    }
    let generated = generate_slug(row["name"].as_str().unwrap_or_default());
    if !generated.is_empty() {
        return generated;
    }
    let id = row["_id"].as_str().unwrap_or_default();
    let tail: String = id.chars().rev().take(6).collect::<Vec<_>>().into_iter().rev().collect();
    format!("{prefix}-{}", if tail.is_empty() { "entry" } else { &tail })
}

/// `resolveProjectByIdentifier` / `resolveDeploymentByIdentifier` + the canonical-slug redirect of the detail pages:
/// slug, then id, then a slugless row whose generated slug matches. Next also wrote the generated slug back on
/// read; that backfill is left to the admin save path.
pub async fn entity_by_identifier(db: &Db, table: &str, prefix: &str, base: &str, ident: &str) -> anyhow::Result<Lookup> {
    let norm = ident.trim();
    if norm.is_empty() {
        return Ok(Lookup::NotFound);
    }
    let one = |cond: &str| format!(r#"SELECT {} FROM "{table}" WHERE {cond} LIMIT 1"#, row_json(table));
    let mut found: Option<String> = sqlx::query_scalar(&one("slug = $1")).bind(norm).fetch_optional(db).await?;
    if found.is_none() {
        found = sqlx::query_scalar(&one("id = $1")).bind(norm).fetch_optional(db).await?;
    }
    let row = match found {
        Some(raw) => to_client_row(serde_json::from_str(&raw)?),
        None => {
            let slugless = client_rows(db, table, "WHERE slug = ''").await?;
            match slugless.into_iter().find(|r| entity_slug(r, prefix) == norm) {
                Some(r) => r,
                None => {
                    // Old links to a renamed slug still reach Search and visitors: send them to the new one.
                    let slugs: Vec<String> = sqlx::query_scalar(&format!(r#"SELECT slug FROM "{table}" WHERE slug <> ''"#)).fetch_all(db).await?;
                    return Ok(match renamed_slug(norm, &slugs) {
                        Some(slug) => Lookup::Redirect(format!("{base}/{slug}")),
                        None => Lookup::NotFound,
                    });
                }
            }
        }
    };
    let canonical = entity_slug(&row, prefix);
    if ident != canonical {
        return Ok(Lookup::Redirect(format!("{base}/{canonical}")));
    }
    Ok(Lookup::Found(row))
}

/// The one slug that extends `old` ("aiyu" -> "aiyu-2") or that `old` extends ("betweenus-e2ee-…" -> "betweenus"),
/// at a hyphen. None when no slug or several slugs match, so an ambiguous old link stays a 404.
pub fn renamed_slug(old: &str, slugs: &[String]) -> Option<String> {
    let (longer, shorter) = (format!("{old}-"), |s: &str| format!("{s}-"));
    let mut hits = slugs.iter().filter(|s| s.as_str() != old && (s.starts_with(&longer) || old.starts_with(&shorter(s))));
    let first = hits.next()?;
    hits.next().is_none().then(|| first.clone())
}

/// `getLegalLinksForDeployment`: the first legal app linked to the deployment, with its published documents.
pub async fn legal_links_for_deployment(db: &Db, deployment_id: &str) -> Value {
    let app: Option<(String, String, String, Option<String>)> = sqlx::query_as(
        r#"SELECT id, name, slug, "packageName" FROM "LegalApp" WHERE "deploymentId" = $1 ORDER BY "createdAt" ASC LIMIT 1"#,
    )
    .bind(deployment_id)
    .fetch_optional(db)
    .await
    .unwrap_or(None);
    let Some((id, name, slug, package)) = app else { return Value::Null };
    let documents: Vec<(String, String)> = sqlx::query_as(
        r#"SELECT title, slug FROM "LegalDocument" WHERE "appId" = $1 AND published ORDER BY "displayOrder" ASC, "createdAt" DESC"#,
    )
    .bind(id)
    .fetch_all(db)
    .await
    .unwrap_or_default();
    if documents.is_empty() {
        return Value::Null;
    }
    let links: Vec<Value> = documents.into_iter().map(|(title, doc)| json!({ "title": title, "href": format!("/{slug}/{doc}") })).collect();
    json!({ "name": name, "packageName": package.unwrap_or_default(), "href": format!("/{slug}"), "links": links })
}

/// `getProductPathForDeployment`: `/<legal app slug>` when a legal app is linked to the deployment.
pub async fn product_path(db: &Db, deployment_id: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>(r#"SELECT '/' || slug FROM "LegalApp" WHERE "deploymentId" = $1 ORDER BY "createdAt" ASC LIMIT 1"#)
        .bind(deployment_id)
        .fetch_optional(db)
        .await
        .ok()
        .flatten()
}

/// `getAppLinksForProject`: every app built from the project, pointing at its product page when it has one.
pub async fn app_links_for_project(db: &Db, project_id: &str) -> anyhow::Result<Vec<Value>> {
    let sql = format!(r#"SELECT {} FROM "Deployment" WHERE "projectId" = $1 ORDER BY "displayOrder" ASC"#, row_json("Deployment"));
    let rows = sqlx::query_scalar::<_, String>(&sql)
        .bind(project_id)
        .fetch_all(db)
        .await?;
    let mut out = vec![];
    for raw in rows {
        let d = to_client_row(serde_json::from_str(&raw)?);
        let id = d["_id"].as_str().unwrap_or_default().to_string();
        let product = product_path(db, &id).await;
        out.push(json!({
            "id": id,
            "name": d["name"],
            "href": product.clone().unwrap_or_else(|| format!("/apps/{}", entity_slug(&d, "app"))),
            "hostedUrl": d["hostedUrl"].as_str().unwrap_or_default(),
            "isProduct": product.is_some(),
        }));
    }
    Ok(out)
}

/// `getProjectLinkForDeployment`: `{ name, href }` of the project an app is built from.
pub async fn project_link_for_deployment(db: &Db, project_id: Option<&str>) -> Value {
    let Some(pid) = project_id.filter(|p| !p.is_empty()) else { return Value::Null };
    let sql = format!(r#"SELECT {} FROM "Project" WHERE id = $1"#, row_json("Project"));
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(pid).fetch_optional(db).await.unwrap_or(None);
    match raw.and_then(|r| serde_json::from_str::<Value>(&r).ok()).map(to_client_row) {
        Some(p) => json!({ "name": p["name"], "href": format!("/projects/{}", entity_slug(&p, "project")) }),
        None => Value::Null,
    }
}

/// The three newest published blogs for the home page (`toBlogPreview`: readTime from the full text, content cut to
/// 320 chars). Inline `data:` covers go through /_img/blog/{id} like everywhere else.
pub async fn recent_blogs(db: &Db) -> anyhow::Result<Vec<Value>> {
    let rows = client_rows(db, "Blog", r#"WHERE published ORDER BY "createdAt" DESC LIMIT 3"#).await?;
    Ok(rows
        .into_iter()
        .map(|mut b| {
            if let Some(o) = b.as_object_mut() {
                o.shift_remove("searchVector");
                let content = o.get("content").and_then(Value::as_str).unwrap_or("").to_string();
                o.insert("readTime".into(), read_time(&content).into());
                // JS `slice` counts UTF-16 units.
                let cut: Vec<u16> = content.encode_utf16().take(320).collect();
                o.insert("content".into(), String::from_utf16_lossy(&cut).into());
                if let (Some(Value::String(id)), Some(Value::String(img))) = (o.get("_id").cloned(), o.get("image").cloned()) {
                    o.insert("image".into(), inline_image_url(&id, img).into());
                }
            }
            b
        })
        .collect())
}

/// `getSocialMeta()` (src/lib/socialMeta.js): `{ defaultImage, pages }`, possibly empty.
pub async fn social_meta(db: &Db) -> Value {
    singleton(db, "SeoConfig", false).await.get("social").cloned().unwrap_or(Value::Null)
}

/// Blog index rows: `getPublishedBlogs` (newest first, content cut to 500 chars, `readTime` from the full text).
pub async fn blog_list(db: &Db) -> anyhow::Result<Vec<Value>> {
    let rows: Vec<(String, Option<String>, String, Option<String>, Option<Stamp>, Option<String>, Option<String>, Option<String>, String)> =
        sqlx::query_as(
            // Inline `data:` covers are served from /_img/blog/{id}: fetch only the prefix, not megabytes of base64.
            r#"SELECT id, slug, title, date, "createdAt", tags,
                      CASE WHEN image LIKE 'data:%' THEN 'data:' ELSE image END, "imageAlt", content
               FROM "Blog" WHERE published ORDER BY "createdAt" DESC"#,
        )
        .fetch_all(db)
        .await?;
    Ok(rows
        .into_iter()
        .map(|(id, slug, title, date, created_at, tags, image, image_alt, content)| {
            json!({
                "_id": id, "slug": slug, "title": title, "date": date,
                "createdAt": created_at.map(|t| crate::export::js_date(t.0)),
                "tags": tags.and_then(|t| serde_json::from_str::<Value>(&t).ok()).unwrap_or_else(|| json!([])), "image": image.map(|i| inline_image_url(&id, i)), "imageAlt": image_alt,
                "readTime": read_time(&content),
                "content": content.chars().take(500).collect::<String>(),
            })
        })
        .collect())
}

pub enum BlogLookup {
    Found(Value),
    /// Matched through a non-canonical identifier: redirect (308) to `/blogs/<slug>`.
    Redirect(String),
    NotFound,
}

/// `getBlogById` + the canonical-slug redirect. Exact slug, case-insensitive slug, id, then the legacy prefix
/// matches, all in SQL (Node loaded every blog row for the last step).
pub async fn blog_by_identifier(db: &Db, ident: &str) -> anyhow::Result<BlogLookup> {
    let ident = ident.trim();
    if ident.is_empty() {
        return Ok(BlogLookup::NotFound);
    }
    let sql = format!(
        r#"SELECT {} FROM "Blog"
           WHERE published AND (slug = $1 OR lower(slug) = lower($1) OR id = $1
                 OR (slug <> '' AND (substr($1, 1, length(slug)) = slug OR substr(slug, 1, length($1)) = $1)))
           ORDER BY (slug = $1) DESC, (lower(slug) = lower($1)) DESC, (id = $1) DESC, length(slug) DESC
           LIMIT 1"#,
        row_json("Blog")
    );
    let row: Option<(String,)> = sqlx::query_as(&sql)
    .bind(ident)
    .fetch_optional(db)
    .await?;
    let Some((raw,)) = row else { return Ok(BlogLookup::NotFound) };
    let Value::Object(mut b) = serde_json::from_str::<Value>(&raw)? else { return Ok(BlogLookup::NotFound) };
    let slug = b.get("slug").and_then(Value::as_str).unwrap_or("").to_string();
    if !slug.is_empty() && slug != ident {
        return Ok(BlogLookup::Redirect(format!("/blogs/{slug}")));
    }
    b.remove("searchVector");
    for k in ["createdAt", "updatedAt"] {
        if let Some(v) = b.get_mut(k) {
            crate::export::normalize_timestamp_value(v);
        }
    }
    if let (Some(Value::String(id)), Some(Value::String(img))) = (b.get("id").cloned(), b.get("image").cloned()) {
        b.insert("image".into(), inline_image_url(&id, img).into());
    }
    let mut out = Map::new();
    out.insert("_id".into(), b.remove("id").unwrap_or(Value::Null));
    out.extend(b);
    Ok(BlogLookup::Found(Value::Object(out)))
}

/// Covers stored as base64 `data:` URIs (one is 2 MB) are served from `/_img/blog/{id}` instead of being
/// inlined into every page that lists the blog.
fn inline_image_url(id: &str, image: String) -> String {
    if image.starts_with("data:") { format!("/_img/blog/{id}") } else { image }
}

/// Decode a blog's `data:` cover for `/_img/blog/{id}`: (content type, bytes).
pub async fn blog_inline_image(db: &Db, id: &str) -> Option<(String, Vec<u8>)> {
    use base64::Engine;
    // Result<Option<row>>, and the column itself is nullable.
    let image: String = sqlx::query_scalar::<_, Option<String>>(r#"SELECT image FROM "Blog" WHERE id = $1 AND published"#)
        .bind(id)
        .fetch_optional(db)
        .await
        .ok()???;
    let rest = image.strip_prefix("data:")?;
    let (meta, data) = rest.split_once(',')?;
    let mime = meta.strip_suffix(";base64")?;
    if !mime.starts_with("image/") {
        return None;
    }
    let bytes = base64::engine::general_purpose::STANDARD.decode(data.trim()).ok()?;
    Some((mime.to_string(), bytes))
}

/// `getEntityViewCount('blog', id)`.
pub async fn blog_view_count(db: &Db, id: &str) -> i64 {
    sqlx::query_scalar(
        r#"SELECT COALESCE(SUM(views), 0) FROM "AnalyticsDaily"
           WHERE type = 'entity_view' AND "entityType" = 'blog' AND "entityId" = $1"#,
    )
    .bind(id)
    .fetch_one(db)
    .await
    .unwrap_or(0)
}

/// `getAdsData`: placements with decrypted slot ids, or null when AdSense is off.
pub async fn ads_config(state: &AppState) -> Value {
    let ads = singleton(&state.db, "Ads", false).await;
    if ads.get("adsenseEnabled") != Some(&Value::Bool(true)) {
        return Value::Null;
    }
    let dec = |v: Option<&Value>| v.and_then(Value::as_str).and_then(|s| state.cipher.decrypt(s)).unwrap_or_default();
    let mut placements = Map::new();
    for key in ["top", "middle", "bottom", "sidebar", "footer"] {
        let p = ads.get("placements").and_then(|p| p.get(key)).cloned().unwrap_or(json!({}));
        placements.insert(
            key.into(),
            json!({
                "enabled": p.get("enabled").and_then(Value::as_bool).unwrap_or(false),
                "slotId": dec(p.get("encryptedSlotId")),
                "adType": p.get("adType").and_then(Value::as_str).unwrap_or("display"),
                "adLayoutKey": p.get("adLayoutKey").and_then(Value::as_str).unwrap_or(""),
            }),
        );
    }
    json!({ "adsenseEnabled": true, "clientId": dec(ads.get("encryptedClientId")), "placements": placements })
}

// ── stripMarkdown / getReadTime (src/app/components/blogs/blogUtils.js) ────────────────────────────────
// Rust's regex has no backreferences, so `(\*\*|__)(.*?)\1` and `(\*|_)(.*?)\1` are split in two.
static MD: LazyLock<Vec<(Regex, &'static str)>> = LazyLock::new(|| {
    [
        (r"!\[([^\]]*)\]\([^)]+\)", ""),
        (r"\[([^\]]+)\]\([^)]+\)", "$1"),
        (r"#{1,6}\s+", ""),
        (r"\*\*(.*?)\*\*", "$1"),
        (r"__(.*?)__", "$1"),
        (r"\*(.*?)\*", "$1"),
        (r"_(.*?)_", "$1"),
        (r"`{3,}[\s\S]*?`{3,}", ""),
        (r"`(.+?)`", "$1"),
        (r"(?m)^\s*>\s+", ""),
        (r"(?m)^\s*[-+*]\s+", ""),
        (r"(?m)^\s*\d+\.\s+", ""),
        (r"\n{2,}", "\n"),
    ]
    .into_iter()
    .map(|(p, r)| (Regex::new(p).expect("valid regex"), r))
    .collect()
});

pub fn strip_markdown(md: &str) -> String {
    let mut s = md.to_string();
    for (re, rep) in MD.iter() {
        s = re.replace_all(&s, *rep).into_owned();
    }
    s.trim().to_string()
}

pub fn read_time(content: &str) -> String {
    let words = strip_markdown(content).split_whitespace().count();
    let minutes = ((words as f64) / 200.0).round().max(1.0) as u64;
    format!("{minutes} min read")
}

/// Markdown -> sanitized HTML for crawlers (the React view replaces it on mount).
pub fn markdown_html(md: &str) -> String {
    let mut html = String::new();
    let opts = pulldown_cmark::Options::ENABLE_TABLES | pulldown_cmark::Options::ENABLE_STRIKETHROUGH;
    pulldown_cmark::html::push_html(&mut html, pulldown_cmark::Parser::new_ext(md, opts));
    ammonia::clean(&html)
}

pub fn absolute(base: &str, v: &str) -> String {
    if v.starts_with("http://") || v.starts_with("https://") {
        v.to_string()
    } else {
        format!("{base}/{}", v.trim_start_matches('/'))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renamed_slugs_match_only_when_unique() {
        let slugs: Vec<String> = ["aiyu-2", "betweenus", "betweenus-server", "switchboard-2"].map(String::from).to_vec();
        assert_eq!(renamed_slug("aiyu", &slugs).as_deref(), Some("aiyu-2"));
        assert_eq!(renamed_slug("betweenus-e2ee-real-time", &slugs).as_deref(), Some("betweenus"));
        // Both "betweenus" and "betweenus-server" prefix it: ambiguous, so no redirect.
        assert_eq!(renamed_slug("betweenus-server-x", &slugs), None);
        assert_eq!(renamed_slug("nope", &slugs), None);
        assert_eq!(renamed_slug("aiyu-2", &slugs), None);
    }

    #[test]
    fn slugs_like_seo_helper() {
        assert_eq!(generate_slug("  Hello,  World -- App! "), "hello-world-app");
        assert_eq!(generate_slug("Ünïcode Name"), "ncode-name");
        assert_eq!(entity_slug(&json!({"_id": "abcdef123456", "name": "!!!", "slug": ""}), "app"), "app-123456");
    }

    #[test]
    fn strip_and_read_time_match_js() {
        assert_eq!(strip_markdown("# Title\n\n**bold** and _it_ [link](http://x) ![img](a.png)\n- item"), "Title\nbold and it link \nitem");
        assert_eq!(read_time("word"), "1 min read");
        assert_eq!(read_time(&"w ".repeat(500)), "3 min read");
    }

    #[test]
    fn crawler_html_is_sanitized() {
        let h = markdown_html("# Hi\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))");
        assert!(h.contains("<h1>Hi</h1>"));
        assert!(!h.contains("<script") && !h.contains("javascript:"));
    }
}
