//! SQLite access: one file in WAL mode, the schema in `migrations/`, and the few helpers that stand where
//! Postgres had `row_to_json` and typed binds.

use anyhow::Context;
use chrono::NaiveDateTime;
use serde_json::{Map, Value};
use sqlx::{
    ConnectOptions, Decode, Encode, Sqlite, Type,
    encode::IsNull,
    error::BoxDynError,
    sqlite::{SqliteArguments, SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous, SqliteTypeInfo, SqliteValueRef},
};
use std::{path::Path, time::Duration};
use Col::{Bool, Int, Json, List, Text, Time};

pub type Db = sqlx::SqlitePool;
pub type Query<'q> = sqlx::query::Query<'q, Sqlite, SqliteArguments<'q>>;

/// Applied in order; `PRAGMA user_version` counts the ones a database has. Never edit a released file.
const MIGRATIONS: &[&str] = &[
    include_str!("../migrations/0001_init.sql"),
    include_str!("../migrations/0002_agent_tokens.sql"),
];

/// The pool connects lazily, so this never blocks or fails on a missing file (unless `create` is set, nothing is
/// written either).
pub fn connect(path: &Path, create: bool) -> Db {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(create)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .foreign_keys(true)
        // SQLite has one writer at a time: the others wait for it.
        .busy_timeout(Duration::from_secs(10))
        .disable_statement_logging();
    SqlitePoolOptions::new().max_connections(4).min_connections(0).connect_lazy_with(options)
}

/// Brings the schema up to date. Each file runs in its own transaction with its version bump.
pub async fn migrate(db: &Db) -> anyhow::Result<()> {
    for (index, sql) in MIGRATIONS.iter().enumerate() {
        let version = index as i64 + 1;
        let mut tx = begin(db).await?;
        let current: i64 = sqlx::query_scalar("PRAGMA user_version").fetch_one(&mut *tx).await?;
        anyhow::ensure!(current <= MIGRATIONS.len() as i64, "the database is newer than this server (schema {current})");
        if current < version {
            sqlx::raw_sql(sql).execute(&mut *tx).await.with_context(|| format!("migration {version}"))?;
            sqlx::raw_sql(&format!("PRAGMA user_version = {version}")).execute(&mut *tx).await?;
        }
        tx.commit().await?;
    }
    Ok(())
}

/// A transaction that will write: the write lock is taken at once, so it cannot fail half way for another writer.
pub async fn begin(db: &Db) -> sqlx::Result<sqlx::Transaction<'static, Sqlite>> {
    db.begin_with("BEGIN IMMEDIATE").await
}

// ── times ──────────────────────────────────────────────────────────────────────────────────────────────

/// Every stored time, always with three decimals so that text order is time order. UTC.
pub fn format_time(t: NaiveDateTime) -> String {
    t.format("%Y-%m-%dT%H:%M:%S%.3f").to_string()
}

/// A stored time, bound and read as text.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Stamp(pub NaiveDateTime);

impl Type<Sqlite> for Stamp {
    fn type_info() -> SqliteTypeInfo {
        <str as Type<Sqlite>>::type_info()
    }
    fn compatible(ty: &SqliteTypeInfo) -> bool {
        <String as Type<Sqlite>>::compatible(ty)
    }
}

impl<'q> Encode<'q, Sqlite> for Stamp {
    fn encode_by_ref(&self, buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer<'q>) -> Result<IsNull, BoxDynError> {
        <String as Encode<Sqlite>>::encode(format_time(self.0), buf)
    }
}

impl<'r> Decode<'r, Sqlite> for Stamp {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, BoxDynError> {
        let text = <&str as Decode<Sqlite>>::decode(value)?;
        Ok(Self(NaiveDateTime::parse_from_str(text, "%Y-%m-%dT%H:%M:%S%.f")?))
    }
}

// ── the tables ─────────────────────────────────────────────────────────────────────────────────────────

/// What a column holds.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Col {
    Text,
    Int,
    Bool,
    Time,
    /// Any JSON, stored as text.
    Json,
    /// A string array, stored as JSON text.
    List,
}

/// Every table, parents before the tables that reference them, with its columns in their stored order.
/// Kept equal to `migrations/` by the `schema_matches_the_migrations` test.
#[rustfmt::skip]
pub const TABLES: &[(&str, &[(&str, Col)])] = &[
    ("About", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("Ads", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("AgentToken", &[("id", Text), ("name", Text), ("tokenHash", Text), ("lastFour", Text), ("scope", Text), ("expiresAt", Time), ("createdAt", Time), ("lastUsedAt", Time), ("revokedAt", Time)]),
    ("AiCredit", &[("id", Text), ("name", Text), ("offer", Text), ("url", Text), ("noCard", Bool), ("freeApi", Bool), ("note", Text), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("AiLog", &[("id", Text), ("provider", Text), ("model", Text), ("mode", Text), ("prompt", Text), ("response", Text), ("inputTokens", Int), ("outputTokens", Int), ("totalTokens", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("AiPage", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("AiPrompt", &[("id", Text), ("title", Text), ("role", Text), ("prompt", Text), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("AiRecommendation", &[("id", Text), ("name", Text), ("url", Text), ("rating", Int), ("accent", Text), ("blurb", Text), ("tags", List), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("AiSkillCategory", &[("id", Text), ("label", Text), ("accent", Text), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("AnalyticsDaily", &[("id", Text), ("day", Text), ("type", Text), ("entityType", Text), ("entityId", Text), ("views", Int), ("uniques", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("AnalyticsEvent", &[("id", Text), ("type", Text), ("path", Text), ("entityType", Text), ("entityId", Text), ("entitySlug", Text), ("referrer", Text), ("referrerType", Text), ("device", Text), ("country", Text), ("visitorHash", Text), ("sessionId", Text), ("isBot", Bool), ("meta", Json), ("createdAt", Time)]),
    ("AuditLog", &[("id", Text), ("action", Text), ("category", Text), ("details", Text), ("ipAddress", Text), ("userAgent", Text), ("createdAt", Time)]),
    ("Blog", &[("id", Text), ("title", Text), ("slug", Text), ("content", Text), ("image", Text), ("imageAlt", Text), ("excerpt", Text), ("seoTitle", Text), ("seoDescription", Text), ("canonicalUrl", Text), ("keywords", List), ("socialTitle", Text), ("socialDescription", Text), ("socialImage", Text), ("socialImageAlt", Text), ("noIndex", Bool), ("tags", List), ("date", Text), ("published", Bool), ("isAutomated", Bool), ("isFlagged", Bool), ("flagReason", Text), ("reviewStatus", Text), ("createdAt", Time), ("updatedAt", Time)]),
    ("Config", &[("id", Text), ("data", Json), ("encryptedGithubToken", Text), ("encryptedGeminiApiKey", Text), ("encryptedGroqApiKey", Text), ("encryptedOpenRouterApiKey", Text), ("blogApiTokenHash", Text), ("createdAt", Time), ("updatedAt", Time), ("encryptedGithubWebhookSecret", Text)]),
    ("ContactMessage", &[("id", Text), ("name", Text), ("email", Text), ("message", Text), ("read", Bool), ("createdAt", Time)]),
    ("Cron", &[("id", Text), ("name", Text), ("type", Text), ("schedule", Text), ("enabled", Bool), ("action", Text), ("webhookUrl", Text), ("webhookUrlType", Text), ("webhookMethod", Text), ("webhookHeaders", Json), ("webhookHeadersType", Text), ("webhookBody", Text), ("webhookBodyType", Text), ("webhookEnv", Json), ("lastRun", Time), ("lastRunStatus", Text), ("lastRunLog", Text), ("nextRun", Time), ("notificationEnabled", Bool), ("notificationOn", Text), ("retryEnabled", Bool), ("retryType", Text), ("retryCount", Int), ("retryDelay", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("CronEnv", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("Deployment", &[("id", Text), ("name", Text), ("slug", Text), ("techStack", List), ("status", Text), ("appType", Text), ("environment", Text), ("hostingProvider", Text), ("description", Text), ("hostedUrl", Text), ("blogLink", Text), ("image", Text), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time), ("projectId", Text)]),
    ("Gallery", &[("id", Text), ("src", Text), ("thumbnail", Text), ("description", Text), ("width", Int), ("height", Int), ("isPinned", Bool), ("order", Int), ("createdAt", Time)]),
    ("GitHub", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("Header", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("Home", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("IndexingLog", &[("id", Text), ("url", Text), ("type", Text), ("status", Text), ("response", Text), ("createdAt", Time)]),
    ("LegalApp", &[("id", Text), ("name", Text), ("slug", Text), ("packageName", Text), ("description", Text), ("contactEmail", Text), ("deploymentId", Text), ("createdAt", Time), ("updatedAt", Time)]),
    ("McpConfig", &[("id", Text), ("data", Json), ("mcpTokenHash", Text), ("mcpTokenLast4", Text), ("mcpTokenUpdatedAt", Time), ("createdAt", Time), ("updatedAt", Time)]),
    ("NotificationConfig", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("Project", &[("id", Text), ("name", Text), ("slug", Text), ("techStack", List), ("year", Text), ("status", Text), ("projectType", Text), ("description", Text), ("codeLink", Text), ("blogLink", Text), ("image", Text), ("displayOrder", Int), ("source", Text), ("repoFullName", Text), ("repoData", Json), ("readme", Text), ("readmeFetchedAt", Time), ("syncedAt", Time), ("pinnedFields", List), ("createdAt", Time), ("updatedAt", Time)]),
    ("ResumeStudio", &[("id", Text), ("data", Json), ("createdAt", Time), ("updatedAt", Time)]),
    ("SeoConfig", &[("id", Text), ("data", Json), ("encryptedGoogleServiceAccount", Text), ("createdAt", Time), ("updatedAt", Time)]),
    ("Session", &[("id", Text), ("jti", Text), ("label", Text), ("ipAddress", Text), ("userAgent", Text), ("lastSeenAt", Time), ("revokedAt", Time), ("expiresAt", Time), ("createdAt", Time)]),
    ("Social", &[("id", Text), ("name", Text), ("url", Text), ("iconName", Text), ("isHidden", Bool)]),
    ("Theme", &[("id", Text), ("name", Text), ("slug", Text), ("description", Text), ("isCustom", Bool), ("isPredefined", Bool), ("variants", Json), ("previewImage", Text), ("author", Text), ("createdAt", Time), ("updatedAt", Time)]),
    ("UptimeCheck", &[("id", Text), ("target", Text), ("label", Text), ("source", Text), ("status", Text), ("statusCode", Int), ("latencyMs", Int), ("error", Text), ("checkedAt", Time)]),
    ("UptimeTarget", &[("id", Text), ("label", Text), ("url", Text), ("enabled", Bool), ("createdAt", Time)]),
    ("AiSkill", &[("id", Text), ("categoryId", Text), ("name", Text), ("description", Text), ("url", Text), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time)]),
    ("CronLog", &[("id", Text), ("cronId", Text), ("cronName", Text), ("action", Text), ("status", Text), ("method", Text), ("url", Text), ("log", Text), ("durationMs", Int), ("ranAt", Time), ("createdAt", Time), ("updatedAt", Time)]),
    ("LegalDocument", &[("id", Text), ("appId", Text), ("kind", Text), ("title", Text), ("slug", Text), ("format", Text), ("content", Text), ("seoDescription", Text), ("effectiveDate", Text), ("published", Bool), ("noIndex", Bool), ("displayOrder", Int), ("createdAt", Time), ("updatedAt", Time)]),
];

/// The columns of a table. `table` is always a constant of this crate.
pub fn columns(table: &str) -> &'static [(&'static str, Col)] {
    TABLES.iter().find(|(name, _)| *name == table).map(|(_, columns)| *columns).unwrap_or_else(|| panic!("unknown table {table}"))
}

pub fn column(table: &str, name: &str) -> Option<Col> {
    columns(table).iter().find(|(n, _)| *n == name).map(|(_, col)| *col)
}

/// The SQL expression for one row as JSON text (Postgres `row_to_json`): booleans as booleans, JSON columns
/// nested. It names bare columns, so it works in `SELECT ... FROM` the table and in `RETURNING`.
pub fn row_json(table: &str) -> String {
    let fields: Vec<String> = columns(table)
        .iter()
        .map(|(name, col)| match col {
            Col::Bool => format!(r#"'{name}', json(CASE "{name}" WHEN 1 THEN 'true' WHEN 0 THEN 'false' END)"#),
            Col::Json | Col::List => format!(r#"'{name}', json("{name}")"#),
            Col::Text | Col::Int | Col::Time => format!(r#"'{name}', "{name}""#),
        })
        .collect();
    format!("json_object({})", fields.join(", "))
}

/// Binds a JSON value to a column, with the type checks Postgres made when it filled a row from JSON.
pub fn bind<'q>(query: Query<'q>, name: &str, col: Col, value: Value) -> anyhow::Result<Query<'q>> {
    let wrong = || anyhow::anyhow!("invalid value for {name}");
    Ok(match (col, value) {
        (_, Value::Null) => query.bind(None::<String>),
        (Col::Text, Value::String(text)) => query.bind(text),
        // Postgres stored another type in a text column as its JSON text.
        (Col::Text, other) => query.bind(other.to_string()),
        (Col::Int, Value::Number(n)) => query.bind(n.as_i64().and_then(|n| i32::try_from(n).ok()).ok_or_else(wrong)?),
        (Col::Int, Value::String(s)) => query.bind(s.trim().parse::<i32>().map_err(|_| wrong())?),
        (Col::Bool, Value::Bool(b)) => query.bind(b),
        (Col::Time, value) => query.bind(Stamp(crate::write::js_date_value(&value).ok_or_else(wrong)?)),
        (Col::Json, value) => query.bind(value.to_string()),
        (Col::List, value) if value.as_array().is_some_and(|a| a.iter().all(|v| v.is_string() || v.is_null())) => query.bind(value.to_string()),
        _ => return Err(wrong()),
    })
}

/// Column names, quoted, and their placeholders. A name the table does not have is an error.
fn named<'a>(table: &str, row: &'a Map<String, Value>) -> anyhow::Result<Vec<(&'a str, Col, &'a Value)>> {
    row.iter()
        .map(|(name, value)| Ok((name.as_str(), column(table, name).with_context(|| format!("{table} has no column {name}"))?, value)))
        .collect()
}

/// `INSERT` of the named columns; the others take their defaults. Returns the new row as JSON text.
pub async fn insert_row<'e>(db: impl sqlx::Executor<'e, Database = Sqlite>, table: &str, row: &Map<String, Value>) -> anyhow::Result<String> {
    let fields = named(table, row)?;
    let list = fields.iter().map(|f| format!(r#""{}""#, f.0)).collect::<Vec<_>>().join(", ");
    let marks = vec!["?"; fields.len()].join(", ");
    let sql = format!(r#"INSERT INTO "{table}" ({list}) VALUES ({marks}) RETURNING {}"#, row_json(table));
    let mut query = sqlx::query(&sql);
    for (name, col, value) in fields {
        query = bind(query, name, col, value.clone())?;
    }
    Ok(sqlx::Row::try_get(&query.fetch_one(db).await?, 0)?)
}

/// `UPDATE` of the named columns of the row `id`. Returns the new row, or None when there is no such row.
pub async fn update_row<'e>(db: impl sqlx::Executor<'e, Database = Sqlite>, table: &str, id: &str, row: &Map<String, Value>) -> anyhow::Result<Option<String>> {
    let fields = named(table, row)?;
    anyhow::ensure!(!fields.is_empty(), "nothing to update");
    let set = fields.iter().map(|f| format!(r#""{}" = ?"#, f.0)).collect::<Vec<_>>().join(", ");
    let sql = format!(r#"UPDATE "{table}" SET {set} WHERE id = ? RETURNING {}"#, row_json(table));
    let mut query = sqlx::query(&sql);
    for (name, col, value) in fields {
        query = bind(query, name, col, value.clone())?;
    }
    match query.bind(id.to_string()).fetch_optional(db).await? {
        Some(row) => Ok(Some(sqlx::Row::try_get(&row, 0)?)),
        None => Ok(None),
    }
}

/// A JSON string array for `IN (SELECT value FROM json_each($n))`.
pub fn json_list<S: AsRef<str>>(items: &[S]) -> String {
    Value::Array(items.iter().map(|s| Value::from(s.as_ref())).collect()).to_string()
}

/// `%`, `_` and `\` as literal characters of a `LIKE ... ESCAPE '\'` pattern that matches `text` anywhere.
/// `LIKE` ignores case for ASCII letters only.
pub fn like(text: &str) -> String {
    let escaped = text.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    format!("%{escaped}%")
}

// ── ids ────────────────────────────────────────────────────────────────────────────────────────────────

/// A row id: `c` + time + 16 random base36 characters, the shape of the cuids of the older rows.
pub fn new_id() -> String {
    use rand::Rng;
    const DIGITS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut ms = chrono::Utc::now().timestamp_millis() as u64;
    let mut time = [b'0'; 8];
    for d in time.iter_mut().rev() {
        *d = DIGITS[(ms % 36) as usize];
        ms /= 36;
    }
    let mut rng = rand::thread_rng();
    let random = (0..16).map(|_| DIGITS[rng.gen_range(0..36)] as char);
    std::iter::once('c').chain(time.map(char::from)).chain(random).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn new_ids_look_like_cuids_and_differ() {
        let (a, b) = (new_id(), new_id());
        assert!(a.len() == 25 && a.starts_with('c') && a.chars().all(|c| c.is_ascii_digit() || c.is_ascii_lowercase()), "{a}");
        assert_ne!(a, b);
    }

    /// A migrated database in memory (one connection: every new one would be empty).
    async fn memory() -> Db {
        let db = SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.unwrap();
        migrate(&db).await.unwrap();
        db
    }

    #[tokio::test]
    async fn schema_matches_the_migrations() {
        let db = memory().await;
        let tables: Vec<String> = sqlx::query_scalar("SELECT name FROM sqlite_schema WHERE type = 'table' AND sql LIKE 'CREATE TABLE%' AND name NOT LIKE 'BlogSearch%'")
            .fetch_all(&db).await.unwrap();
        assert_eq!(tables.len(), TABLES.len(), "{tables:?}");
        for (table, columns) in TABLES {
            let stored: Vec<(String, String)> = sqlx::query_as("SELECT name, type FROM pragma_table_info($1) ORDER BY cid").bind(table).fetch_all(&db).await.unwrap();
            let want: Vec<(String, String)> = columns.iter().map(|(n, c)| (n.to_string(), if matches!(c, Col::Int | Col::Bool) { "INTEGER" } else { "TEXT" }.to_string())).collect();
            assert_eq!(stored, want, "{table}");
        }
        // A second run changes nothing.
        migrate(&db).await.unwrap();
    }

    #[tokio::test]
    async fn rows_round_trip_with_their_types() {
        let db = memory().await;
        let row = json!({ "id": "b", "title": "Rust notes", "content": "borrowing", "date": "2026-01-01", "tags": ["a", "b"], "published": true,
            "createdAt": "2026-01-02T05:30:00+05:30" });
        let raw = insert_row(&db, "Blog", row.as_object().unwrap()).await.unwrap();
        let stored: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(stored["tags"], json!(["a", "b"]));
        assert_eq!(stored["published"], json!(true));
        assert_eq!(stored["noIndex"], json!(false));
        assert_eq!(stored["image"], Value::Null);
        assert_eq!(stored["createdAt"], "2026-01-02T00:00:00.000");
        // The default time has the same shape as a bound one.
        assert_eq!(stored["updatedAt"].as_str().unwrap().len(), "2026-01-02T00:00:00.000".len());
        assert!(stored["updatedAt"].as_str().unwrap().contains('T'));
        let read: String = sqlx::query_scalar(&format!(r#"SELECT {} FROM "Blog""#, row_json("Blog"))).fetch_one(&db).await.unwrap();
        assert_eq!(read, raw);
        let when: Stamp = sqlx::query_scalar(r#"SELECT "createdAt" FROM "Blog""#).fetch_one(&db).await.unwrap();
        assert_eq!(format_time(when.0), "2026-01-02T00:00:00.000");
        for bad in [json!({ "published": "yes" }), json!({ "createdAt": "soon" }), json!({ "tags": "a" }), json!({ "nope": 1 })] {
            assert!(update_row(&db, "Blog", "b", bad.as_object().unwrap()).await.is_err(), "{bad}");
        }
        assert!(update_row(&db, "Blog", "missing", json!({ "title": "x" }).as_object().unwrap()).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn blog_search_follows_writes() {
        let db = memory().await;
        let row = json!({ "id": "b", "title": "Learning Rust", "content": "about ownership", "date": "d", "tags": ["systems"] });
        insert_row(&db, "Blog", row.as_object().unwrap()).await.unwrap();
        let hits = async |q: &str| -> i64 {
            sqlx::query_scalar(r#"SELECT count(*) FROM "BlogSearch" WHERE "BlogSearch" MATCH $1"#).bind(q.to_string()).fetch_one(&db).await.unwrap()
        };
        // Stemmed: "learn" finds "Learning"; tags and content are indexed.
        assert_eq!((hits("\"learn\"").await, hits("\"system\"").await, hits("\"ownership\"").await), (1, 1, 1));
        update_row(&db, "Blog", "b", json!({ "content": "about lifetimes" }).as_object().unwrap()).await.unwrap();
        assert_eq!((hits("\"ownership\"").await, hits("\"lifetimes\"").await), (0, 1));
        sqlx::query(r#"DELETE FROM "Blog""#).execute(&db).await.unwrap();
        assert_eq!(hits("\"lifetimes\"").await, 0);
    }
}
