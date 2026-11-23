//! Data for the public pages served by the Vite app, in the same shapes the Next data fetchers return
//! (src/lib/dataFetchers.js), so the shared React views render the same output.

use regex::Regex;
use serde_json::{Map, Value, json};
use sqlx::PgPool;
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
pub async fn public_config(db: &PgPool, base_url: &str) -> Value {
    let keys: Vec<String> = PUBLIC_CONFIG_KEYS.iter().map(|k| k.to_string()).collect();
    let row: Option<(Option<Value>,)> = sqlx::query_as(
        r#"SELECT (SELECT jsonb_object_agg(k, d.data->k) FROM unnest($1::text[]) k WHERE d.data ? k)
                  || jsonb_build_object('favicon', d.data->'favicon')
           FROM "Config" d LIMIT 1"#,
    )
    .bind(&keys)
    .fetch_optional(db)
    .await
    .unwrap_or(None);
    let Some(Value::Object(mut c)) = row.and_then(|r| r.0) else {
        return json!({ "siteTitle": "Portfolio", "logoText": "< aiyu />", "profession": "full stack", "hasCustomFavicon": false });
    };
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
    let header: Option<(Option<Value>,)> =
        sqlx::query_as(r#"SELECT (data::jsonb || jsonb_build_object('_id', id))::json FROM "Header" LIMIT 1"#)
            .fetch_optional(db)
            .await
            .unwrap_or(None);
    let socials: Vec<(Value,)> = sqlx::query_as(
        r#"SELECT (to_jsonb(s) - 'id' || jsonb_build_object('_id', s.id))::json FROM "Social" s"#,
    )
    .fetch_all(db)
    .await
    .unwrap_or_default();
    let about_name: Option<(Option<String>,)> = sqlx::query_as(r#"SELECT data->>'name' FROM "About" LIMIT 1"#)
        .fetch_optional(db)
        .await
        .unwrap_or(None);
    json!({
        "header": header.and_then(|h| h.0),
        "socials": socials.into_iter().map(|s| s.0).collect::<Vec<_>>(),
        "config": config,
        "aboutName": about_name.and_then(|a| a.0),
        "packageVersion": state.package_version,
    })
}

/// Blog index rows: `getPublishedBlogs` (newest first, content cut to 500 chars, `readTime` from the full text).
pub async fn blog_list(db: &PgPool) -> anyhow::Result<Vec<Value>> {
    let rows: Vec<(String, Option<String>, String, Option<String>, Option<chrono::NaiveDateTime>, Option<Vec<String>>, Option<String>, Option<String>, String)> =
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
                "createdAt": created_at.map(crate::export::js_date),
                "tags": tags.unwrap_or_default(), "image": image.map(|i| inline_image_url(&id, i)), "imageAlt": image_alt,
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
pub async fn blog_by_identifier(db: &PgPool, ident: &str) -> anyhow::Result<BlogLookup> {
    let ident = ident.trim();
    if ident.is_empty() {
        return Ok(BlogLookup::NotFound);
    }
    let row: Option<(String,)> = sqlx::query_as(
        r#"SELECT row_to_json(t)::text FROM "Blog" t
           WHERE published AND (slug = $1 OR lower(slug) = lower($1) OR id = $1
                 OR (slug <> '' AND (starts_with($1, slug) OR starts_with(slug, $1))))
           ORDER BY (slug = $1) DESC, (lower(slug) = lower($1)) DESC, (id = $1) DESC, length(slug) DESC
           LIMIT 1"#,
    )
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
pub async fn blog_inline_image(db: &PgPool, id: &str) -> Option<(String, Vec<u8>)> {
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
pub async fn blog_view_count(db: &PgPool, id: &str) -> i64 {
    sqlx::query_scalar(
        r#"SELECT COALESCE(SUM(views), 0)::bigint FROM "AnalyticsDaily"
           WHERE type = 'entity_view' AND "entityType" = 'blog' AND "entityId" = $1"#,
    )
    .bind(id)
    .fetch_one(db)
    .await
    .unwrap_or(0)
}

/// `getAdsData`: placements with decrypted slot ids, or null when AdSense is off.
pub async fn ads_config(state: &AppState) -> Value {
    let row: Option<(Option<Value>,)> = sqlx::query_as(r#"SELECT data FROM "Ads" LIMIT 1"#).fetch_optional(&state.db).await.unwrap_or(None);
    let Some(ads) = row.and_then(|r| r.0) else { return Value::Null };
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
