//! The content of a new site (`RUN_SEED`), from the `seed.json` and AI page defaults the web build writes.

use anyhow::Context;
use serde_json::{Map, Value, json};
use sqlx::SqliteConnection;

use crate::{
    AppState,
    admin_content::{DEPLOYMENT, PROJECT, SOCIAL},
    db::{self, new_id},
    write::{self, Table},
};

#[derive(Debug, PartialEq)]
pub enum Mode {
    /// Seed only a database that has no content (the default, and `auto` or `true`).
    IfEmpty,
    /// Replace the projects, apps, about, home, header and socials with the defaults. Destructive.
    Force,
    Never,
}

pub fn mode(value: Option<&str>) -> Mode {
    match value.map(str::trim).unwrap_or("").to_ascii_lowercase().as_str() {
        "force" => Mode::Force,
        "" | "auto" | "true" => Mode::IfEmpty,
        _ => Mode::Never,
    }
}

/// Runs at startup, after the migrations.
pub async fn run(state: &AppState, mode: Mode) -> anyhow::Result<()> {
    if mode == Mode::Never {
        return Ok(());
    }
    let web = state.web.as_ref().context("the web build is not loaded")?;
    let seed: Value = serde_json::from_str(&tokio::fs::read_to_string(state.config.web_dir.join("seed.json")).await.context("seed.json")?)?;
    let mut tx = db::begin(&state.db).await?;
    let empty: bool = sqlx::query_scalar(
        r#"SELECT NOT (EXISTS(SELECT 1 FROM "Config") OR EXISTS(SELECT 1 FROM "Project") OR EXISTS(SELECT 1 FROM "About") OR EXISTS(SELECT 1 FROM "Home"))"#,
    )
    .fetch_one(&mut *tx)
    .await?;
    if !empty && mode == Mode::IfEmpty {
        return Ok(());
    }
    tracing::info!(?mode, "seeding the database");
    content(&mut tx, &seed, &web.ai_defaults).await?;
    tx.commit().await?;
    // The AI Hub tables: each one is filled only while it has no rows.
    crate::admin_ai::seed(state, &web.ai_defaults).await?;
    Ok(())
}

async fn content(db: &mut SqliteConnection, seed: &Value, ai_page: &Value) -> anyhow::Result<()> {
    for table in ["Project", "Deployment", "About", "Home", "Header", "Social"] {
        sqlx::query(&format!(r#"DELETE FROM "{table}""#)).execute(&mut *db).await?;
    }
    for (table, key) in [(&PROJECT, "projects"), (&DEPLOYMENT, "deployments"), (&SOCIAL, "socials")] {
        for doc in seed[key].as_array().into_iter().flatten() {
            entry(db, table, doc).await?;
        }
    }
    for (table, key) in [("About", "about"), ("Home", "home"), ("Header", "header")] {
        document(db, table, &seed[key]).await?;
    }
    // Settings the admin may already have saved are left alone.
    for (table, data) in [("Config", &seed["config"]), ("SeoConfig", &seed["seo"]), ("AiPage", ai_page)] {
        let present: bool = sqlx::query_scalar(&format!(r#"SELECT EXISTS(SELECT 1 FROM "{table}")"#)).fetch_one(&mut *db).await?;
        if !present {
            document(db, table, data).await?;
        }
    }
    Ok(())
}

async fn entry(db: &mut SqliteConnection, table: &Table, doc: &Value) -> anyhow::Result<()> {
    let mut doc = doc.clone();
    // `Number(displayOrder) || 0`
    if let Some(order) = doc.get("displayOrder").map(|o| write::parse_int(o).unwrap_or(0)) {
        doc["displayOrder"] = order.into();
    }
    let mut row = write::prepare(table, &doc)?;
    row.insert("id".into(), new_id().into());
    db::insert_row(db, table.name, &row).await?;
    Ok(())
}

/// A one-row json document.
async fn document(db: &mut SqliteConnection, table: &str, data: &Value) -> anyhow::Result<()> {
    anyhow::ensure!(data.is_object(), "no {table} defaults");
    let row: Map<String, Value> = Map::from_iter([("id".to_string(), json!(new_id())), ("data".to_string(), data.clone())]);
    db::insert_row(db, table, &row).await?;
    Ok(())
}
