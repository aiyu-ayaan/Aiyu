//! `GET /api/admin/export`: the backup zip, built in Rust and streamed.
//!
//! Port of src/app/api/admin/export/route.js. Rows stream from Postgres one at a time straight into the
//! zip, and upload files stream from disk, so memory stays flat whatever the data size (Next loaded every
//! table whole and grew by ~270 MB per export). Layout and JSON shape match Node (`toClient` in
//! src/lib/serialize.js): `data/<key>.json`, `uploads/<file>`, `manifest.json`.

use async_zip::{Compression, ZipEntryBuilder, tokio::write::ZipFileWriter};
use axum::{
    body::Body,
    extract::{RawQuery, State},
    http::{HeaderValue, header},
    response::Response,
};
use chrono::{NaiveDateTime, Utc};
use futures_util::TryStreamExt;
use serde_json::{Map, Value};
use sqlx::PgPool;
use std::path::{Path, PathBuf};
use tokio_util::{compat::FuturesAsyncWriteCompatExt, io::ReaderStream};

use crate::{AppState, auth::require_session};

pub const INTERNAL_HEADER: &str = "x-aiyu-internal";

/// HMAC-SHA256(JWT_SECRET, "internal:export") as hex; the Node cron computes the same.
pub fn internal_key(jwt_secret: &str) -> String {
    use hmac::{Hmac, Mac};
    let mut mac = Hmac::<sha2::Sha256>::new_from_slice(jwt_secret.as_bytes()).expect("any key length");
    mac.update(b"internal:export");
    hex::encode(mac.finalize().into_bytes())
}

#[derive(Clone, Copy)]
enum Kind {
    /// Real columns: `id` -> `_id`.
    Relational,
    /// One `data` json column spread to the top level; `timestamps` exposes the wrapper dates.
    Json { timestamps: bool },
}

struct Collection {
    key: &'static str,
    table: &'static str,
    kind: Kind,
    /// Columns removed after `toClient` (Node: RELATIONAL_OMIT and the cron runtime fields).
    drop: &'static [&'static str],
    /// Secret columns copied into the backup when set (Node: CONFIG_BACKUP_SECRETS).
    secrets: &'static [&'static str],
}

const fn rel(key: &'static str, table: &'static str) -> Collection {
    Collection { key, table, kind: Kind::Relational, drop: &[], secrets: &[] }
}
const fn json(key: &'static str, table: &'static str, timestamps: bool) -> Collection {
    Collection { key, table, kind: Kind::Json { timestamps }, drop: &[], secrets: &[] }
}

/// Same keys and order as COLLECTION_PRODUCERS in the Node export.
const COLLECTIONS: &[Collection] = &[
    json("about", "About", false),
    Collection { drop: &["searchVector"], ..rel("blogs", "Blog") },
    Collection { secrets: &["encryptedGithubWebhookSecret"], ..json("config", "Config", false) },
    rel("gallery", "Gallery"),
    json("header", "Header", false),
    json("home", "Home", false),
    json("aiPage", "AiPage", true),
    json("resumeStudio", "ResumeStudio", true),
    rel("aiSkillCategories", "AiSkillCategory"),
    rel("aiSkills", "AiSkill"),
    rel("aiRecommendations", "AiRecommendation"),
    rel("aiCredits", "AiCredit"),
    rel("aiPrompts", "AiPrompt"),
    rel("projects", "Project"),
    rel("deployments", "Deployment"),
    rel("legalApps", "LegalApp"),
    rel("legalDocuments", "LegalDocument"),
    rel("socials", "Social"),
    rel("themes", "Theme"),
    Collection { drop: &["webhookEnv", "lastRun", "lastRunStatus", "lastRunLog"], ..rel("crons", "Cron") },
    json("ads", "Ads", true),
    json("notificationConfig", "NotificationConfig", true),
    rel("analyticsEvents", "AnalyticsEvent"),
    rel("analyticsDaily", "AnalyticsDaily"),
    rel("aiLogs", "AiLog"),
    json("github", "GitHub", false),
    rel("contactMessages", "ContactMessage"),
];

/// Without `collections=`, these stay out unless their legacy flag is `true`.
const LEGACY_FLAGS: &[(&str, &str)] = &[("github", "includeGithub"), ("contactMessages", "includeContact"), ("aiLogs", "includeAiUsage")];

pub fn selected_keys(query: &[(String, String)]) -> Vec<&'static str> {
    let get = |k: &str| query.iter().find(|(qk, _)| qk == k).map(|(_, v)| v.as_str());
    let explicit: Option<Vec<String>> = get("collections").map(|v| {
        percent_decode(v).split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
    });
    COLLECTIONS
        .iter()
        .filter(|c| match &explicit {
            Some(list) => list.iter().any(|k| k == c.key),
            None => match LEGACY_FLAGS.iter().find(|(k, _)| *k == c.key) {
                Some((_, flag)) => get(flag) == Some("true"),
                None => true,
            },
        })
        .map(|c| c.key)
        .collect()
}

pub async fn export(State(state): State<AppState>, RawQuery(query): RawQuery, req: axum::extract::Request) -> Response {
    let headers = req.headers();
    let peer = req.extensions().get::<axum::extract::ConnectInfo<std::net::SocketAddr>>().map(|c| c.0.ip());
    // The backup cron inside the container calls this over loopback with a key derived from JWT_SECRET.
    let internal = peer.is_some_and(|ip| ip.is_loopback())
        && headers
            .get(INTERNAL_HEADER)
            .and_then(|v| v.to_str().ok())
            .is_some_and(|v| crate::session::constant_time_eq(v, &internal_key(&state.config.jwt_secret)));
    if !internal {
        if let Err(res) = require_session(&state, headers).await {
            return res;
        }
    }
    let params = query.as_deref().map(url_pairs).unwrap_or_default();
    let include_images = !params.iter().any(|(k, v)| k == "includeImages" && v == "false");
    let keys = selected_keys(&params);

    let now = Utc::now();
    let filename = format!("backup_{}.zip", now.format("%Y-%m-%d_%H-%M-%S"));
    let db = state.db.clone();
    let uploads = state.config.uploads_dir.clone();

    let (reader, writer) = tokio::io::duplex(64 * 1024);
    tokio::spawn(async move {
        let images = include_images.then_some(uploads.as_path());
        if let Err(err) = write_backup(writer, &db, &keys, images, now.naive_utc()).await {
            // The download ends early; a truncated zip fails to open, so a restore can never use it.
            tracing::error!(error = %err, "export failed mid-stream");
        }
    });

    let mut res = Response::new(Body::from_stream(ReaderStream::new(reader)));
    let h = res.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_static("application/zip"));
    if let Ok(v) = HeaderValue::from_str(&format!("attachment; filename=\"{filename}\"")) {
        h.insert(header::CONTENT_DISPOSITION, v);
    }
    res
}

pub async fn write_backup<W>(out: W, db: &PgPool, keys: &[&str], uploads: Option<&Path>, exported_at: NaiveDateTime) -> anyhow::Result<()>
where
    W: tokio::io::AsyncWrite + Unpin,
{
    let mut zip = ZipFileWriter::with_tokio(out);
    let mut counts = Map::new();

    for key in keys {
        let c = COLLECTIONS.iter().find(|c| c.key == *key).expect("known key");
        let entry = zip
            .write_entry_stream(ZipEntryBuilder::new(format!("data/{key}.json").into(), Compression::Deflate))
            .await?;
        let mut entry = entry.compat_write();
        let n = write_collection(db, c, &mut entry).await?;
        entry.into_inner().close().await?;
        // Node counts a non-array value as 1; every collection here is an array.
        counts.insert(key.to_string(), n.into());
    }

    if let Some(dir) = uploads {
        for path in upload_files(dir).await? {
            let name = format!("uploads/{}", path.file_name().unwrap().to_string_lossy());
            let mut file = match tokio::fs::File::open(&path).await {
                Ok(f) => f,
                Err(err) => {
                    tracing::warn!(?path, error = %err, "export: skipping unreadable upload");
                    continue;
                }
            };
            // Images are already compressed; storing them saves CPU for no size loss.
            let entry = zip.write_entry_stream(ZipEntryBuilder::new(name.into(), Compression::Stored)).await?;
            let mut entry = entry.compat_write();
            tokio::io::copy(&mut file, &mut entry).await?;
            entry.into_inner().close().await?;
        }
    }

    // Written last because counts are only known after streaming; the import reads entries by name.
    let manifest = serde_json::json!({
        "format": "split-v2",
        "exportedAt": js_date(exported_at),
        "collections": keys,
        "counts": counts,
    });
    zip.write_entry_whole(
        ZipEntryBuilder::new("manifest.json".to_string().into(), Compression::Deflate),
        serde_json::to_string_pretty(&manifest)?.as_bytes(),
    )
    .await?;

    let mut out = zip.close().await?.into_inner();
    tokio::io::AsyncWriteExt::shutdown(&mut out).await?;
    Ok(())
}

/// Stream one table as a pretty JSON array (2-space indent, like `JSON.stringify(v, null, 2)`). Returns the row count.
async fn write_collection<W: tokio::io::AsyncWrite + Unpin>(db: &PgPool, c: &Collection, out: &mut W) -> anyhow::Result<u64> {
    use tokio::io::AsyncWriteExt;

    let ts_cols: Vec<String> = sqlx::query_scalar(
        "SELECT column_name::text FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1 AND data_type LIKE 'timestamp%'",
    )
    .bind(c.table)
    .fetch_all(db)
    .await?;

    // Table names come from the constant list above, never from the request.
    let sql = format!(r#"SELECT row_to_json(t)::text FROM "{}" t"#, c.table);
    let mut rows = sqlx::query_scalar::<_, String>(&sql).fetch(db);

    let mut n = 0u64;
    out.write_all(b"[").await?;
    while let Some(raw) = rows.try_next().await? {
        let Value::Object(mut row) = serde_json::from_str::<Value>(&raw)? else { continue };
        for col in &ts_cols {
            if let Some(v) = row.get_mut(col) {
                normalize_timestamp_value(v);
            }
        }
        let doc = to_client(c, row);
        out.write_all(if n == 0 { b"\n  " } else { b",\n  " }).await?;
        out.write_all(indent(&serde_json::to_string_pretty(&doc)?, 2).as_bytes()).await?;
        n += 1;
    }
    out.write_all(if n == 0 { b"]" } else { b"\n]" }).await?;
    Ok(n)
}

/// `toClient` from src/lib/serialize.js, plus the export-only drops and secrets.
fn to_client(c: &Collection, mut row: Map<String, Value>) -> Value {
    let id = row.remove("id").unwrap_or(Value::Null);
    let mut out = Map::new();
    match c.kind {
        Kind::Relational => {
            out.insert("_id".into(), id);
            for (k, v) in row.iter() {
                out.insert(k.clone(), v.clone());
            }
        }
        Kind::Json { timestamps } => {
            if let Some(Value::Object(data)) = row.get("data") {
                out.extend(data.clone());
            }
            out.insert("_id".into(), id);
            if timestamps {
                out.insert("createdAt".into(), row.get("createdAt").cloned().unwrap_or(Value::Null));
                out.insert("updatedAt".into(), row.get("updatedAt").cloned().unwrap_or(Value::Null));
            }
        }
    }
    for secret in c.secrets {
        if let Some(v) = row.get(*secret).filter(|v| truthy(v)) {
            out.insert(secret.to_string(), v.clone());
        }
    }
    for d in c.drop {
        out.shift_remove(*d);
    }
    Value::Object(out)
}

fn truthy(v: &Value) -> bool {
    !matches!(v, Value::Null | Value::Bool(false)) && v.as_str() != Some("")
}

/// Postgres renders `timestamp(3)` as `2026-11-23T19:54:14.96`; JS Date JSON is `2026-11-23T19:54:14.960Z`.
pub fn normalize_timestamp_value(v: &mut Value) {
    if let Some(s) = v.as_str() {
        if let Ok(t) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f") {
            *v = Value::String(js_date(t));
        }
    }
}

pub fn js_date(t: NaiveDateTime) -> String {
    t.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

fn indent(s: &str, spaces: usize) -> String {
    let pad = " ".repeat(spaces);
    s.replace('\n', &format!("\n{pad}"))
}

/// Regular files directly in `dir` (not recursive), like Node's `readdir` + `isFile()`.
async fn upload_files(dir: &Path) -> anyhow::Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    let mut rd = match tokio::fs::read_dir(dir).await {
        Ok(rd) => rd,
        Err(_) => return Ok(files), // Node: missing dir -> no images
    };
    while let Some(e) = rd.next_entry().await? {
        if e.file_type().await?.is_file() {
            files.push(e.path());
        }
    }
    files.sort();
    Ok(files)
}

fn url_pairs(q: &str) -> Vec<(String, String)> {
    q.split('&')
        .filter(|p| !p.is_empty())
        .map(|p| {
            let (k, v) = p.split_once('=').unwrap_or((p, ""));
            (k.to_string(), v.to_string())
        })
        .collect()
}

/// Enough for `collections=a%2Cb` and `+`; keys are plain ASCII.
fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        let hex = b.get(i + 1..i + 3).and_then(|h| std::str::from_utf8(h).ok()).and_then(|h| u8::from_str_radix(h, 16).ok());
        match (b[i], hex) {
            (b'%', Some(byte)) => {
                out.push(byte);
                i += 3;
                continue;
            }
            (b'+', _) => out.push(b' '),
            (c, _) => out.push(c),
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn q(s: &str) -> Vec<(String, String)> {
        url_pairs(s)
    }

    #[test]
    fn selection_matches_node() {
        let all = selected_keys(&q(""));
        assert!(!all.contains(&"github") && !all.contains(&"contactMessages") && !all.contains(&"aiLogs"));
        assert_eq!(all.len(), COLLECTIONS.len() - 3);
        assert!(selected_keys(&q("includeGithub=true")).contains(&"github"));
        assert_eq!(selected_keys(&q("collections=blogs%2Cgithub,nope")), vec!["blogs", "github"]);
    }

    #[test]
    fn to_client_shapes() {
        let blog = COLLECTIONS.iter().find(|c| c.key == "blogs").unwrap();
        let row: Map<String, Value> = serde_json::from_str(r#"{"id":"b1","title":"T","searchVector":"x"}"#).unwrap();
        assert_eq!(to_client(blog, row), serde_json::json!({"_id":"b1","title":"T"}));

        let config = COLLECTIONS.iter().find(|c| c.key == "config").unwrap();
        let row: Map<String, Value> = serde_json::from_str(
            r#"{"id":"c1","data":{"logoText":"x"},"encryptedGithubToken":"secret","encryptedGithubWebhookSecret":"wh","createdAt":"t"}"#,
        )
        .unwrap();
        assert_eq!(to_client(config, row), serde_json::json!({"logoText":"x","_id":"c1","encryptedGithubWebhookSecret":"wh"}));

        let ads = COLLECTIONS.iter().find(|c| c.key == "ads").unwrap();
        let row: Map<String, Value> = serde_json::from_str(r#"{"id":"a","data":{"k":1},"createdAt":"c","updatedAt":"u"}"#).unwrap();
        assert_eq!(to_client(ads, row), serde_json::json!({"k":1,"_id":"a","createdAt":"c","updatedAt":"u"}));
    }

    #[test]
    fn timestamps_match_js() {
        let mut v = Value::String("2026-11-23T19:54:14.96".into());
        normalize_timestamp_value(&mut v);
        assert_eq!(v, "2026-11-23T19:54:14.960Z");
        let mut v = Value::String("2026-01-02T03:04:05".into());
        normalize_timestamp_value(&mut v);
        assert_eq!(v, "2026-01-02T03:04:05.000Z");
    }

    #[test]
    fn internal_key_matches_node() {
        // node -e "console.log(require('crypto').createHmac('sha256','s').update('internal:export').digest('hex'))"
        assert_eq!(internal_key("s"), "a3d63bf2357b9f9132e71c21bab23c3de6eaaacb4870ff95358565177fe1fde6");
    }

    #[test]
    fn decodes_query_values() {
        assert_eq!(percent_decode("a%2Cb+c"), "a,b c");
        assert_eq!(percent_decode("100%"), "100%");
    }
}
