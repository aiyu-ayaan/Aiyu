//! Storage upkeep (src/lib/storageAudit.js): which uploads the content refers to, removing the rest, converting old
//! uploads to WebP, and gallery thumbnails.

use axum::{
    extract::{RawQuery, Request, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use regex::Regex;
use serde_json::{Map, Value, json};
use std::{
    collections::{BTreeSet, HashMap},
    sync::{Arc, LazyLock},
};

use crate::{
    AppState,
    admin_settings::failure,
    api::{json_status, log_error, query_map, signed_in, truthy},
    images, pages,
    site_api::js_string,
    uploads, write,
};

/// Everything that can point at an upload: `(key, label, table, singleton, timestamps)`. A table missing here would
/// have its pictures deleted by the cleanup.
const SECTIONS: [(&str, &str, &str, bool, bool); 23] = [
    ("home", "Home", "Home", true, false),
    ("about", "About", "About", true, false),
    ("blogs", "Blogs", "Blog", false, false),
    ("projects", "Projects", "Project", false, false),
    ("apps", "Apps", "Deployment", false, false),
    ("gallery", "Gallery", "Gallery", false, false),
    ("config", "Config", "Config", true, false),
    ("header", "Header", "Header", true, false),
    ("socials", "Socials", "Social", false, false),
    ("themes", "Themes", "Theme", false, false),
    ("github", "GitHub", "GitHub", true, false),
    ("contactMessages", "Contact Messages", "ContactMessage", false, false),
    ("legalApps", "Legal Apps", "LegalApp", false, false),
    ("legalDocuments", "Legal Pages", "LegalDocument", false, false),
    ("aiPage", "AI Hub Layout", "AiPage", true, true),
    ("aiSkillCategories", "AI Skill Groups", "AiSkillCategory", false, false),
    ("aiSkills", "AI Skills", "AiSkill", false, false),
    ("aiRecommendations", "AI Stack", "AiRecommendation", false, false),
    ("aiCredits", "AI Credits", "AiCredit", false, false),
    ("aiPrompts", "AI Prompts", "AiPrompt", false, false),
    ("seoConfig", "SEO", "SeoConfig", true, false),
    ("ads", "Ads", "Ads", true, true),
    ("resumeStudio", "Resume Studio", "ResumeStudio", true, true),
];

static UPLOAD_PATHS: LazyLock<[Regex; 2]> =
    LazyLock::new(|| [r"/api/uploads/([^/?#]+)", r"/uploads/([^/?#]+)"].map(|p| Regex::new(p).expect("constant pattern")));
/// A name inside markdown or HTML runs on into the surrounding text: cut there too, so the file still counts.
static NAME_END: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"^[^\s"'()<>\[\]]+"#).expect("constant pattern"));

/// A bare file name inside the uploads folder, or None.
fn file_name(name: &str) -> Option<&str> {
    let name = name.trim();
    (!name.is_empty() && name != ".gitkeep" && !name.contains("..") && !name.contains(['/', '\\', '\0'])).then_some(name)
}

/// Every upload named anywhere in a document.
fn references(value: &Value, found: &mut BTreeSet<String>) {
    match value {
        Value::String(text) => {
            for pattern in UPLOAD_PATHS.iter() {
                for capture in pattern.captures_iter(text) {
                    // Both readings are kept: the whole match (as Next takes it) and the name cut at punctuation.
                    let cut = NAME_END.find(&capture[1]).map(|m| m.as_str());
                    found.extend([Some(&capture[1]), cut].into_iter().flatten().filter_map(file_name).map(str::to_string));
                }
            }
        }
        Value::Array(items) => items.iter().for_each(|v| references(v, found)),
        Value::Object(map) => map.values().for_each(|v| references(v, found)),
        _ => {}
    }
}

async fn documents(state: &AppState, table: &str, singleton: bool, timestamps: bool) -> anyhow::Result<Vec<Value>> {
    if singleton {
        let document = pages::try_singleton(&state.db, table, timestamps).await?;
        return Ok(if document.is_null() { vec![] } else { vec![document] });
    }
    let mut rows = pages::client_rows(&state.db, table, "").await?;
    for row in &mut rows {
        if let Some(fields) = row.as_object_mut() {
            fields.shift_remove("searchVector");
        }
    }
    Ok(rows)
}

#[derive(Clone)]
struct Upload {
    name: String,
    size: u64,
    modified: String,
}

impl Upload {
    fn thumbnail(&self) -> bool {
        self.name.contains("-thumb.")
    }
}

/// The files of the uploads folder, by name.
async fn upload_files(state: &AppState) -> anyhow::Result<Vec<Upload>> {
    let mut entries = match tokio::fs::read_dir(&state.config.uploads_dir).await {
        Ok(entries) => entries,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(err) => return Err(err.into()),
    };
    let mut files = Vec::new();
    while let Some(entry) = entries.next_entry().await? {
        let name = entry.file_name().to_string_lossy().into_owned();
        if file_name(&name) != Some(name.as_str()) {
            continue;
        }
        // Follows links, as `stat` does.
        let meta = tokio::fs::metadata(entry.path()).await?;
        if meta.is_file() {
            let modified = chrono::DateTime::<chrono::Utc>::from(meta.modified()?).to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
            files.push(Upload { name, size: meta.len(), modified });
        }
    }
    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

struct Audit {
    report: Value,
    unreferenced: Vec<(String, u64, Value)>,
}

async fn audit(state: &AppState) -> anyhow::Result<Audit> {
    let mut sections = Vec::new();
    for (key, label, table, singleton, timestamps) in SECTIONS {
        let documents = documents(state, table, singleton, timestamps).await?;
        let mut found = BTreeSet::new();
        documents.iter().for_each(|d| references(d, &mut found));
        let bytes = serde_json::to_string(&documents)?.len() as u64;
        sections.push((key, label, documents.len(), bytes, found));
    }
    let mut files = upload_files(state).await?;
    files.sort_by(|a, b| b.size.cmp(&a.size));

    let mut by_file: HashMap<&str, BTreeSet<&str>> = HashMap::new();
    for (_, label, _, _, found) in &sections {
        found.iter().for_each(|name| {
            by_file.entry(name).or_default().insert(label);
        });
    }
    let mut records = Vec::new();
    let mut unreferenced = Vec::new();
    let (mut total, mut used, mut unused, mut thumbs) = (0u64, 0u64, 0u64, 0u64);
    for file in &files {
        let referenced_by: Vec<&str> = by_file.get(file.name.as_str()).map(|s| s.iter().copied().collect()).unwrap_or_default();
        let record = json!({
            "filename": file.name, "sizeBytes": file.size, "lastModified": file.modified, "isThumbnail": file.thumbnail(),
            "isReferenced": !referenced_by.is_empty(), "references": referenced_by,
        });
        total += file.size;
        if file.thumbnail() {
            thumbs += file.size;
        }
        if referenced_by.is_empty() {
            unused += file.size;
            unreferenced.push((file.name.clone(), file.size, record.clone()));
        } else {
            used += file.size;
        }
        records.push(record);
    }
    let sizes: HashMap<&str, u64> = files.iter().map(|f| (f.name.as_str(), f.size)).collect();
    let database: u64 = sections.iter().map(|s| s.3).sum();
    let summaries: Vec<Value> = sections
        .iter()
        .map(|(key, label, count, bytes, found)| {
            let referenced: u64 = found.iter().filter_map(|n| sizes.get(n.as_str())).sum();
            json!({
                "key": key, "label": label, "docCount": count, "approximateBytes": bytes,
                "referencedUploadCount": found.len(), "referencedUploadBytes": referenced,
            })
        })
        .collect();
    let report = json!({
        "summary": {
            "totalDatabaseBytes": database, "totalUploadBytes": total, "totalReferencedUploadBytes": used,
            "totalUnreferencedUploadBytes": unused, "totalThumbnailBytes": thumbs, "totalAppBytes": database + total,
            "uploadFileCount": files.len(), "referencedUploadCount": files.len() - unreferenced.len(),
            "unreferencedUploadCount": unreferenced.len(),
        },
        "sections": summaries,
        "uploads": records,
        "unreferencedUploads": unreferenced.iter().map(|u| u.2.clone()).collect::<Vec<_>>(),
    });
    Ok(Audit { report, unreferenced })
}

/// `deleteUnreferencedUploads`: only files nothing refers to at this moment are removed.
async fn delete_unreferenced(state: &AppState, requested: &[String]) -> anyhow::Result<(Vec<Value>, Vec<Value>, u64)> {
    let mut names: Vec<&str> = Vec::new();
    for name in requested.iter().filter_map(|n| file_name(n)) {
        if !names.contains(&name) {
            names.push(name);
        }
    }
    let (mut deleted, mut skipped, mut reclaimed) = (Vec::new(), Vec::new(), 0);
    if names.is_empty() {
        return Ok((deleted, skipped, reclaimed));
    }
    let audit = audit(state).await?;
    for name in names {
        let Some((_, size, record)) = audit.unreferenced.iter().find(|u| u.0 == name) else {
            skipped.push(json!({ "filename": name, "reason": "File is referenced or no longer exists." }));
            continue;
        };
        match tokio::fs::remove_file(state.config.uploads_dir.join(name)).await {
            Ok(()) => {
                deleted.push(record.clone());
                reclaimed += size;
            }
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => skipped.push(json!({ "filename": name, "reason": "File already removed." })),
            Err(err) => return Err(err.into()),
        }
    }
    Ok((deleted, skipped, reclaimed))
}

fn readable(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".into();
    }
    let unit = ((bytes as f64).ln() / 1024f64.ln()).floor().clamp(0.0, 3.0) as i32;
    format!("{:.2} {}", bytes as f64 / 1024f64.powi(unit), ["B", "KB", "MB", "GB"][unit as usize])
}

/// The scheduled cleanup.
pub async fn cleanup(state: &AppState) -> anyhow::Result<Value> {
    let names: Vec<String> = audit(state).await?.unreferenced.into_iter().map(|u| u.0).collect();
    let (deleted, skipped, reclaimed) = delete_unreferenced(state, &names).await?;
    Ok(json!({ "deletedCount": deleted.len(), "skippedCount": skipped.len(), "reclaimedBytes": reclaimed, "reclaimedString": readable(reclaimed) }))
}

// ── WebP migration ─────────────────────────────────────────────────────────────────────────────────────

fn needs_conversion(name: &str) -> bool {
    let extension = name.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    ["jpg", "jpeg", "png", "heic", "heif", "gif"].contains(&extension.as_str())
}

fn name_character(c: char) -> bool {
    c.is_ascii_alphanumeric() || "._-".contains(c)
}

/// `old` replaced by `new` wherever it stands as a whole file name (not inside a longer one).
fn replace_name(text: &str, old: &str, new: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut from = 0;
    for (at, _) in text.match_indices(old) {
        let before = text[..at].chars().next_back();
        let after = text[at + old.len()..].chars().next();
        if before.is_some_and(name_character) || after.is_some_and(|c| c.is_ascii_alphanumeric()) {
            continue;
        }
        out.push_str(&text[from..at]);
        out.push_str(new);
        from = at + old.len();
    }
    out.push_str(&text[from..]);
    out
}

fn replace_in(value: &mut Value, old: &str, new: &str) -> bool {
    match value {
        Value::String(text) if text.contains(old) => {
            let replaced = replace_name(text, old, new);
            let changed = replaced != *text;
            *text = replaced;
            changed
        }
        Value::Array(items) => items.iter_mut().fold(false, |changed, v| replace_in(v, old, new) | changed),
        Value::Object(map) => map.values_mut().fold(false, |changed, v| replace_in(v, old, new) | changed),
        _ => false,
    }
}

/// Points every row that names `old` at `new`; only the changed columns are written. Returns the rows changed.
async fn rewrite_references(state: &AppState, old: &str, new: &str) -> anyhow::Result<usize> {
    let mut changed_rows = 0;
    let mut transaction = state.db.begin().await?;
    for (_, _, table, ..) in SECTIONS {
        let sql = format!(r#"SELECT row_to_json(t)::text FROM "{table}" t WHERE strpos(row_to_json(t)::text, $1) > 0 FOR UPDATE"#);
        let rows: Vec<String> = sqlx::query_scalar(&sql).bind(old).fetch_all(&mut *transaction).await?;
        for raw in rows {
            let Value::Object(row) = serde_json::from_str::<Value>(&raw)? else { continue };
            let mut changed = Map::new();
            for (column, value) in &row {
                let mut value = value.clone();
                if column != "searchVector" && column != "id" && replace_in(&mut value, old, new) {
                    changed.insert(column.clone(), value);
                }
            }
            if changed.is_empty() {
                continue;
            }
            // Column names come from the database row itself.
            let set = changed.keys().map(|k| format!(r#""{k}" = r."{k}""#)).collect::<Vec<_>>().join(", ");
            let sql = format!(r#"UPDATE "{table}" t SET {set} FROM jsonb_populate_record(NULL::"{table}", $1::jsonb) r WHERE t.id = $2"#);
            let id = row.get("id").and_then(Value::as_str).unwrap_or_default().to_string();
            sqlx::query(&sql).bind(Value::Object(changed).to_string()).bind(id).execute(&mut *transaction).await?;
            changed_rows += 1;
        }
    }
    transaction.commit().await?;
    Ok(changed_rows)
}

async fn convert(state: &AppState, name: &str) -> anyhow::Result<Value> {
    let path = state.config.uploads_dir.join(name);
    let data = Arc::new(tokio::fs::read(&path).await?);
    let original = data.len();
    let stem = name.rsplit_once('.').map_or(name, |p| p.0);
    let converted = format!("{stem}.webp");
    let thumbnail = name.contains("-thumb.");
    let input = data.clone();
    let out = uploads::blocking(move || images::to_webp(&input, if thumbnail { 80.0 } else { 85.0 }, !thumbnail)).await?;
    // Two sources with one stem (a.jpg, a.png) must not overwrite each other.
    uploads::write_new(state, &converted, &out.data).await.map_err(|e| anyhow::anyhow!("{converted} could not be written: {e}"))?;
    // The original is removed only after every reference has moved.
    let updated = match rewrite_references(state, name, &converted).await {
        Ok(n) => n,
        Err(err) => {
            let _ = tokio::fs::remove_file(state.config.uploads_dir.join(&converted)).await;
            return Err(err);
        }
    };
    tokio::fs::remove_file(&path).await?;
    Ok(json!({ "original": name, "webp": converted, "originalSize": original, "newSize": out.data.len(), "referencesUpdated": updated, "success": true }))
}

/// `executeWebPMigration`
pub async fn migrate_webp(state: &AppState) -> anyhow::Result<Value> {
    let mut details = Vec::new();
    let (mut migrated, mut reclaimed) = (0u64, 0u64);
    for file in upload_files(state).await?.into_iter().filter(|f| needs_conversion(&f.name)) {
        match convert(state, &file.name).await {
            Ok(done) => {
                migrated += 1;
                reclaimed += done["originalSize"].as_u64().unwrap_or(0).saturating_sub(done["newSize"].as_u64().unwrap_or(0));
                details.push(done);
            }
            Err(err) => details.push(json!({ "original": file.name, "success": false, "error": err.to_string() })),
        }
    }
    if migrated > 0 {
        write::notify(state, json!({ "prefixes": ["db:"] })).await;
    }
    Ok(json!({ "migratedCount": migrated, "reclaimedBytes": reclaimed, "reclaimedString": readable(reclaimed), "details": details }))
}

// ── routes ─────────────────────────────────────────────────────────────────────────────────────────────

fn refused() -> Response {
    json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }))
}

fn failed(route: &str, err: anyhow::Error, message: &str) -> Response {
    log_error(route, &err);
    failure(StatusCode::INTERNAL_SERVER_ERROR, message)
}

/// `GET /api/admin/storage`
pub async fn usage(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    match audit(&state).await {
        Ok(a) => json_status(StatusCode::OK, json!({ "success": true, "data": a.report })),
        Err(err) => failed("/api/admin/storage", err, "Failed to load storage usage."),
    }
}

/// `DELETE /api/admin/storage/unreferenced` with `{ filenames }`.
pub async fn remove(State(state): State<AppState>, req: Request) -> Response {
    const FAILED: &str = "Failed to delete unreferenced uploads.";
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return refused();
    }
    let Some(body) = write::json_body(body).await else { return failure(StatusCode::INTERNAL_SERVER_ERROR, FAILED) };
    let names: Vec<String> = body["filenames"].as_array().into_iter().flatten().map(js_string).collect();
    if names.is_empty() {
        return failure(StatusCode::BAD_REQUEST, "No filenames were provided.");
    }
    match delete_unreferenced(&state, &names).await {
        Ok((deleted, skipped, reclaimed)) => {
            json_status(StatusCode::OK, json!({ "success": true, "data": { "deleted": deleted, "skipped": skipped, "reclaimedBytes": reclaimed } }))
        }
        Err(err) => failed("/api/admin/storage/unreferenced", err, FAILED),
    }
}

fn label(document: &Value) -> Value {
    ["title", "name", "label", "platform", "username", "subject", "email", "_id"]
        .iter()
        .map(|k| &document[*k])
        .find(|v| truthy(v))
        .cloned()
        .unwrap_or_else(|| "Unnamed Document".into())
}

async fn preview_candidates(state: &AppState) -> anyhow::Result<Value> {
    let files: Vec<Upload> = upload_files(state).await?.into_iter().filter(|f| needs_conversion(&f.name)).collect();
    let mut tables = Vec::new();
    for (_, _, table, singleton, timestamps) in SECTIONS {
        let texts: Vec<(Value, String)> = documents(state, table, singleton, timestamps).await?.into_iter().map(|d| {
            let text = d.to_string();
            (d, text)
        }).collect();
        tables.push((table, texts));
    }
    let mut total = 0;
    let candidates: Vec<Value> = files
        .iter()
        .map(|file| {
            let mut used = Vec::new();
            for (table, rows) in &tables {
                for (document, _) in rows.iter().filter(|r| r.1.contains(&file.name)) {
                    used.push(json!({ "model": table, "id": js_string(&document["_id"]), "label": label(document) }));
                }
            }
            total += used.len();
            json!({ "filename": file.name, "sizeBytes": file.size, "references": used })
        })
        .collect();
    Ok(json!({ "success": true, "candidates": candidates, "totalCandidates": candidates.len(), "totalReferences": total }))
}

/// `GET /api/admin/storage/migrate`: what a conversion would touch.
pub async fn preview(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    match preview_candidates(&state).await {
        Ok(v) => json_status(StatusCode::OK, v),
        Err(err) => failed("/api/admin/storage/migrate", err, "Preview failed. Please review system logs."),
    }
}

/// `POST /api/admin/storage/migrate`
pub async fn migrate(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    match migrate_webp(&state).await {
        Ok(v) => json_status(
            StatusCode::OK,
            json!({ "success": true, "migratedCount": v["migratedCount"], "reclaimedBytes": v["reclaimedBytes"], "details": v["details"] }),
        ),
        Err(err) => failed("/api/admin/storage/migrate", err, "Migration failed. Please review system logs."),
    }
}

async fn gallery_batch(state: &AppState, batch: i64, skip: i64) -> anyhow::Result<Value> {
    const MISSING: &str = r#"FROM "Gallery" WHERE thumbnail IS NULL OR thumbnail = ''"#;
    let rows: Vec<(String, String)> = sqlx::query_as(&format!("SELECT id, src {MISSING} LIMIT $1 OFFSET $2")).bind(batch).bind(skip).fetch_all(&state.db).await?;
    let count: i64 = sqlx::query_scalar(&format!("SELECT count(*) {MISSING}")).fetch_one(&state.db).await?;
    let (mut success, mut errors) = (0, Vec::new());
    for (id, src) in &rows {
        let one: anyhow::Result<()> = async {
            let name = src.rsplit('/').next().and_then(file_name).ok_or_else(|| anyhow::anyhow!("no file name in {src}"))?;
            let data = Arc::new(tokio::fs::read(state.config.uploads_dir.join(name)).await?);
            let url = uploads::save_thumbnail(state, data, name).await?;
            sqlx::query(r#"UPDATE "Gallery" SET thumbnail = $1 WHERE id = $2"#).bind(url).bind(id).execute(&state.db).await?;
            Ok(())
        }
        .await;
        match one {
            Ok(()) => success += 1,
            Err(err) => errors.push(format!("{id}: {err}")),
        }
    }
    if success > 0 {
        write::notify(state, json!({ "prefixes": ["db:gallery"] })).await;
    }
    let total = rows.len() as i64;
    let more = skip + batch < count;
    let percentage = (count > 0).then(|| ((skip + total) as f64 / count as f64 * 100.0).round() as i64);
    Ok(json!({
        "success": true,
        "message": format!("Processed {success} of {total} images successfully."),
        "details": { "total": total, "totalRemaining": count, "success": success, "failed": errors.len(), "errors": errors },
        "hasMore": more,
        "nextSkip": more.then_some(skip + batch),
        "progress": { "processed": skip + total, "total": count, "percentage": percentage },
    }))
}

/// `POST /api/admin/migrate-gallery?batch=&skip=`: thumbnails for gallery items without one.
pub async fn gallery_thumbnails(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let params = query_map(&q);
    let number = |k: &str, fallback: i64| params.get(k).and_then(|v| write::parse_int(&v.as_str().into())).unwrap_or(fallback);
    match gallery_batch(&state, number("batch", 10).clamp(1, 100), number("skip", 0).max(0)).await {
        Ok(v) => json_status(StatusCode::OK, v),
        Err(err) => {
            log_error("/api/admin/migrate-gallery", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn references_are_found_anywhere() {
        let mut found = BTreeSet::new();
        references(&json!({ "a": ["see ![x](/api/uploads/a.png?v=1) and /uploads/b.jpg#x"], "b": { "c": "/uploads/..", "d": 5 } }), &mut found);
        assert!(found.contains("a.png") && found.contains("b.jpg"), "{found:?}");
    }

    #[test]
    fn only_whole_names_are_renamed() {
        assert_eq!(replace_name("/api/uploads/a.jpg and /api/uploads/ba.jpg a.jpgx (a.jpg)", "a.jpg", "a.webp"), "/api/uploads/a.webp and /api/uploads/ba.jpg a.jpgx (a.webp)");
        let mut doc = json!({ "x": [{ "y": "/uploads/a.jpg" }], "n": 1 });
        assert!(replace_in(&mut doc, "a.jpg", "a.webp") && !replace_in(&mut doc, "a.jpg", "a.webp"));
    }

    #[test]
    fn sizes_read_like_next() {
        assert_eq!((readable(0), readable(500), readable(1536)), ("0 B".into(), "500.00 B".into(), "1.50 KB".into()));
    }
}
