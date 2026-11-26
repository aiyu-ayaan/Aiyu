//! `aiyu-server import-postgres`: the one-time copy of a Postgres install into a new SQLite file. Postgres is read in
//! one read-only snapshot and never changed. Every row is compared afterwards by hash; the file takes its final name
//! only when everything matches.

use anyhow::Context;
use futures_util::TryStreamExt;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use sqlx::{
    ConnectOptions, Connection, PgConnection,
    postgres::PgConnectOptions,
};
use std::{
    collections::{BTreeMap, HashSet},
    path::{Path, PathBuf},
    str::FromStr,
};

use crate::db::{self, Col, TABLES};

/// Columns SQLite does not keep: the search vector is rebuilt as the `BlogSearch` index.
const IGNORED: &[(&str, &str)] = &[("Blog", "searchVector")];

/// Row id to the hash of the row, per table.
type Hashes = BTreeMap<String, [u8; 32]>;

pub struct Copied {
    pub table: &'static str,
    pub rows: usize,
    /// SHA-256 over the row hashes in id order: the same on both sides.
    pub hash: String,
}

/// Prisma's `?schema=public` is not a libpq parameter; drop it (public is the default search_path).
fn strip_prisma_params(url: &str) -> String {
    let Some((base, query)) = url.split_once('?') else { return url.to_string() };
    let kept: Vec<&str> = query.split('&').filter(|p| !p.starts_with("schema=") && !p.is_empty()).collect();
    if kept.is_empty() { base.to_string() } else { format!("{base}?{}", kept.join("&")) }
}

/// A row as both databases show it, in one canonical form: sorted keys, three-decimal times.
fn row_hash(table: &str, row: &Map<String, Value>) -> anyhow::Result<[u8; 32]> {
    fn sorted(value: &Value) -> Value {
        match value {
            Value::Object(map) => {
                let ordered: BTreeMap<&String, Value> = map.iter().map(|(k, v)| (k, sorted(v))).collect();
                Value::Object(ordered.into_iter().map(|(k, v)| (k.clone(), v)).collect())
            }
            Value::Array(items) => Value::Array(items.iter().map(sorted).collect()),
            other => other.clone(),
        }
    }
    let mut canonical = row.clone();
    for (name, col) in db::columns(table) {
        let value = canonical.get_mut(*name).with_context(|| format!("{table}.{name} is missing"))?;
        if *col == Col::Time && !value.is_null() {
            let time = crate::write::js_date_value(value).with_context(|| format!("{table}.{name}: unreadable time {value}"))?;
            *value = db::format_time(time).into();
        }
    }
    Ok(Sha256::digest(sorted(&Value::Object(canonical)).to_string().as_bytes()).into())
}

fn digest(hashes: &Hashes) -> String {
    let mut all = Sha256::new();
    for (id, hash) in hashes {
        all.update(id.as_bytes());
        all.update(hash);
    }
    hex::encode(all.finalize())
}

/// The source must have exactly the tables and columns the SQLite schema has: nothing may be dropped silently.
async fn check_schema(pg: &mut PgConnection) -> anyhow::Result<()> {
    let found: Vec<(String, String)> = sqlx::query_as(
        "SELECT c.table_name::text, c.column_name::text FROM information_schema.columns c
         JOIN information_schema.tables t USING (table_schema, table_name)
         WHERE c.table_schema = current_schema() AND t.table_type = 'BASE TABLE'",
    )
    .fetch_all(pg)
    .await?;
    let found: HashSet<(&str, &str)> = found
        .iter()
        .map(|(t, c)| (t.as_str(), c.as_str()))
        .filter(|(t, c)| *t != "_prisma_migrations" && !IGNORED.contains(&(t, c)))
        .collect();
    let wanted: HashSet<(&str, &str)> = TABLES.iter().flat_map(|(t, columns)| columns.iter().map(move |(c, _)| (*t, *c))).collect();
    let list = |set: &HashSet<(&str, &str)>, other: &HashSet<(&str, &str)>| {
        let mut names: Vec<String> = set.difference(other).map(|(t, c)| format!("{t}.{c}")).collect();
        names.sort();
        names.join(", ")
    };
    let (missing, unknown) = (list(&wanted, &found), list(&found, &wanted));
    anyhow::ensure!(missing.is_empty(), "the Postgres schema is older than this server (missing {missing}). Start the last Postgres release once so it applies its migrations.");
    anyhow::ensure!(unknown.is_empty(), "Postgres has columns this server would drop: {unknown}");
    Ok(())
}

/// Copies every table into the new database at `target`, then compares. Errors leave no database behind.
pub async fn run(source: &str, target: &Path) -> anyhow::Result<Vec<Copied>> {
    anyhow::ensure!(!target.exists(), "{} already exists; nothing was copied (move it away to import again)", target.display());
    if let Some(parent) = target.parent().filter(|p| !p.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent)?;
    }
    let partial = with_suffix(target, ".importing");
    remove(&partial);
    let result = copy(source, &partial).await;
    match result {
        Ok(copied) => {
            std::fs::rename(&partial, target)?;
            Ok(copied)
        }
        Err(err) => {
            remove(&partial);
            Err(err)
        }
    }
}

fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

fn remove(path: &Path) {
    for file in [path.to_path_buf(), with_suffix(path, "-wal"), with_suffix(path, "-shm")] {
        let _ = std::fs::remove_file(file);
    }
}

async fn copy(source: &str, path: &Path) -> anyhow::Result<Vec<Copied>> {
    let options = PgConnectOptions::from_str(&strip_prisma_params(source))?.disable_statement_logging();
    let mut pg = options.connect().await.context("connecting to Postgres")?;
    // One snapshot for the whole copy, and no way to write.
    let mut snapshot = pg.begin_with("BEGIN ISOLATION LEVEL REPEATABLE READ, READ ONLY").await?;
    check_schema(&mut snapshot).await?;

    let sqlite = db::connect(path, true);
    db::migrate(&sqlite).await?;
    let mut tx = db::begin(&sqlite).await?;
    let mut sources = Vec::new();
    for &(table, _) in TABLES {
        let mut hashes = Hashes::new();
        // `ctid`: keep the order rows come in when a query asks for none.
        let sql = format!(r#"SELECT row_to_json(t)::text FROM "{table}" t ORDER BY ctid"#);
        let mut rows = sqlx::query_scalar::<_, String>(&sql).fetch(&mut *snapshot);
        while let Some(raw) = rows.try_next().await? {
            let Value::Object(mut row) = serde_json::from_str(&raw)? else { anyhow::bail!("{table}: unreadable row") };
            for (t, column) in IGNORED {
                if *t == table {
                    row.shift_remove(*column);
                }
            }
            let id = row.get("id").and_then(Value::as_str).with_context(|| format!("{table}: a row has no id"))?.to_string();
            db::insert_row(&mut *tx, table, &row).await.with_context(|| format!("{table} row {id}"))?;
            hashes.insert(id.clone(), row_hash(table, &row)?);
        }
        sources.push((table, hashes));
    }
    tx.commit().await?;
    snapshot.rollback().await?;
    pg.close().await?;

    // Read everything back and compare, row by row.
    let mut copied = Vec::new();
    for (table, source) in sources {
        let sql = format!(r#"SELECT {} FROM "{table}""#, db::row_json(table));
        let mut stored = Hashes::new();
        let mut rows = sqlx::query_scalar::<_, String>(&sql).fetch(&sqlite);
        while let Some(raw) = rows.try_next().await? {
            let Value::Object(row) = serde_json::from_str(&raw)? else { anyhow::bail!("{table}: unreadable copy") };
            let id = row["id"].as_str().unwrap_or_default().to_string();
            stored.insert(id, row_hash(table, &row)?);
        }
        anyhow::ensure!(stored.len() == source.len(), "{table}: {} rows in Postgres, {} copied", source.len(), stored.len());
        if let Some((id, _)) = source.iter().find(|(id, hash)| stored.get(*id) != Some(hash)) {
            anyhow::bail!("{table}: row {id} differs after the copy");
        }
        copied.push(Copied { table, rows: stored.len(), hash: digest(&stored) });
    }
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)").execute(&sqlite).await?;
    sqlite.close().await;
    Ok(copied)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn hashes_ignore_key_order_and_time_precision_only() {
        let row = |v: Value| row_hash("Social", v.as_object().unwrap()).unwrap();
        let a = json!({ "id": "1", "name": "n", "url": "u", "iconName": "i", "isHidden": false });
        let b = json!({ "isHidden": false, "iconName": "i", "url": "u", "name": "n", "id": "1" });
        let c = json!({ "id": "1", "name": "N", "url": "u", "iconName": "i", "isHidden": false });
        assert_eq!(row(a.clone()), row(b));
        assert_ne!(row(a), row(c));
        let time = |t: &str| row_hash("About", json!({ "id": "1", "data": { "b": 1, "a": [t] }, "createdAt": t, "updatedAt": t }).as_object().unwrap()).unwrap();
        // The column is normalized, the text inside the JSON is not.
        assert_ne!(time("2026-01-02T03:04:05.1"), time("2026-01-02T03:04:05.100"));
        assert!(row_hash("Social", json!({ "id": "1" }).as_object().unwrap()).is_err());
    }

    #[test]
    fn strips_schema_param() {
        assert_eq!(strip_prisma_params("postgresql://u:p@h:5432/db?schema=public"), "postgresql://u:p@h:5432/db");
        assert_eq!(strip_prisma_params("postgres://h/db?sslmode=disable&schema=x"), "postgres://h/db?sslmode=disable");
    }
}
