//! `POST /api/admin/import`: restore a backup (src/app/api/admin/import/route.js). The upload goes to a temporary
//! file and the zip is read entry by entry, so memory holds one collection at a time. All tables are replaced in one
//! transaction; upload files are written only after it succeeds.

use async_zip::tokio::read::seek::ZipFileReader;
use axum::{
    body::Body,
    extract::{FromRequest, Multipart, Request, State},
    http::{StatusCode, header},
    response::Response,
};
use futures_util::{AsyncReadExt as _, StreamExt};
use serde_json::{Map, Value, json};
use sqlx::PgConnection;
use std::{
    collections::{BTreeMap, HashMap},
    path::{Path, PathBuf},
};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, BufReader};

use crate::{
    AppState,
    admin_settings::failure,
    api::{json_status, log_error, signed_in},
    db::new_id,
    write,
};

/// The largest upload accepted, and the most a zip may unpack to.
const MAX_UPLOAD: u64 = 600 * 1024 * 1024;
const MAX_UNPACKED: u64 = 500 * 1024 * 1024;
const MAX_ENTRIES: usize = 10_000;

/// A json-blob table keeps these in columns of their own.
const CONFIG_SECRETS: &[&str] = &[
    "encryptedGithubToken", "encryptedGithubWebhookSecret", "encryptedGeminiApiKey", "encryptedGroqApiKey",
    "encryptedOpenRouterApiKey", "blogApiTokenHash",
];

struct Collection {
    key: &'static str,
    table: &'static str,
    /// A `data` json document rather than real columns.
    json: bool,
    /// Columns a backup never holds: a restore keeps their current values.
    keep: &'static [&'static str],
}

const fn rel(key: &'static str, table: &'static str) -> Collection {
    Collection { key, table, json: false, keep: &[] }
}
const fn doc(key: &'static str, table: &'static str) -> Collection {
    Collection { key, table, json: true, keep: &[] }
}

/// The order matters: a parent (skill category, legal app) comes before the rows that point at it.
const COLLECTIONS: [Collection; 27] = [
    doc("about", "About"),
    rel("blogs", "Blog"),
    Collection { keep: CONFIG_SECRETS, ..doc("config", "Config") },
    rel("gallery", "Gallery"),
    doc("header", "Header"),
    doc("home", "Home"),
    doc("aiPage", "AiPage"),
    doc("resumeStudio", "ResumeStudio"),
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
    doc("github", "GitHub"),
    rel("contactMessages", "ContactMessage"),
    rel("themes", "Theme"),
    Collection { keep: &["webhookEnv"], ..rel("crons", "Cron") },
    doc("ads", "Ads"),
    doc("notificationConfig", "NotificationConfig"),
    rel("analyticsEvents", "AnalyticsEvent"),
    rel("analyticsDaily", "AnalyticsDaily"),
    rel("aiLogs", "AiLog"),
];

/// Why a restore stopped: the backup itself (400), or anything after it was read.
#[derive(Debug)]
pub enum RestoreError {
    Backup(String),
    Failed(anyhow::Error),
}

impl<E: Into<anyhow::Error>> From<E> for RestoreError {
    fn from(err: E) -> Self {
        Self::Failed(err.into())
    }
}

fn bad(message: impl Into<String>) -> RestoreError {
    RestoreError::Backup(message.into())
}

// ── temporary files ────────────────────────────────────────────────────────────────────────────────────

/// A file removed when dropped.
pub struct TempFile(pub PathBuf);

impl TempFile {
    /// A fresh path in the backup scratch folder (on disk: `/tmp` is memory in the container).
    pub async fn new(extension: &str) -> anyhow::Result<Self> {
        let dir = std::env::var("BACKUP_TMP_DIR").ok().filter(|v| !v.is_empty()).unwrap_or_else(|| ".next/cache/backups".into());
        tokio::fs::create_dir_all(&dir).await?;
        Ok(Self(Path::new(&dir).join(format!("{}.{extension}", new_id()))))
    }
}

impl Drop for TempFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

/// Streams `body` into `file`, refusing more than `MAX_UPLOAD`.
pub async fn save_stream<S, B, E>(mut body: S, file: &TempFile) -> Result<u64, RestoreError>
where
    S: futures_util::Stream<Item = Result<B, E>> + Unpin,
    B: AsRef<[u8]>,
    E: std::fmt::Display,
{
    let mut out = tokio::fs::File::create(&file.0).await?;
    let mut size = 0u64;
    while let Some(chunk) = body.next().await {
        let chunk = chunk.map_err(|e| bad(format!("The upload was interrupted: {e}")))?;
        size += chunk.as_ref().len() as u64;
        if size > MAX_UPLOAD {
            return Err(bad("The backup is larger than 600MB"));
        }
        out.write_all(chunk.as_ref()).await?;
    }
    out.flush().await?;
    Ok(size)
}

// ── reading a backup ───────────────────────────────────────────────────────────────────────────────────

struct Entry {
    index: usize,
    name: String,
    size: u64,
    crc: u32,
}

type Zip = async_zip::base::read::seek::ZipFileReader<tokio_util::compat::Compat<BufReader<tokio::fs::File>>>;

struct Archive {
    zip: Zip,
    entries: Vec<Entry>,
    /// Bytes unpacked so far: declared sizes can lie.
    unpacked: u64,
}

impl Archive {
    async fn open(path: &Path) -> Result<Self, RestoreError> {
        let file = BufReader::new(tokio::fs::File::open(path).await?);
        let zip = ZipFileReader::with_tokio(file).await.map_err(|e| bad(format!("Invalid or unsupported zip format: {e}")))?;
        let all = zip.file().entries();
        if all.len() > MAX_ENTRIES {
            return Err(bad(format!("Backup contains too many files ({} > {MAX_ENTRIES})", all.len())));
        }
        let mut entries = Vec::new();
        let mut declared = 0u64;
        for (index, entry) in all.iter().enumerate() {
            declared = declared.saturating_add(entry.uncompressed_size());
            if entry.dir().unwrap_or(true) {
                continue;
            }
            let Ok(name) = entry.filename().as_str() else { continue };
            entries.push(Entry { index, name: name.to_string(), size: entry.uncompressed_size(), crc: entry.crc32() });
        }
        if declared > MAX_UNPACKED {
            return Err(bad("Backup archive's uncompressed size exceeds the 500MB limit"));
        }
        Ok(Self { zip, entries, unpacked: 0 })
    }

    /// Unpacks one entry into `out`, checking its length and checksum.
    async fn unpack<W: tokio::io::AsyncWrite + Unpin>(&mut self, at: usize, out: &mut W) -> anyhow::Result<()> {
        let (index, size, crc) = (self.entries[at].index, self.entries[at].size, self.entries[at].crc);
        let mut reader = self.zip.reader_without_entry(index).await?;
        let mut buffer = vec![0; 64 * 1024];
        let (mut length, mut hash) = (0u64, crc32fast::Hasher::new());
        loop {
            let n = reader.read(&mut buffer).await?;
            if n == 0 {
                break;
            }
            length += n as u64;
            self.unpacked += n as u64;
            anyhow::ensure!(length <= size && self.unpacked <= MAX_UNPACKED, "Backup archive unpacks to more than it declares");
            hash.update(&buffer[..n]);
            out.write_all(&buffer[..n]).await?;
        }
        anyhow::ensure!(length == size && hash.finalize() == crc, "a file in the backup is damaged");
        Ok(())
    }

    async fn json(&mut self, at: usize) -> Result<Value, RestoreError> {
        let mut raw = Vec::new();
        self.unpack(at, &mut raw).await.map_err(|e| bad(e.to_string()))?;
        let short = self.entries[at].name.rsplit('/').next().unwrap_or("").to_string();
        let name = if short.eq_ignore_ascii_case("data.json") { short } else { format!("data/{short}") };
        serde_json::from_slice(&raw).map_err(|_| bad(format!("Invalid JSON in {name}")))
    }

    /// `uploads/<file>` entries: the file name and the entry.
    fn uploads(&self) -> Vec<(String, usize)> {
        self.entries
            .iter()
            .enumerate()
            .filter_map(|(at, e)| {
                let lower = e.name.to_ascii_lowercase();
                let start = lower.rfind("uploads/")?;
                (start == 0 || lower.as_bytes()[start - 1] == b'/').then(|| (e.name[start + "uploads/".len()..].to_string(), at))
            })
            .filter(|(name, _)| !name.is_empty())
            .collect()
    }
}

/// A file name that stays inside the uploads folder.
fn safe_name(name: &str) -> bool {
    !(name.contains("..") || name.contains(['/', '\\', '\0']) || name == ".")
}

/// A backup being restored: a zip (for its files and per-collection entries) and/or one in-memory dump (a plain
/// JSON upload, or the single `data.json` of old backups).
struct Source {
    archive: Option<Archive>,
    dump: Option<Map<String, Value>>,
}

/// "blogs" for `data/blogs.json`, at any depth.
fn in_data_folder(name: &str) -> Option<&str> {
    let (folder, file) = name.rsplit_once('/')?;
    let is_data = folder.eq_ignore_ascii_case("data") || folder.to_ascii_lowercase().ends_with("/data");
    let end = file.len().checked_sub(5).filter(|&n| file.is_char_boundary(n) && file[n..].eq_ignore_ascii_case(".json"))?;
    is_data.then(|| &file[..end])
}

fn dump_of(value: Value) -> Result<Map<String, Value>, RestoreError> {
    match value {
        Value::Object(map) => Ok(map),
        // An array has no collection names: nothing in it can be restored.
        Value::Array(_) => Ok(Map::new()),
        _ => Err(bad("Invalid data format")),
    }
}

impl Source {
    /// Reads the file at `path`: a zip by its first bytes, otherwise JSON.
    async fn open(path: &Path) -> Result<Self, RestoreError> {
        let mut file = tokio::fs::File::open(path).await?;
        let mut magic = [0; 2];
        if file.read_exact(&mut magic).await.is_err() || &magic != b"PK" {
            file.seek(std::io::SeekFrom::Start(0)).await?;
            let size = file.metadata().await?.len();
            if size == 0 {
                return Err(bad("No file uploaded"));
            }
            if size > MAX_UNPACKED {
                return Err(bad("The backup is larger than 500MB"));
            }
            let mut raw = Vec::new();
            file.read_to_end(&mut raw).await?;
            let value = serde_json::from_slice(&raw).map_err(|_| bad("INVALID_JSON_STRUCTURE"))?;
            return Ok(Self { archive: None, dump: Some(dump_of(value)?) });
        }
        let mut archive = Archive::open(path).await?;
        // The single-file layout of old backups wins when present.
        let legacy = archive.entries.iter().position(|e| e.name.rsplit('/').next().is_some_and(|n| n.eq_ignore_ascii_case("data.json")));
        let dump = match legacy {
            Some(at) => Some(dump_of(archive.json(at).await?)?),
            None if archive.entries.iter().any(|e| in_data_folder(&e.name).is_some()) => None,
            None => return Err(bad("ZIP does not contain data.json or a data/ collection folder")),
        };
        Ok(Self { archive: Some(archive), dump })
    }

    /// Every collection's JSON is parsed once before anything is touched, so a damaged file changes nothing.
    async fn check(&mut self) -> Result<(), RestoreError> {
        for collection in &COLLECTIONS {
            self.take(collection.key, false).await?;
        }
        Ok(())
    }

    /// The documents of one collection, or None when the backup has no array for it.
    async fn take(&mut self, key: &str, consume: bool) -> Result<Option<Vec<Value>>, RestoreError> {
        let value = match &mut self.dump {
            Some(dump) => {
                if consume { dump.remove(key) } else { return Ok(None) }
            }
            None => {
                let Some(archive) = &mut self.archive else { return Ok(None) };
                let Some(at) = archive.entries.iter().rposition(|e| in_data_folder(&e.name) == Some(key)) else { return Ok(None) };
                let before = archive.unpacked;
                let value = archive.json(at).await?;
                if !consume {
                    archive.unpacked = before;
                }
                Some(value)
            }
        };
        Ok(match value {
            Some(Value::Array(rows)) => Some(rows),
            _ => None,
        })
    }
}

// ── writing the database ───────────────────────────────────────────────────────────────────────────────

/// Column name to type, as the database declares them.
async fn columns(db: &mut PgConnection, table: &str) -> anyhow::Result<HashMap<String, String>> {
    let rows: Vec<(String, String)> = sqlx::query_as(
        "SELECT column_name::text, data_type::text FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1",
    )
    .bind(table)
    .fetch_all(db)
    .await?;
    Ok(rows.into_iter().collect())
}

/// `_id` (or `id`, or Mongo's `{ $oid }`) as the row id.
fn row_id(doc: &Map<String, Value>) -> Option<String> {
    let raw = doc.get("_id").filter(|v| !v.is_null()).or_else(|| doc.get("id")).filter(|v| !v.is_null())?;
    let raw = raw.get("$oid").unwrap_or(raw);
    Some(crate::site_api::js_string(raw)).filter(|s| !s.is_empty())
}

fn sql_date(value: &Value) -> Value {
    write::js_date_value(value).map_or(Value::Null, |t| t.format("%Y-%m-%dT%H:%M:%S%.3f").to_string().into())
}

/// `fromClient`: the columns one backup document fills.
fn row(collection: &Collection, columns: &HashMap<String, String>, doc: Value) -> anyhow::Result<Map<String, Value>> {
    let Value::Object(mut doc) = doc else { anyhow::bail!("{}: every entry must be an object", collection.key) };
    let id = row_id(&doc).unwrap_or_else(new_id);
    let mut row = Map::new();
    if collection.json {
        for key in ["_id", "id", "__v"] {
            doc.shift_remove(key);
        }
        if collection.table == "Config" {
            for &secret in CONFIG_SECRETS {
                if let Some(v) = doc.shift_remove(secret) {
                    row.insert(secret.into(), if v.is_null() { v } else { crate::site_api::js_string(&v).into() });
                }
            }
        }
        // Tables whose documents show their dates keep them in columns.
        if ["Ads", "NotificationConfig", "AiPage", "ResumeStudio"].contains(&collection.table) {
            for key in ["createdAt", "updatedAt"] {
                if let Some(v) = doc.shift_remove(key).map(|v| sql_date(&v)).filter(|v| !v.is_null()) {
                    row.insert(key.into(), v);
                }
            }
        }
        row.insert("data".into(), Value::Object(doc));
    } else {
        for (name, value) in doc {
            let Some(kind) = columns.get(&name).filter(|_| name != "id" && name != "searchVector") else { continue };
            let value = if kind.starts_with("timestamp") {
                sql_date(&value)
            } else if kind == "integer" && !value.is_null() {
                match write::parse_int(&value) {
                    Some(n) => n.into(),
                    None => continue,
                }
            } else {
                value
            };
            row.insert(name, value);
        }
    }
    row.insert("id".into(), id.into());
    // Prisma filled these in when a document lacked them.
    let now = Value::from(chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3f").to_string());
    for key in ["createdAt", "updatedAt"] {
        if columns.contains_key(key) {
            row.entry(key).or_insert_with(|| now.clone());
        }
    }
    Ok(row)
}

/// Rows that name the same columns go in one statement; columns a row leaves out get their defaults.
async fn insert(db: &mut PgConnection, table: &str, rows: Vec<Map<String, Value>>) -> anyhow::Result<()> {
    let mut shapes: BTreeMap<Vec<String>, Vec<Value>> = BTreeMap::new();
    for row in rows {
        let mut names: Vec<String> = row.keys().cloned().collect();
        names.sort();
        shapes.entry(names).or_default().push(Value::Object(row));
    }
    for (names, rows) in shapes {
        // Names are columns the database reported, or the fixed ones of `row`.
        let list = names.iter().map(|n| format!(r#""{n}""#)).collect::<Vec<_>>().join(", ");
        let sql = format!(r#"INSERT INTO "{table}" ({list}) SELECT {list} FROM jsonb_populate_recordset(NULL::"{table}", $1::jsonb)"#);
        for batch in rows.chunks(500) {
            sqlx::query(&sql).bind(Value::Array(batch.to_vec()).to_string()).execute(&mut *db).await?;
        }
    }
    Ok(())
}

/// The current values of the columns a backup leaves out, by row id.
async fn kept(db: &mut PgConnection, collection: &Collection) -> anyhow::Result<Vec<(String, Map<String, Value>)>> {
    if collection.keep.is_empty() {
        return Ok(vec![]);
    }
    let sql = format!(r#"SELECT row_to_json(t)::text FROM "{}" t"#, collection.table);
    let rows: Vec<String> = sqlx::query_scalar(&sql).fetch_all(db).await?;
    rows.iter()
        .map(|raw| {
            let Value::Object(mut row) = serde_json::from_str(raw)? else { anyhow::bail!("unreadable row") };
            let id = row.get("id").and_then(Value::as_str).unwrap_or_default().to_string();
            row.retain(|k, v| collection.keep.contains(&k.as_str()) && !v.is_null());
            Ok((id, row))
        })
        .collect()
}

/// Puts the kept values into the new rows that lack them: by id, or (for the one config row) whatever its id.
fn carry_over(collection: &Collection, rows: &mut [Map<String, Value>], kept: &[(String, Map<String, Value>)]) {
    for row in rows {
        let old = if collection.table == "Config" { kept.first() } else { kept.iter().find(|k| row.get("id") == Some(&Value::from(k.0.as_str()))) };
        for (column, value) in old.map(|o| &o.1).into_iter().flatten() {
            row.entry(column.clone()).or_insert_with(|| value.clone());
        }
    }
}

async fn replace_tables(state: &AppState, source: &mut Source) -> Result<Map<String, Value>, RestoreError> {
    let mut results = Map::new();
    let mut transaction = state.db.begin().await?;
    for collection in &COLLECTIONS {
        let Some(documents) = source.take(collection.key, true).await? else {
            results.insert(collection.key.into(), json!({ "status": "skipped", "reason": "missing_or_invalid" }));
            continue;
        };
        let count = documents.len();
        let columns = columns(&mut transaction, collection.table).await?;
        let mut rows = documents.into_iter().map(|d| row(collection, &columns, d)).collect::<anyhow::Result<Vec<_>>>()?;
        let old = kept(&mut transaction, collection).await?;
        carry_over(collection, &mut rows, &old);
        sqlx::query(&format!(r#"DELETE FROM "{}""#, collection.table)).execute(&mut *transaction).await?;
        insert(&mut transaction, collection.table, rows).await?;
        results.insert(collection.key.into(), json!({ "count": count, "status": "imported" }));
    }
    transaction.commit().await?;
    Ok(results)
}

/// Writes the backup's upload files, each through a temporary name so a failure leaves no half file.
async fn restore_files(state: &AppState, archive: &mut Archive) -> anyhow::Result<Option<usize>> {
    let uploads = archive.uploads();
    if uploads.is_empty() {
        return Ok(None);
    }
    let dir = &state.config.uploads_dir;
    tokio::fs::create_dir_all(dir).await?;
    let mut restored = 0;
    for (name, at) in uploads {
        if !safe_name(&name) {
            tracing::warn!(%name, "import: skipping suspicious path");
            continue;
        }
        let partial = TempFile(dir.join(format!(".restore-{}", new_id())));
        let written: anyhow::Result<()> = async {
            let mut out = tokio::fs::OpenOptions::new().write(true).create_new(true).mode(0o644).open(&partial.0).await?;
            archive.unpack(at, &mut out).await?;
            out.flush().await?;
            tokio::fs::rename(&partial.0, dir.join(&name)).await?;
            Ok(())
        }
        .await;
        match written {
            Ok(()) => restored += 1,
            Err(err) => tracing::warn!(%name, error = %err, "import: failed to restore file"),
        }
    }
    Ok(Some(restored))
}

/// Restores the backup file at `path`; the per-collection results.
pub async fn restore_file(state: &AppState, path: &Path) -> Result<Map<String, Value>, RestoreError> {
    let mut source = Source::open(path).await?;
    source.check().await?;
    let mut results = replace_tables(state, &mut source).await?;
    if let Some(archive) = &mut source.archive {
        if let Some(count) = restore_files(state, archive).await? {
            results.insert("images".into(), json!({ "count": count, "status": "restored" }));
        }
    }
    write::notify(state, json!({ "prefixes": [""] })).await;
    Ok(results)
}

/// The reply for a finished or failed restore.
pub fn reply(outcome: Result<Map<String, Value>, RestoreError>) -> Response {
    match outcome {
        Ok(results) => json_status(StatusCode::OK, json!({ "success": true, "results": results })),
        Err(RestoreError::Backup(message)) => failure(StatusCode::BAD_REQUEST, &message),
        Err(RestoreError::Failed(err)) => {
            log_error("/api/admin/import", &err);
            let code = err.downcast_ref::<sqlx::Error>().and_then(|e| e.as_database_error()).and_then(|e| e.code().map(|c| c.into_owned()));
            // Undefined column or table: migrations are pending.
            if matches!(code.as_deref(), Some("42703" | "42P01")) {
                return failure(
                    StatusCode::CONFLICT,
                    "Restore aborted: database schema is out of date (pending migrations). All changes were rolled back — no data was lost. Run `prisma migrate deploy` and retry.",
                );
            }
            failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
        }
    }
}

/// The uploaded backup (form field `file`, or the raw body) saved to `target`.
async fn receive(req: Request, target: &TempFile) -> Result<(), RestoreError> {
    let (parts, body) = req.into_parts();
    let kind = parts.headers.get(header::CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or("").to_ascii_lowercase();
    if !kind.contains("multipart/form-data") {
        let size = save_stream(Body::into_data_stream(body), target).await?;
        return if size == 0 { Err(bad("No file uploaded")) } else { Ok(()) };
    }
    const UNREADABLE: &str = "Failed to read multipart upload. Try selecting the backup again.";
    let mut form = Multipart::from_request(Request::from_parts(parts, body), &()).await.map_err(|_| bad(UNREADABLE))?;
    while let Some(field) = form.next_field().await.map_err(|_| bad(UNREADABLE))? {
        if field.name() == Some("file") {
            save_stream(field, target).await?;
            return Ok(());
        }
    }
    Err(bad("No file uploaded"))
}

/// `POST /api/admin/import`
pub async fn import(State(state): State<AppState>, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let outcome = async {
        let upload = TempFile::new("upload").await?;
        receive(req, &upload).await?;
        restore_file(&state, &upload.0).await
    }
    .await;
    reply(outcome)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn collection(key: &str) -> &'static Collection {
        COLLECTIONS.iter().find(|c| c.key == key).unwrap()
    }

    fn types(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()
    }

    #[test]
    fn relational_rows_keep_known_columns_and_ids() {
        let columns = types(&[("id", "text"), ("title", "text"), ("order", "integer"), ("createdAt", "timestamp without time zone"), ("searchVector", "tsvector")]);
        let out = row(collection("gallery"), &columns, json!({ "_id": { "$oid": "abc" }, "title": "t", "order": "7x", "createdAt": "2026-01-02T03:04:05.000Z", "searchVector": "v", "evil": 1 })).unwrap();
        assert_eq!(Value::Object(out), json!({ "title": "t", "order": 7, "createdAt": "2026-01-02T03:04:05.000", "id": "abc" }));
        assert!(row(collection("gallery"), &columns, json!(5)).is_err());
    }

    #[test]
    fn documents_move_secrets_and_dates_to_columns() {
        let columns = types(&[("data", "jsonb"), ("createdAt", "timestamp"), ("updatedAt", "timestamp")]);
        let mut config = row(collection("config"), &columns, json!({ "_id": "c", "logoText": "x", "encryptedGithubWebhookSecret": "w" })).unwrap();
        assert_eq!((config["data"].clone(), config["encryptedGithubWebhookSecret"].clone()), (json!({ "logoText": "x" }), json!("w")));
        let kept = vec![("old".to_string(), Map::from_iter([("encryptedGithubToken".to_string(), json!("t")), ("encryptedGithubWebhookSecret".to_string(), json!("older"))]))];
        carry_over(collection("config"), std::slice::from_mut(&mut config), &kept);
        // The token the backup never held survives; the secret it does hold wins.
        assert_eq!((config["encryptedGithubToken"].clone(), config["encryptedGithubWebhookSecret"].clone()), (json!("t"), json!("w")));
        let ads = row(collection("ads"), &columns, json!({ "k": 1, "createdAt": "2025-01-01T00:00:00Z" })).unwrap();
        assert_eq!((ads["data"].clone(), ads["createdAt"].clone()), (json!({ "k": 1 }), json!("2025-01-01T00:00:00.000")));
    }

    #[test]
    fn only_data_folder_files_name_collections() {
        assert_eq!(in_data_folder("data/blogs.json"), Some("blogs"));
        assert_eq!(in_data_folder("x/DATA/blogs.JSON"), Some("blogs"));
        for no in ["blogs.json", "mydata/blogs.json", "data/blogs.txt", "data/é"] {
            assert_eq!(in_data_folder(no), None, "{no}");
        }
        assert!(safe_name("a.png") && !safe_name("../a") && !safe_name("a/b") && !safe_name("a\\b"));
    }

    #[tokio::test]
    async fn a_zip_without_data_is_refused() {
        let path = std::env::temp_dir().join(format!("aiyu-restore-{}.zip", new_id()));
        let file = TempFile(path);
        let mut zip = async_zip::tokio::write::ZipFileWriter::with_tokio(tokio::fs::File::create(&file.0).await.unwrap());
        let entry = async_zip::ZipEntryBuilder::new("uploads/a.txt".into(), async_zip::Compression::Stored);
        zip.write_entry_whole(entry, b"x").await.unwrap();
        zip.close().await.unwrap().into_inner().flush().await.unwrap();
        assert!(matches!(Source::open(&file.0).await, Err(RestoreError::Backup(m)) if m.contains("data.json")));
    }
}
