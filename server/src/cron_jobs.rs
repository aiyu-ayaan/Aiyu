//! Running the scheduled tasks (src/utils/cronRunner.js) and the scheduler. The scheduler runs unless
//! `CRON_RUNNER=off` (set it on all but one server when several share a database).

use chrono::{DateTime, Timelike, Utc};
use serde_json::{Map, Value, json};
use sqlx::FromRow;
use std::{
    collections::HashSet,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::{
    AppState,
    cron::{self, Schedule},
    cron_template::{Context, Env},
    db::new_id,
    drive, export, github_sync, health, notify, pages,
    site_api::js_string,
    storage,
    web::site_url,
};

/// Most rows one placeholder may pull into a webhook (`CRON_TEMPLATE_MAX_ROWS`).
fn row_limit() -> usize {
    std::env::var("CRON_TEMPLATE_MAX_ROWS").ok().and_then(|v| v.parse().ok()).filter(|n| *n > 0).unwrap_or(500)
}

/// The longest a webhook call may take.
const WEBHOOK_TIMEOUT: Duration = Duration::from_secs(5 * 60);
const SESSION_RETENTION_DAYS: i64 = 7;

/// Jobs every install needs: `(action, name, schedule, enabled)`.
const SYSTEM_JOBS: [(&str, &str, &str, bool); 8] = [
    ("clean_unreferenced", "Unreferenced Uploads Cleanup", "0 2 * * *", true),
    ("migrate_webp", "WebP Image Migration", "0 3 * * *", true),
    ("uptime_check", "Endpoint Uptime Check", "*/15 * * * *", true),
    ("prune_sessions", "Expired Session Cleanup", "30 2 * * *", true),
    ("gdrive_backup", "Google Drive Automated Backup", "0 0 * * *", false),
    ("gdrive_purge", "Google Drive Auto-Delete Purge", "0 3 * * *", false),
    ("archive_snapshot", "Internet Archive Snapshot", "0 4 * * *", false),
    ("github_project_sync", "GitHub Project Sync", "*/10 * * * *", true),
];

#[derive(Clone, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub name: String,
    pub schedule: String,
    pub action: String,
    pub webhook_url: Option<String>,
    pub webhook_url_type: String,
    pub webhook_method: String,
    pub webhook_headers: sqlx::types::Json<Value>,
    pub webhook_headers_type: String,
    pub webhook_body: Option<String>,
    pub webhook_body_type: String,
    pub notification_enabled: bool,
    pub notification_on: String,
    pub retry_enabled: bool,
    pub retry_type: String,
    pub retry_count: i32,
    pub retry_delay: i32,
}

const COLUMNS: &str = r#"id, name, schedule, action, "webhookUrl", "webhookUrlType", "webhookMethod", "webhookHeaders",
    "webhookHeadersType", "webhookBody", "webhookBodyType", "notificationEnabled", "notificationOn", "retryEnabled",
    "retryType", "retryCount", "retryDelay""#;

pub async fn find(state: &AppState, id: &str) -> anyhow::Result<Option<Job>> {
    Ok(sqlx::query_as(&format!(r#"SELECT {COLUMNS} FROM "Cron" WHERE id = $1"#)).bind(id).fetch_optional(&state.db).await?)
}

/// The zone schedules are read in (`Config.defaultTimezone`), UTC when unset or unknown.
pub async fn zone(state: &AppState) -> chrono_tz::Tz {
    let config = pages::singleton(&state.db, "Config", false).await;
    config["defaultTimezone"].as_str().and_then(cron::zone).unwrap_or(chrono_tz::UTC)
}

// ── secrets ────────────────────────────────────────────────────────────────────────────────────────────

/// The admin's stored secrets, decrypted. Unreadable ones are left out, so a task can still use the environment.
pub async fn secrets(state: &AppState) -> Map<String, Value> {
    let stored = pages::singleton(&state.db, "CronEnv", true).await;
    stored["env"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let key = entry["key"].as_str().map(str::trim).filter(|k| !k.is_empty())?;
            let value = match entry["value"].as_str().filter(|v| !v.is_empty()) {
                Some(sealed) => state.cipher.decrypt(sealed).map_or(Value::Null, Value::String),
                None => "".into(),
            };
            Some((key.to_string(), value))
        })
        .collect()
}

/// `value` with every secret replaced by its name.
fn redact(value: &str, secrets: &Map<String, Value>) -> String {
    secrets.iter().fold(value.to_string(), |out, (key, secret)| match secret.as_str().filter(|s| !s.is_empty()) {
        Some(secret) => out.replace(secret, &format!("[SECRET: {key}]")),
        None => out,
    })
}

// ── one attempt ────────────────────────────────────────────────────────────────────────────────────────

struct Attempt {
    success: bool,
    log: String,
    /// Retrying cannot help.
    unrecoverable: bool,
}

#[derive(Default)]
struct Sent {
    method: String,
    url: String,
}

fn has_template(value: &str) -> bool {
    value.contains('$')
}

/// A compiled value as text: an object with a `url` stands for it.
fn request_text(value: Option<Value>) -> String {
    match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::Object(o)) => match o.get("url").and_then(Value::as_str) {
            Some(url) => url.to_string(),
            None => Value::Object(o).to_string(),
        },
        Some(v @ Value::Array(_)) => v.to_string(),
        Some(v) => js_string(&v),
    }
}

async fn webhook(state: &AppState, job: &Job, sent: &mut Sent) -> anyhow::Result<(bool, String)> {
    let env = secrets(state).await;
    let mut template = Context::new(state, Env::Secrets(&env), row_limit());
    let raw_url = job.webhook_url.clone().unwrap_or_default();
    let compiled_url = job.webhook_url_type == "expression" || has_template(&raw_url);
    let url = if compiled_url { request_text(template.compile(&raw_url).await) } else { raw_url.clone() };
    let method = if job.webhook_method.is_empty() { "POST".to_string() } else { job.webhook_method.clone() };
    sent.method = method.clone();
    sent.url = redact(&url, &env);

    let mut headers: Vec<(String, String)> =
        vec![("Content-Type".into(), "application/json".into()), ("User-Agent".into(), "Aiyu-Task-Scheduler".into())];
    let expression = job.webhook_headers_type == "expression";
    for header in job.webhook_headers.0.as_array().into_iter().flatten() {
        let Some(key) = header["key"].as_str().map(str::trim).filter(|k| !k.is_empty()) else { continue };
        let key = if expression || has_template(key) { request_text(template.compile(key).await).trim().to_string() } else { key.to_string() };
        if key.is_empty() {
            continue;
        }
        let raw = header["value"].as_str().unwrap_or("");
        let value = if expression || header["value"].as_str().is_some_and(has_template) { request_text(template.compile(raw).await) } else { request_text(Some(header["value"].clone())) };
        match headers.iter_mut().find(|h| h.0.eq_ignore_ascii_case(&key)) {
            Some(existing) => existing.1 = value,
            None => headers.push((key, value)),
        }
    }

    let mut body = None;
    if method == "POST" {
        body = Some(match job.webhook_body.as_deref().map(str::trim).filter(|b| !b.is_empty()) {
            Some(text) if job.webhook_body_type == "fixed" && !has_template(text) => text.to_string(),
            Some(text) => match template.compile(text).await {
                Some(v @ (Value::Object(_) | Value::Array(_) | Value::Null)) => v.to_string(),
                Some(v) => js_string(&v),
                None => "undefined".into(),
            },
            None => json!({ "cronName": job.name, "triggeredAt": crate::admin_settings::now_iso() }).to_string(),
        });
    }

    let shown: Map<String, Value> = headers.iter().map(|(k, v)| (k.clone(), v.clone().into())).collect();
    let mut log = vec![format!("Request Method: {method}"), format!("Request URL: {}", redact(&url, &env))];
    if compiled_url {
        log.push(format!("Raw URL Template: {}", redact(&raw_url, &env)));
    }
    log.push(format!("Request Headers:\n{}", redact(&serde_json::to_string_pretty(&shown)?, &env)));
    if method == "POST" {
        log.push(format!("Request Body:\n{}", redact(body.as_deref().unwrap_or(""), &env)));
    }

    // Errors name the URL, which can hold a secret.
    let fail = |e: reqwest::Error| anyhow::anyhow!("fetch failed: {}", redact(&e.without_url().to_string(), &env));
    let mut request = state.http.request(method.to_uppercase().parse()?, &url).timeout(WEBHOOK_TIMEOUT);
    for (key, value) in &headers {
        request = request.header(key, value);
    }
    if let Some(body) = body {
        request = request.body(body);
    }
    let response = request.send().await.map_err(fail)?;
    let status = response.status();
    let text = redact(&limited_text(response).await.map_err(fail)?, &env);
    let log = format!("{}\n\nWebhook trigger returned HTTP status {}.\nResponse:\n{text}", log.join("\n\n"), status.as_u16());
    Ok((status.is_success(), log))
}

/// The first 256 KB of a response: more would only bloat the task log.
async fn limited_text(mut response: reqwest::Response) -> reqwest::Result<String> {
    const LIMIT: usize = 256 * 1024;
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await? {
        body.extend_from_slice(&chunk);
        if body.len() >= LIMIT {
            body.truncate(LIMIT);
            body.extend_from_slice(b"\n[response truncated]");
            break;
        }
    }
    Ok(String::from_utf8_lossy(&body).into_owned())
}

// ── Internet Archive ───────────────────────────────────────────────────────────────────────────────────

/// A stored secret, else the environment.
fn setting(secrets: &Map<String, Value>, key: &str) -> (String, &'static str) {
    if let Some(v) = secrets.get(key).and_then(Value::as_str).filter(|v| !v.is_empty()) {
        return (v.trim().to_string(), "global environment secrets");
    }
    match std::env::var(key).ok().filter(|v| !v.is_empty()) {
        Some(v) => (v.trim().to_string(), "deployment environment"),
        None => (String::new(), "not configured"),
    }
}

/// Save Page Now (SPN2): queue a capture of the site.
async fn archive(state: &AppState, started: Instant) -> anyhow::Result<String> {
    let secrets = secrets(state).await;
    let (access, source) = setting(&secrets, "IA_ACCESS_KEY");
    let (secret, _) = setting(&secrets, "IA_SECRET_KEY");
    let missing: Vec<&str> = [("IA_ACCESS_KEY", &access), ("IA_SECRET_KEY", &secret)].iter().filter(|k| k.1.is_empty()).map(|k| k.0).collect();
    anyhow::ensure!(
        missing.is_empty(),
        "Internet Archive credentials are not configured (missing {}). Generate S3 keys at https://archive.org/account/s3.php, then add them either in Manage Global Environment Secrets on /admin/config/crons, or to .env / prod.env.",
        missing.join(" and ")
    );
    let target = site_url();
    // The builder is not `Send`: finish it before any await.
    let form = url::form_urlencoded::Serializer::new(String::new()).append_pair("url", &target).append_pair("capture_all", "1").finish();
    let response = state
        .http
        .post("https://web.archive.org/save")
        .header("authorization", format!("LOW {access}:{secret}"))
        .header("accept", "application/json")
        .header("content-type", "application/x-www-form-urlencoded")
        .header("user-agent", "Aiyu-Task-Scheduler")
        .body(form)
        .timeout(WEBHOOK_TIMEOUT)
        .send()
        .await?;
    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let text = limited_text(response).await?;
    let payload: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
    let field = |k: &str| payload[k].as_str().filter(|v| !v.is_empty());
    if !ok {
        let short: String = text.chars().take(200).collect();
        let detail = field("message").or(field("error")).map(str::to_string).or(Some(short).filter(|s| !s.is_empty())).unwrap_or_else(|| "no response body".into());
        anyhow::bail!("Save Page Now returned HTTP {status}: {detail}");
    }
    if let (Some(message), None) = (field("message"), field("job_id")) {
        anyhow::bail!("Save Page Now rejected the request: {message}");
    }
    let url = field("url").unwrap_or(&target);
    let bare = url.split_once("://").map_or(url, |p| p.1);
    Ok(format!(
        "Internet Archive snapshot queued in {}ms.\nTarget: {url}\nJob ID: {}\nCredentials: IA_ACCESS_KEY read from {source}\nVerify at https://web.archive.org/web/*/{bare}",
        started.elapsed().as_millis(),
        field("job_id").unwrap_or("not reported")
    ))
}

// ── the actions ────────────────────────────────────────────────────────────────────────────────────────

async fn connected(state: &AppState, what: &str) -> anyhow::Result<drive::Settings> {
    let settings = drive::settings(state).await?;
    anyhow::ensure!(settings.is_connected(), "Google Drive account is not connected. Connect Google Drive in Database Admin to enable automated {what}.");
    Ok(settings)
}

/// Removes sessions that ended more than a week ago.
async fn prune_sessions(state: &AppState) -> anyhow::Result<u64> {
    let cutoff = Utc::now().naive_utc() - chrono::TimeDelta::days(SESSION_RETENTION_DAYS);
    let gone = sqlx::query(r#"DELETE FROM "Session" WHERE ("revokedAt" IS NOT NULL AND "revokedAt" < $1) OR ("revokedAt" IS NULL AND "expiresAt" < $1)"#)
        .bind(cutoff)
        .execute(&state.db)
        .await?;
    Ok(gone.rows_affected())
}

async fn perform(state: &AppState, job: &Job, started: Instant, sent: &mut Sent) -> anyhow::Result<(bool, String)> {
    let took = || started.elapsed().as_millis();
    Ok(match job.action.as_str() {
        "clean_unreferenced" => {
            let r = storage::cleanup(state).await?;
            (true, format!(
                "Cleanup completed in {}ms.\nDeleted {} files, reclaiming {}.\nSkipped files: {}.",
                took(), r["deletedCount"], r["reclaimedString"].as_str().unwrap_or(""), r["skippedCount"]
            ))
        }
        "migrate_webp" => {
            let r = storage::migrate_webp(state).await?;
            (true, format!(
                "WebP migration completed in {}ms.\nMigrated: {} images.\nSpace saved: {}.\nDetails: {}",
                took(), r["migratedCount"], r["reclaimedString"].as_str().unwrap_or(""), serde_json::to_string_pretty(&r["details"])?
            ))
        }
        "uptime_check" => {
            let results = health::run_checks(state).await?;
            let down: Vec<String> = results
                .iter()
                .filter(|r| r["status"] == "down")
                .map(|r| {
                    let name = r["label"].as_str().filter(|l| !l.is_empty()).or_else(|| r["target"].as_str()).unwrap_or("");
                    let why = r["error"].as_str().filter(|e| !e.is_empty()).map_or_else(|| format!("HTTP {}", r["statusCode"]), str::to_string);
                    format!("  - {name}: {why}")
                })
                .collect();
            let tail = if down.is_empty() { "All endpoints healthy.".to_string() } else { format!("Down:\n{}", down.join("\n")) };
            (down.is_empty(), format!("Uptime check completed in {}ms.\nPinged {} endpoint(s); {} down.\n{tail}", took(), results.len(), down.len()))
        }
        "prune_sessions" => {
            let deleted = prune_sessions(state).await?;
            (true, format!("Session cleanup completed in {}ms.\nDeleted {deleted} inactive session(s) older than {SESSION_RETENTION_DAYS} day(s).", took()))
        }
        "gdrive_backup" => {
            connected(state, "backups").await?;
            let name = format!("auto_backup_{}.zip", Utc::now().format("%Y-%m-%d_%H-%M-%S"));
            // The scheduled backup holds every collection.
            let query = vec![("collections".to_string(), export::all_keys().join(","))];
            let file = drive::backup(state, &query, &name).await?;
            (true, format!("Google Drive automated backup completed successfully. File: {name} (ID: {}).", file["id"].as_str().unwrap_or("")))
        }
        "gdrive_purge" => {
            let months = connected(state, "purge").await?.retention_months.max(1);
            let result = drive::purge(state, true).await?;
            (true, format!(
                "Google Drive auto-delete purge completed successfully. Purged {} expired backup file(s) older than {months} month(s).",
                result["deletedCount"]
            ))
        }
        "archive_snapshot" => (true, archive(state, started).await?),
        "github_project_sync" => {
            let r = github_sync::sync_linked(state).await?;
            let s = &r["summary"];
            let failed: Vec<String> = r["results"]
                .as_array()
                .into_iter()
                .flatten()
                .filter(|x| x["status"] == "error")
                .map(|x| format!("  - {}: {}", x["repo"].as_str().unwrap_or(""), x["error"].as_str().unwrap_or("")))
                .collect();
            let tail = if failed.is_empty() { String::new() } else { format!("\nFailed:\n{}", failed.join("\n")) };
            (failed.is_empty(), format!(
                "GitHub project sync completed in {}ms.\nChecked {} linked repo(s): {} updated, {} unchanged, {} failed.{tail}",
                took(), s["total"], s["updated"], s["unchanged"], s["failed"]
            ))
        }
        "webhook" => webhook(state, job, sent).await?,
        other => anyhow::bail!("Unknown action: {other}"),
    })
}

async fn attempt(state: &AppState, job: &Job, sent: &mut Sent) -> Attempt {
    let started = Instant::now();
    match perform(state, job, started, sent).await {
        Ok((success, log)) => Attempt { success, log, unrecoverable: false },
        Err(err) => Attempt {
            success: false,
            log: format!("Execution failed after {}ms.\nError: {err}", started.elapsed().as_millis()),
            unrecoverable: err.downcast_ref::<drive::DriveError>().is_some_and(|e| e.reconnect),
        },
    }
}

/// The wait before the attempt after `attempt`.
fn delay(retry_type: &str, base: i32, attempt: u32) -> u64 {
    let base = u64::try_from(base.max(0)).unwrap_or(0);
    let seconds = if retry_type == "exponential" { base.saturating_mul(1u64 << (attempt - 1).min(20)) } else { base };
    seconds.min(24 * 60 * 60)
}

async fn record(state: &AppState, job: &Job, success: bool, log: &str, sent: &Sent, duration: Duration) -> anyhow::Result<()> {
    let ran: DateTime<Utc> = Utc::now();
    let status = if success { "success" } else { "failure" };
    let next = cron::next_run(&job.schedule, ran, zone(state).await).map(|t| t.naive_utc());
    // Postgres text cannot hold NUL, which a webhook response may.
    let log = log.replace('\0', "");
    let updated = sqlx::query(r#"UPDATE "Cron" SET "lastRun" = $1, "lastRunStatus" = $2, "lastRunLog" = $3, "nextRun" = $4, "updatedAt" = $1 WHERE id = $5"#)
        .bind(ran.naive_utc())
        .bind(status)
        .bind(&log)
        .bind(next)
        .bind(&job.id)
        .execute(&state.db)
        .await?;
    anyhow::ensure!(updated.rows_affected() > 0, "the job no longer exists");
    sqlx::query(r#"INSERT INTO "CronLog" (id, "cronId", "cronName", action, status, method, url, log, "durationMs", "ranAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $10)"#)
        .bind(new_id())
        .bind(&job.id)
        .bind(&job.name)
        .bind(&job.action)
        .bind(status)
        .bind(&sent.method)
        .bind(&sent.url)
        .bind(&log)
        .bind(i32::try_from(duration.as_millis()).unwrap_or(i32::MAX))
        .bind(ran.naive_utc())
        .execute(&state.db)
        .await?;
    Ok(())
}

/// `executeCronJob`: run with retries, record the outcome, notify.
pub async fn execute(state: &AppState, job: &Job) {
    let started = Instant::now();
    let mut sent = Sent::default();
    let attempts = if job.retry_enabled { u32::try_from(job.retry_count.clamp(0, 20)).unwrap_or(0) + 1 } else { 1 };
    let mut log = String::new();
    let mut success = false;
    for number in 1..=attempts {
        let result = attempt(state, job, &mut sent).await;
        if attempts > 1 {
            log.push_str(&format!("--- Attempt {number} of {attempts} ---\n{}\n\n", result.log));
        } else {
            log = result.log;
        }
        success = result.success;
        if success {
            break;
        }
        if result.unrecoverable {
            log.push_str("[Not retried: the failure requires reconnecting the account.]\n\n");
            break;
        }
        if number < attempts {
            let wait = delay(&job.retry_type, job.retry_delay, number);
            log.push_str(&format!("[Attempt {number} failed. Retrying in {wait}s ({} delay)...]\n\n", job.retry_type));
            tokio::time::sleep(Duration::from_secs(wait)).await;
        }
    }
    if let Err(err) = record(state, job, success, &log, &sent, started.elapsed()).await {
        tracing::error!(job = %job.name, error = %err, "cron result not recorded");
        return;
    }
    tracing::info!(job = %job.name, success, "cron job finished");
    let wanted = match job.notification_on.as_str() {
        "always" => true,
        "success" => success,
        "failure" => !success,
        _ => false,
    };
    if job.notification_enabled && wanted {
        let word = if success { "SUCCESS" } else { "FAILURE" };
        let title = format!("{} Cron Job {word}: {}", if success { "✅" } else { "❌" }, job.name);
        let short: String = log.chars().take(1000).collect();
        let text = format!("Task: {}\nStatus: {word}\n\nLogs:\n{short}", job.name);
        let (priority, tags) = if success { ("3", "white_check_mark,success") } else { ("4", "x,failure") };
        notify::send(state, notify::Message { title: &title, text: &text, priority, tags }).await;
    }
}

// ── the scheduler ──────────────────────────────────────────────────────────────────────────────────────

/// `ensureSystemCronJobs`: create any built-in job that is missing (a restore can drop them).
async fn ensure_system_jobs(state: &AppState, zone: chrono_tz::Tz) -> anyhow::Result<()> {
    let present: Vec<String> = sqlx::query_scalar(r#"SELECT action FROM "Cron""#).fetch_all(&state.db).await?;
    for (action, name, schedule, enabled) in SYSTEM_JOBS {
        if present.iter().any(|a| a == action) {
            continue;
        }
        let now = Utc::now();
        sqlx::query(r#"INSERT INTO "Cron" (id, name, type, schedule, enabled, action, "nextRun", "createdAt", "updatedAt") VALUES ($1, $2, 'system', $3, $4, $5, $6, $7, $7)"#)
            .bind(new_id())
            .bind(name)
            .bind(schedule)
            .bind(enabled)
            .bind(action)
            .bind(cron::next_run(schedule, now, zone).map(|t| t.naive_utc()))
            .bind(now.naive_utc())
            .execute(&state.db)
            .await?;
        tracing::info!(name, "system cron job created");
    }
    Ok(())
}

/// Gives every enabled job whose next run is missing or past a new one.
pub async fn heal_next_runs(state: &AppState) -> anyhow::Result<()> {
    let zone = zone(state).await;
    let now = Utc::now();
    let stale: Vec<(String, String)> = sqlx::query_as(r#"SELECT id, schedule FROM "Cron" WHERE enabled AND ("nextRun" IS NULL OR "nextRun" < $1)"#)
        .bind(now.naive_utc())
        .fetch_all(&state.db)
        .await?;
    for (id, schedule) in stale {
        sqlx::query(r#"UPDATE "Cron" SET "nextRun" = $1, "updatedAt" = $2 WHERE id = $3"#)
            .bind(cron::next_run(&schedule, now, zone).map(|t| t.naive_utc()))
            .bind(now.naive_utc())
            .bind(id)
            .execute(&state.db)
            .await?;
    }
    Ok(())
}

/// Jobs now running: a job still retrying is not started a second time.
static RUNNING: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(|| Mutex::new(HashSet::new()));

/// Starts `job` in the background unless it is already running.
pub fn start(state: AppState, job: Job) {
    if !RUNNING.lock().unwrap_or_else(|e| e.into_inner()).insert(job.id.clone()) {
        tracing::warn!(job = %job.name, "still running; skipped");
        return;
    }
    tokio::spawn(async move {
        let id = job.id.clone();
        // Its own task, so a panic in one job still frees the id.
        let run = tokio::spawn(async move { execute(&state, &job).await });
        if let Err(err) = run.await {
            tracing::error!(error = %err, "cron job crashed");
        }
        RUNNING.lock().unwrap_or_else(|e| e.into_inner()).remove(&id);
    });
}

async fn tick(state: &AppState, now: DateTime<Utc>) -> anyhow::Result<()> {
    let zone = zone(state).await;
    let jobs: Vec<Job> = sqlx::query_as(&format!(r#"SELECT {COLUMNS} FROM "Cron" WHERE enabled"#)).fetch_all(&state.db).await?;
    // Re-created jobs are picked up on the next tick.
    if let Err(err) = ensure_system_jobs(state, zone).await {
        tracing::error!(error = %err, "system cron jobs not restored");
    }
    for job in jobs {
        if Schedule::parse(&job.schedule).is_some_and(|s| s.is_due(now, zone)) {
            tracing::info!(job = %job.name, "cron job due");
            start(state.clone(), job);
        }
    }
    Ok(())
}

pub fn enabled() -> bool {
    std::env::var("CRON_RUNNER").as_deref() != Ok("off")
}

/// Checks once in every minute which jobs are due. Never returns.
pub async fn schedule(state: AppState) {
    tracing::info!("cron scheduler started");
    // The database may still be starting.
    loop {
        let boot = async {
            ensure_system_jobs(&state, zone(&state).await).await?;
            heal_next_runs(&state).await?;
            anyhow::Ok(())
        };
        match boot.await {
            Ok(()) => break,
            Err(err) => tracing::warn!(error = %err, "cron scheduler waiting for the database"),
        }
        tokio::time::sleep(Duration::from_secs(10)).await;
    }
    let mut last = None;
    loop {
        let now = Utc::now();
        let minute = now.timestamp().div_euclid(60);
        // One check per clock minute, whatever the timer does.
        if last != Some(minute) {
            last = Some(minute);
            if let Err(err) = tick(&state, now).await {
                tracing::error!(error = %err, "cron scheduler tick failed");
            }
        }
        let into = Utc::now();
        let wait = 60_500u64.saturating_sub(u64::from(into.second()) * 1000 + u64::from(into.nanosecond() / 1_000_000));
        tokio::time::sleep(Duration::from_millis(wait.clamp(500, 60_500))).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secrets_are_redacted() {
        let secrets = Map::from_iter([("T".to_string(), json!("s3cr3t")), ("E".to_string(), json!(""))]);
        assert_eq!(redact("https://x/s3cr3t?a=s3cr3t", &secrets), "https://x/[SECRET: T]?a=[SECRET: T]");
    }

    #[test]
    fn retry_delays() {
        assert_eq!((delay("stable", 60, 3), delay("exponential", 60, 3), delay("exponential", 1, 40)), (60, 240, 86_400));
        assert_eq!(delay("stable", -5, 1), 0);
    }

    #[test]
    fn request_values_become_text() {
        assert_eq!(request_text(Some(json!({ "url": "u", "a": 1 }))), "u");
        assert_eq!(request_text(Some(json!([1]))), "[1]");
        assert_eq!(request_text(Some(json!(5))), "5");
        assert_eq!(request_text(None), "");
    }
}
