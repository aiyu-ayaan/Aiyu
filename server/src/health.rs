//! `/api/admin/health`: live server numbers (src/lib/serverMetrics.js) and uptime checks (src/lib/uptime.js).

use crate::db::{Stamp};
use axum::{
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::Response,
};
use futures_util::future::join_all;
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    ffi::CString,
    sync::LazyLock,
    time::{Duration, Instant},
};

use crate::{
    AppState,
    admin_settings::{failed, now_iso, unauthorized},
    api::{NO_STORE, json_status, signed_in},
    db::new_id,
    pages,
};

static STARTED: LazyLock<Instant> = LazyLock::new(Instant::now);
const PING_TIMEOUT: Duration = Duration::from_secs(8);
const HISTORY: usize = 20;

/// Called at startup, so the process uptime counts from there.
pub fn start_clock() {
    LazyLock::force(&STARTED);
}

// ── metrics ────────────────────────────────────────────────────────────────────────────────────────────

fn read(path: &str) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

/// `(idle, total)` ticks of all cores, from the first line of /proc/stat.
fn cpu_ticks(stat: &str) -> (u64, u64) {
    let fields: Vec<u64> = stat.lines().next().unwrap_or("").split_whitespace().skip(1).filter_map(|f| f.parse().ok()).collect();
    // user nice system idle iowait irq softirq steal; guest time is already inside user.
    (fields.get(3).copied().unwrap_or(0), fields.iter().take(8).sum())
}

fn percent(used: f64, total: f64) -> f64 {
    if total <= 0.0 { 0.0 } else { (used / total * 1000.0).round() / 10.0 }
}

/// A `Name:  123 kB` line of /proc, in bytes.
fn kilobytes(text: &str, name: &str) -> u64 {
    let line = text.lines().find_map(|l| l.strip_prefix(name).and_then(|r| r.strip_prefix(':')));
    line.and_then(|l| l.split_whitespace().next()).and_then(|v| v.parse::<u64>().ok()).unwrap_or(0) * 1024
}

fn disk() -> Value {
    let Ok(path) = CString::new(".") else { return Value::Null };
    // SAFETY: `statvfs` fills the zeroed struct for a valid NUL-terminated path; it is read only on success.
    let stats = unsafe {
        let mut stats: libc::statvfs = std::mem::zeroed();
        if libc::statvfs(path.as_ptr(), &mut stats) != 0 {
            return Value::Null;
        }
        stats
    };
    let block = stats.f_frsize as u64;
    let total = stats.f_blocks as u64 * block;
    let used = total - stats.f_bfree as u64 * block;
    json!({ "total": total, "used": used, "free": stats.f_bavail as u64 * block, "usedPercent": percent(used as f64, total as f64) })
}

/// How late short timers fire, which is how busy the async threads are: `(mean, max)` in milliseconds.
async fn scheduling_lag() -> (f64, f64) {
    let step = Duration::from_millis(10);
    let (mut sum, mut max, rounds) = (0.0, 0.0f64, 12);
    for _ in 0..rounds {
        let started = Instant::now();
        tokio::time::sleep(step).await;
        let late = started.elapsed().saturating_sub(step).as_secs_f64() * 1000.0;
        sum += late;
        max = max.max(late);
    }
    let round = |v: f64| (v * 100.0).round() / 100.0;
    (round(sum / f64::from(rounds)), round(max))
}

async fn sample(state: &AppState) -> Value {
    let before = cpu_ticks(&read("/proc/stat"));
    // The timers take about 120 ms, which is also the CPU sampling window.
    let (lag_mean, lag_max) = scheduling_lag().await;
    let after = cpu_ticks(&read("/proc/stat"));
    let (idle, total) = (after.0.saturating_sub(before.0), after.1.saturating_sub(before.1));
    let cpu = percent(total.saturating_sub(idle) as f64, total as f64).clamp(0.0, 100.0);

    let started = Instant::now();
    let up = sqlx::query("SELECT 1").execute(&state.db).await.is_ok();
    let database = json!({ "status": if up { "up" } else { "down" }, "latencyMs": started.elapsed().as_millis() as u64 });

    let memory = read("/proc/meminfo");
    let (all, free) = (kilobytes(&memory, "MemTotal"), kilobytes(&memory, "MemAvailable"));
    let status = read("/proc/self/status");
    let rss = kilobytes(&status, "VmRSS");
    let load: Vec<f64> = read("/proc/loadavg").split_whitespace().take(3).filter_map(|v| v.parse().ok()).collect();
    let host_uptime = read("/proc/uptime").split_whitespace().next().and_then(|v| v.parse::<f64>().ok()).unwrap_or(0.0);
    let cores = read("/proc/stat").lines().filter(|l| l.starts_with("cpu") && !l.starts_with("cpu ")).count();
    json!({
        "timestamp": now_iso(),
        "cpu": { "percent": cpu, "cores": cores, "loadAvg": load },
        "memory": { "total": all, "used": all.saturating_sub(free), "free": free, "usedPercent": percent(all.saturating_sub(free) as f64, all as f64) },
        // There is no managed heap: the private data size stands in for it.
        "process": {
            "rss": rss, "heapUsed": kilobytes(&status, "RssAnon"), "heapTotal": kilobytes(&status, "VmData"), "external": 0,
            "uptimeSeconds": STARTED.elapsed().as_secs(), "pid": std::process::id(),
            "nodeVersion": concat!("Rust (aiyu-server ", env!("CARGO_PKG_VERSION"), ")"),
        },
        "eventLoop": { "lagMeanMs": lag_mean, "lagMaxMs": lag_max },
        "disk": disk(),
        "database": database,
        "host": {
            "platform": std::env::consts::OS, "release": read("/proc/sys/kernel/osrelease").trim(),
            "hostname": read("/proc/sys/kernel/hostname").trim(), "uptimeSeconds": host_uptime.round() as u64,
        },
    })
}

fn fresh(value: Value) -> Response {
    let mut res = json_status(StatusCode::OK, value);
    res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static(NO_STORE));
    res
}

/// `GET /api/admin/health/metrics`
pub async fn metrics(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    fresh(json!({ "success": true, "metrics": sample(&state).await }))
}

// ── uptime ─────────────────────────────────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct Target {
    url: String,
    label: String,
    source: &'static str,
}

/// Every app with an address, then the enabled custom targets; one per URL.
async fn targets(state: &AppState) -> anyhow::Result<Vec<Target>> {
    let apps: Vec<(String, String)> = sqlx::query_as(r#"SELECT name, "hostedUrl" FROM "Deployment" WHERE "hostedUrl" IS NOT NULL"#).fetch_all(&state.db).await?;
    let custom: Vec<(String, String)> = sqlx::query_as(r#"SELECT label, url FROM "UptimeTarget" WHERE enabled"#).fetch_all(&state.db).await?;
    let apps = apps.into_iter().filter(|a| !a.1.trim().is_empty()).map(|(label, url)| Target { url: url.trim().to_string(), label, source: "deployment" });
    let custom = custom.into_iter().map(|(label, url)| Target { url, label, source: "custom" });
    let mut seen: Vec<Target> = Vec::new();
    for target in apps.chain(custom) {
        if !seen.iter().any(|t| t.url == target.url) {
            seen.push(target);
        }
    }
    Ok(seen)
}

struct Ping {
    status: u16,
    error: String,
    latency: i32,
}

/// HEAD, or GET for servers that refuse HEAD. The addresses are the admin's own, private ones included.
async fn ping(http: &reqwest::Client, url: &str) -> Ping {
    let started = Instant::now();
    let latency = |s: Instant| i32::try_from(s.elapsed().as_millis()).unwrap_or(i32::MAX);
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Ping { status: 0, error: "Invalid URL".into(), latency: 0 };
    }
    let mut result = http.head(url).timeout(PING_TIMEOUT).send().await;
    if result.as_ref().is_ok_and(|r| matches!(r.status().as_u16(), 405 | 501)) {
        result = http.get(url).timeout(PING_TIMEOUT).send().await;
    }
    match result {
        Ok(r) => {
            let status = r.status().as_u16();
            let error = if r.status().is_success() { String::new() } else { format!("HTTP {status}") };
            Ping { status, error, latency: latency(started) }
        }
        Err(err) => {
            let error = if err.is_timeout() { format!("Upstream request timed out after {}ms", PING_TIMEOUT.as_millis()) } else { "fetch failed".into() };
            Ping { status: 0, error, latency: latency(started) }
        }
    }
}

fn state_of(status: u16) -> &'static str {
    if (200..400).contains(&status) { "up" } else { "down" }
}

/// `runUptimeChecks`: ping every target and record the results.
pub async fn run_checks(state: &AppState) -> anyhow::Result<Vec<Value>> {
    let targets = targets(state).await?;
    let pings = join_all(targets.iter().map(|t| ping(&state.http, &t.url))).await;
    let mut results = Vec::new();
    for (t, p) in targets.iter().zip(pings) {
        sqlx::query(r#"INSERT INTO "UptimeCheck" (id, target, label, source, status, "statusCode", "latencyMs", error, "checkedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#)
            .bind(new_id())
            .bind(&t.url)
            .bind(&t.label)
            .bind(t.source)
            .bind(state_of(p.status))
            .bind(i32::from(p.status))
            .bind(p.latency)
            .bind(&p.error)
            .bind(Stamp(chrono::Utc::now().naive_utc()))
            .execute(&state.db)
            .await?;
        results.push(json!({ "target": t.url, "label": t.label, "source": t.source, "status": state_of(p.status), "statusCode": p.status, "latencyMs": p.latency, "error": p.error }));
    }
    Ok(results)
}

/// The latest result and recent history of every target.
async fn summary(state: &AppState) -> anyhow::Result<Vec<Value>> {
    let targets = targets(state).await?;
    let recent = pages::client_rows(&state.db, "UptimeCheck", r#"ORDER BY "checkedAt" DESC LIMIT 400"#).await?;
    let mut by_target: HashMap<&str, Vec<&Value>> = HashMap::new();
    for check in &recent {
        let list = by_target.entry(check["target"].as_str().unwrap_or("")).or_default();
        if list.len() < HISTORY {
            list.push(check);
        }
    }
    let pick = |c: &Value, keys: &[&str]| Value::Object(keys.iter().map(|k| (k.to_string(), c[*k].clone())).collect());
    Ok(targets
        .iter()
        .map(|t| {
            let history = by_target.get(t.url.as_str()).map(Vec::as_slice).unwrap_or_default();
            let latest = history.first().map(|c| pick(c, &["status", "statusCode", "latencyMs", "error", "checkedAt"]));
            // Oldest first, for a left-to-right strip.
            let history: Vec<Value> = history.iter().rev().map(|c| pick(c, &["status", "latencyMs", "checkedAt"])).collect();
            json!({ "url": t.url, "label": t.label, "source": t.source, "latest": latest, "history": history })
        })
        .collect())
}

/// `GET /api/admin/health/uptime`
pub async fn uptime(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    match summary(&state).await {
        Ok(targets) => fresh(json!({ "success": true, "targets": targets })),
        Err(err) => failed("/api/admin/health/uptime", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

/// `POST /api/admin/health/uptime/check`
pub async fn check_now(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result = async {
        let checked = run_checks(&state).await?.len();
        anyhow::Ok(json!({ "success": true, "checked": checked, "targets": summary(&state).await? }))
    }
    .await;
    match result {
        Ok(v) => json_status(StatusCode::OK, v),
        Err(err) => failed("/api/admin/health/uptime/check", StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proc_files_are_read() {
        assert_eq!(cpu_ticks("cpu  10 0 5 80 5 0 0 0 7 0\ncpu0 1"), (80, 100));
        assert_eq!(kilobytes("MemTotal:       2048 kB\nMemAvailable: 1 kB", "MemTotal"), 2048 * 1024);
        assert_eq!(percent(1.0, 3.0), 33.3);
        assert!(disk()["total"].as_u64().unwrap() > 0);
    }

    #[test]
    fn redirects_count_as_up() {
        assert_eq!((state_of(200), state_of(301), state_of(404), state_of(0)), ("up", "up", "down", "down"));
    }
}
