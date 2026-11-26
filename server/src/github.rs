//! `GET /api/github/stats` (src/app/api/github/stats/route.js): profile, repos, contributions and activity from
//! the GitHub API, behind an in-memory cache with a stale copy, a per-client rate limit with a concurrency cap,
//! and a circuit breaker on the upstream (src/lib/trafficControl.js, src/lib/upstreamControl.js).

use axum::{
    Json,
    extract::State,
    http::{HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use chrono::{Datelike, NaiveDate, Utc};
use serde_json::{Map, Value, json};
use std::{
    collections::HashMap,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

use crate::{
    AppState,
    limit::Reservation,
    api::{NO_STORE, PUBLIC_MEDIUM, PUBLIC_SHORT, truthy},
};

fn env_ms(name: &str, default: u64) -> u64 {
    std::env::var(name).ok().and_then(|v| v.trim().parse().ok()).unwrap_or(default)
}

struct Settings {
    window: Duration,
    max_requests: usize,
    max_concurrent: usize,
    cache_ttl: Duration,
    stale_ttl: Duration,
    timeout: Duration,
    breaker_threshold: u32,
    breaker_reset: Duration,
}

static SETTINGS: LazyLock<Settings> = LazyLock::new(|| Settings {
    window: Duration::from_millis(env_ms("GITHUB_STATS_WINDOW_MS", 60_000)),
    max_requests: env_ms("GITHUB_STATS_RATE_LIMIT", 240) as usize,
    max_concurrent: env_ms("GITHUB_STATS_MAX_CONCURRENT", 100) as usize,
    cache_ttl: Duration::from_millis(env_ms("GITHUB_STATS_CACHE_TTL_MS", 60_000)),
    stale_ttl: Duration::from_millis(env_ms("GITHUB_STATS_STALE_TTL_MS", 15 * 60_000)),
    timeout: Duration::from_millis(env_ms("GITHUB_UPSTREAM_TIMEOUT_MS", 2_500)),
    breaker_threshold: env_ms("GITHUB_UPSTREAM_BREAKER_THRESHOLD", 5) as u32,
    breaker_reset: Duration::from_millis(env_ms("GITHUB_UPSTREAM_BREAKER_RESET_MS", 30_000)),
});

// ── cache ──────────────────────────────────────────────────────────────────────────────────────────────

static CACHE: LazyLock<Mutex<HashMap<String, (Value, Instant)>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
/// One GitHub refresh at a time: a cold cache under a burst costs one round of upstream calls, not one per request.
static REFRESH: LazyLock<tokio::sync::Mutex<()>> = LazyLock::new(|| tokio::sync::Mutex::new(()));

/// Drops the cached statistics (`POST /api/admin/purge-cache`).
pub fn purge() {
    CACHE.lock().unwrap_or_else(|e| e.into_inner()).clear();
}

fn cache_get(key: &str) -> Option<Value> {
    let mut map = CACHE.lock().unwrap_or_else(|e| e.into_inner());
    match map.get(key) {
        Some((v, expires)) if *expires > Instant::now() => Some(v.clone()),
        Some(_) => {
            map.remove(key);
            None
        }
        None => None,
    }
}

fn cache_set(key: &str, value: &Value, ttl: Duration) {
    let mut map = CACHE.lock().unwrap_or_else(|e| e.into_inner());
    map.insert(key.to_string(), (value.clone(), Instant::now() + ttl));
}

// ── traffic control ────────────────────────────────────────────────────────────────────────────────────

/// `createTrafficHeaders`
fn traffic_headers(r: &Reservation) -> Vec<(&'static str, String)> {
    let retry = if r.retry_after > Duration::ZERO { r.retry_after.as_millis().div_ceil(1000).max(1) } else { SETTINGS.window.as_millis().div_ceil(1000) };
    vec![
        ("retry-after", retry.to_string()),
        ("x-ratelimit-remaining", r.remaining.to_string()),
        ("x-route-active-requests", r.active.to_string()),
    ]
}

// ── circuit breaker ────────────────────────────────────────────────────────────────────────────────────

#[derive(Default)]
struct Breaker {
    failures: u32,
    open_until: Option<Instant>,
    state: &'static str,
}

static BREAKER: LazyLock<Mutex<Breaker>> = LazyLock::new(|| Mutex::new(Breaker { state: "closed", ..Default::default() }));

/// An upstream failure: `retryable` ones (timeouts, network errors, an open breaker) count against the breaker.
#[derive(Debug)]
pub(crate) struct UpstreamError {
    status: Option<u16>,
    body: String,
    pub(crate) message: String,
}

impl std::fmt::Display for UpstreamError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

/// `runWithCircuitBreaker('github-upstream', () => fetchWithTimeout(...))`. HTTP error statuses come back as
/// responses (they never trip the breaker); timeouts and network errors do.
/// One breaker for every GitHub caller: one upstream, one budget. `timeout` None is the stats timeout.
pub(crate) async fn guarded(req: reqwest::RequestBuilder, timeout: Option<Duration>) -> Result<reqwest::Response, UpstreamError> {
    let s = &*SETTINGS;
    let timeout = timeout.unwrap_or(s.timeout);
    {
        let mut b = BREAKER.lock().unwrap_or_else(|e| e.into_inner());
        let now = Instant::now();
        if b.open_until.is_some_and(|t| t > now) {
            b.state = "open";
            return Err(UpstreamError { status: None, body: String::new(), message: "Circuit breaker \"github-upstream\" is open".into() });
        }
        b.state = if b.open_until.is_some() { "half-open" } else { "closed" };
    }
    let started = Instant::now();
    let result = req.timeout(timeout).send().await;
    let mut b = BREAKER.lock().unwrap_or_else(|e| e.into_inner());
    match result {
        Ok(res) => {
            b.failures = 0;
            b.open_until = None;
            b.state = "closed";
            Ok(res)
        }
        Err(err) => {
            b.failures += 1;
            if b.failures >= s.breaker_threshold {
                b.open_until = Some(started + s.breaker_reset);
                b.state = "open";
            }
            let message = if err.is_timeout() { format!("Upstream request timed out after {}ms", timeout.as_millis()) } else { err.to_string() };
            Err(UpstreamError { status: None, body: String::new(), message })
        }
    }
}

fn breaker_state() -> &'static str {
    let b = BREAKER.lock().unwrap_or_else(|e| e.into_inner());
    if b.open_until.is_some_and(|t| t > Instant::now()) { "open" } else { b.state }
}

// ── GitHub calls ───────────────────────────────────────────────────────────────────────────────────────

type Trace = Mutex<Vec<(String, u128)>>;

struct Gh<'a> {
    client: &'a reqwest::Client,
    token: Option<String>,
    trace: &'a Trace,
}

impl Gh<'_> {
    fn request(&self, method: reqwest::Method, url: &str, with_token: bool) -> reqwest::RequestBuilder {
        let mut r = self.client.request(method, url).header("Accept", "application/vnd.github.v3+json").header("User-Agent", "Portfolio-App");
        if let (true, Some(t)) = (with_token, &self.token) {
            r = r.header("Authorization", format!("token {t}"));
        }
        r
    }

    /// `fetchGitHub`: on a 401 with a token, retry once without it.
    async fn get(&self, url: &str, label: &str) -> Result<reqwest::Response, UpstreamError> {
        let started = Instant::now();
        let mut res = guarded(self.request(reqwest::Method::GET, url, true), None).await?;
        self.trace.lock().unwrap_or_else(|e| e.into_inner()).push((label.to_string(), started.elapsed().as_millis()));
        if res.status() == 401 && self.token.is_some() {
            tracing::warn!("GITHUB_TOKEN is invalid. Retrying without token...");
            res = guarded(self.request(reqwest::Method::GET, url, false), None).await?;
        }
        Ok(res)
    }

    /// `fetchGitHubJson`
    async fn json(&self, url: &str, label: &str) -> Result<Value, UpstreamError> {
        let res = self.get(url, label).await?;
        let status = res.status().as_u16();
        let bytes = res.bytes().await.map_err(|e| UpstreamError { status: Some(status), body: String::new(), message: e.to_string() })?;
        if !(200..300).contains(&status) {
            return Err(UpstreamError { status: Some(status), body: String::from_utf8_lossy(&bytes).into_owned(), message: format!("GitHub request failed ({status})") });
        }
        serde_json::from_slice(&bytes).map_err(|e| UpstreamError { status: Some(status), body: String::new(), message: e.to_string() })
    }
}

async fn fetch_user(gh: &Gh<'_>, username: &str) -> Result<Value, String> {
    gh.json(&format!("https://api.github.com/users/{username}"), "github-user").await.map_err(|e| {
        tracing::error!(status = ?e.status, body = %e.body, "GitHub API error");
        match e.status {
            Some(403) if e.body.contains("API rate limit exceeded") => "GitHub API rate limit exceeded. Please add a valid GITHUB_TOKEN.".into(),
            Some(403) => "GitHub API access forbidden.".into(),
            Some(404) => format!("GitHub user '{username}' not found."),
            Some(s) => format!("Failed to fetch user data ({s})"),
            None => "Failed to fetch user data (unknown)".into(),
        }
    })
}

async fn fetch_repos(gh: &Gh<'_>, username: &str, include_private: bool) -> Result<Value, String> {
    if include_private && gh.token.is_some() {
        match gh.json("https://api.github.com/user", "github-identity").await {
            Ok(identity) if identity["login"].as_str().is_some_and(|l| l.eq_ignore_ascii_case(username)) => {
                match gh.json("https://api.github.com/user/repos?sort=updated&per_page=100&type=all", "github-repos-private").await {
                    Ok(v) => return Ok(v),
                    Err(e) => tracing::warn!(error = %e, "failed to fetch private repos"),
                }
            }
            Ok(_) => {}
            Err(e) => tracing::warn!(error = %e, "failed to verify token identity for private repos"),
        }
    }
    gh.json(&format!("https://api.github.com/users/{username}/repos?sort=updated&per_page=100&type=public"), "github-repos-public")
        .await
        .map_err(|_| "Failed to fetch repositories".to_string())
}

async fn fetch_events(gh: &Gh<'_>, username: &str) -> Vec<Value> {
    match gh.json(&format!("https://api.github.com/users/{username}/events/public?per_page=100"), "github-events").await {
        Ok(Value::Array(a)) => a,
        Ok(_) => vec![],
        Err(e) => {
            tracing::warn!(error = %e, "failed to fetch GitHub public events");
            vec![]
        }
    }
}

const CONTRIBUTIONS_QUERY: &str = r#"
    query($userName:String!) {
        user(login: $userName) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                        }
                    }
                }
            }
        }
    }
"#;

/// The GraphQL contribution calendar, or None to fall back to the events.
async fn fetch_calendar(gh: &Gh<'_>, username: &str) -> Option<(Vec<Value>, Value)> {
    let started = Instant::now();
    let req = gh
        .request(reqwest::Method::POST, "https://api.github.com/graphql", true)
        .header("Content-Type", "application/json")
        .body(json!({ "query": CONTRIBUTIONS_QUERY, "variables": { "userName": username } }).to_string());
    let res = match guarded(req, None).await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(error = %e, "GraphQL fetch failed, falling back to events API");
            return None;
        }
    };
    gh.trace.lock().unwrap_or_else(|e| e.into_inner()).push(("github-graphql".into(), started.elapsed().as_millis()));
    if !res.status().is_success() {
        return None;
    }
    let data: Value = serde_json::from_slice(&res.bytes().await.ok()?).ok()?;
    let cal = &data["data"]["user"]["contributionsCollection"]["contributionCalendar"];
    if !cal.is_object() {
        return None;
    }
    let days = cal["weeks"].as_array()?.iter().flat_map(|w| w["contributionDays"].as_array().cloned().unwrap_or_default())
        .map(|d| json!({ "date": d["date"], "count": d["contributionCount"] }))
        .collect();
    Some((days, cal["totalContributions"].clone()))
}

/// `buildContributionSeriesFromEvents`: one entry per day of the last year (UTC), counting events.
fn series_from_events(events: &[Value], today: NaiveDate) -> (Vec<Value>, Value) {
    // `new Date(y - 1, m, d)` rolls Feb 29 over to Mar 1.
    let start = NaiveDate::from_ymd_opt(today.year() - 1, today.month(), 1).map(|d| d + chrono::Days::new(u64::from(today.day() - 1))).unwrap_or(today);
    let mut counts: Vec<(String, i64)> = start.iter_days().take_while(|d| *d <= today).map(|d| (d.to_string(), 0)).collect();
    for e in events {
        let Some(date) = e["created_at"].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()) else { continue };
        let key = date.with_timezone(&Utc).date_naive().to_string();
        if let Some(c) = counts.iter_mut().find(|(d, _)| *d == key) {
            c.1 += 1;
        }
    }
    let total: i64 = counts.iter().map(|c| c.1).sum();
    (counts.into_iter().map(|(date, count)| json!({ "date": date, "count": count })).collect(), json!(total))
}

/// `Number(v)` for the values GitHub sends; None for NaN.
fn number(v: Option<&Value>) -> Option<f64> {
    match v {
        None => None,
        Some(Value::Null) => Some(0.0),
        Some(Value::Number(n)) => n.as_f64(),
        Some(Value::Bool(b)) => Some(f64::from(u8::from(*b))),
        Some(Value::String(s)) if s.trim().is_empty() => Some(0.0),
        Some(Value::String(s)) => s.trim().parse().ok(),
        Some(_) => None,
    }
}

/// `getPushCommitCount`: `payload.commits ?? payload.size ?? payload.distinct_size`, None when not a count.
fn push_commit_count(payload: &Value) -> Option<i64> {
    if let Some(a) = payload["commits"].as_array() {
        return Some(a.len() as i64);
    }
    let raw = [payload.get("commits"), payload.get("size")].into_iter().flatten().find(|v| !v.is_null()).or_else(|| payload.get("distinct_size"));
    number(raw).filter(|n| n.is_finite() && *n >= 0.0).map(|n| n as i64)
}

async fn push_commits(gh: &Gh<'_>, repo: &str, payload: &Value, index: usize) -> Option<i64> {
    if let Some(n) = push_commit_count(payload) {
        return Some(n);
    }
    let before = payload["before"].as_str().map(str::trim).unwrap_or("");
    let head = payload["head"].as_str().map(str::trim).unwrap_or("");
    if repo.is_empty() || before.is_empty() || head.is_empty() || before == head {
        return None;
    }
    match gh.json(&format!("https://api.github.com/repos/{repo}/compare/{before}...{head}"), &format!("github-compare-{index}")).await {
        Ok(c) => number(c.get("total_commits")).filter(|n| n.is_finite() && *n >= 0.0).map(|n| n as i64),
        Err(e) => {
            tracing::warn!(repo, error = %e, "failed to compare push range");
            None
        }
    }
}

/// `Math.round(part / total * 100)`
fn pct(part: i64, total: i64) -> i64 {
    (part as f64 / total as f64 * 100.0 + 0.5).floor() as i64
}

fn activity_distribution(events: &[Value]) -> Value {
    let (mut commits, mut issues, mut prs, mut review) = (0i64, 0i64, 0i64, 0i64);
    for e in events {
        match e["type"].as_str().unwrap_or("") {
            "PushEvent" => commits += push_commit_count(&e["payload"]).filter(|n| *n != 0).unwrap_or(1),
            "IssuesEvent" | "IssueCommentEvent" => issues += 1,
            "PullRequestEvent" => prs += 1,
            "PullRequestReviewEvent" | "PullRequestReviewCommentEvent" => review += 1,
            _ => {}
        }
    }
    let total = commits + issues + prs + review;
    if total == 0 {
        return json!({ "commits": 0, "issues": 0, "pullRequests": 0, "codeReview": 0 });
    }
    json!({ "commits": pct(commits, total), "issues": pct(issues, total), "pullRequests": pct(prs, total), "codeReview": pct(review, total) })
}

/// Copy `key` from `src` into `out` only when present (`undefined` drops out of the JSON).
fn put(out: &mut Map<String, Value>, key: &str, src: &Value, from: &str) {
    if let Some(v) = src.get(from) {
        out.insert(key.into(), v.clone());
    }
}

/// `streaks`: current (ending today or yesterday) and longest run of days with contributions.
fn streaks(contributions: &[Value], now: chrono::DateTime<Utc>) -> (i64, i64) {
    let mut by_date: Vec<(String, i64)> = vec![];
    for c in contributions {
        let date = c["date"].as_str().unwrap_or_default().to_string();
        let count = c["count"].as_i64().unwrap_or(0);
        match by_date.iter_mut().find(|(d, _)| *d == date) {
            Some(e) => e.1 = count,
            None => by_date.push((date, count)),
        }
    }
    by_date.sort_by(|a, b| b.0.cmp(&a.0));
    let (mut current, mut longest, mut temp, mut broken) = (0, 0, 0, false);
    for (date, count) in by_date {
        let Ok(d) = NaiveDate::parse_from_str(&date, "%Y-%m-%d") else { continue };
        let days = (now - d.and_hms_opt(0, 0, 0).unwrap_or_default().and_utc()).num_milliseconds().div_euclid(86_400_000);
        if count > 0 {
            if !broken && days <= 1 {
                current += 1;
            }
            temp += 1;
            longest = longest.max(temp);
        } else {
            if days <= 1 {
                broken = true;
            }
            temp = 0;
        }
    }
    (current, longest)
}

async fn build(state: &AppState, config: &Value, username: &str, trace: &Trace) -> Result<Value, String> {
    let encrypted: Option<String> = sqlx::query_scalar(r#"SELECT "encryptedGithubToken" FROM "Config" LIMIT 1"#)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .flatten();
    let db_token = encrypted.as_deref().and_then(|e| state.cipher.decrypt(e)).filter(|t| !t.is_empty());
    let env_token = std::env::var("GITHUB_TOKEN").ok().map(|t| t.trim().to_string()).filter(|t| !t.is_empty());
    let gh = Gh { client: &state.http, token: db_token.or(env_token), trace };
    let include_private = truthy(&config["includePrivate"]);

    let (events, calendar, user, repos) =
        tokio::join!(fetch_events(&gh, username), fetch_calendar(&gh, username), fetch_user(&gh, username), fetch_repos(&gh, username, include_private));
    let (user, repos) = (user?, repos?);
    let (contributions, total_contributions) = calendar.unwrap_or_else(|| series_from_events(&events, Utc::now().date_naive()));

    let hidden: Vec<Value> = config["hiddenRepos"].as_array().cloned().unwrap_or_default();
    let is_hidden = |name: &Value| hidden.contains(name);
    let repos: Vec<&Value> = repos.as_array().map(|a| a.iter().collect()).unwrap_or_default();
    let filtered: Vec<&Value> = repos.into_iter().filter(|r| (include_private || !truthy(&r["private"])) && !is_hidden(&r["name"])).collect();
    let count = |key: &str| filtered.iter().map(|r| r[key].as_i64().unwrap_or(0)).sum::<i64>();
    let (total_stars, total_forks) = (count("stargazers_count"), count("forks_count"));
    let source_repos = filtered.iter().filter(|r| !truthy(&r["fork"]) && !truthy(&r["private"])).count();
    let forked = filtered.iter().filter(|r| truthy(&r["fork"])).count();
    let private = filtered.iter().filter(|r| truthy(&r["private"])).count();

    let top_repos: Vec<Value> = filtered.iter().take(6).map(|r| {
        let mut o = Map::new();
        o.insert("name".into(), r["name"].clone());
        put(&mut o, "description", r, "description");
        o.insert("stars".into(), json!(r["stargazers_count"].as_i64().unwrap_or(0)));
        o.insert("forks".into(), json!(r["forks_count"].as_i64().unwrap_or(0)));
        put(&mut o, "language", r, "language");
        put(&mut o, "url", r, "html_url");
        o.insert("topics".into(), if truthy(&r["topics"]) { r["topics"].clone() } else { json!([]) });
        put(&mut o, "updated_at", r, "updated_at");
        put(&mut o, "isPrivate", r, "private");
        Value::Object(o)
    }).collect();

    let mut lang_counts: Vec<(String, i64)> = vec![];
    for r in &filtered {
        if let Some(l) = r["language"].as_str().filter(|l| !l.is_empty()) {
            match lang_counts.iter_mut().find(|(n, _)| n == l) {
                Some(e) => e.1 += 1,
                None => lang_counts.push((l.to_string(), 1)),
            }
        }
    }
    let lang_total: i64 = lang_counts.iter().map(|l| l.1).sum();
    lang_counts.sort_by(|a, b| b.1.cmp(&a.1));
    let languages: Vec<Value> = lang_counts.iter().take(5).map(|(name, c)| json!({ "name": name, "count": c, "percentage": pct(*c, lang_total) })).collect();

    let (current, longest) = streaks(&contributions, Utc::now());

    let visible: Vec<&Value> = events.iter().filter(|e| {
        let name = e["repo"]["name"].as_str().unwrap_or_default();
        !is_hidden(&json!(name.rsplit('/').next().unwrap_or(name)))
    }).take(10).collect();
    let recent = futures_util::future::join_all(visible.iter().enumerate().map(|(i, e)| {
        let gh = &gh;
        async move {
            let repo = e["repo"]["name"].as_str().unwrap_or_default();
            let commits = if e["type"] == "PushEvent" { push_commits(gh, repo, &e["payload"], i).await } else { None };
            let p = &e["payload"];
            let mut payload = Map::new();
            put(&mut payload, "action", p, "action");
            put(&mut payload, "ref", p, "ref");
            payload.insert("commits".into(), json!(commits));
            payload.insert("commitsKnown".into(), commits.is_some().into());
            let distinct = number(p.get("distinct_size")).filter(|n| n.is_finite()).unwrap_or(0.0);
            payload.insert("distinctCommits".into(), json!(distinct as i64));
            json!({ "type": e["type"], "repo": e["repo"]["name"], "created_at": e["created_at"], "payload": payload })
        }
    }))
    .await;

    let mut profile = Map::new();
    for (k, from) in [("username", "login"), ("name", "name"), ("avatar", "avatar_url"), ("bio", "bio"), ("location", "location"), ("blog", "blog"),
        ("twitter", "twitter_username"), ("followers", "followers"), ("following", "following"), ("publicRepos", "public_repos"), ("createdAt", "created_at")] {
        put(&mut profile, k, &user, from);
    }
    let mut stats = Map::new();
    stats.insert("totalRepos".into(), json!(filtered.len()));
    stats.insert("totalStars".into(), json!(total_stars));
    stats.insert("totalForks".into(), json!(total_forks));
    put(&mut stats, "followers", &user, "followers");
    stats.insert("totalContributions".into(), total_contributions);
    stats.insert("sourceRepos".into(), json!(source_repos));
    stats.insert("forkedRepos".into(), json!(forked));
    stats.insert("privateRepos".into(), json!(private));

    let sections = if truthy(&config["sections"]) {
        config["sections"].clone()
    } else {
        json!({ "showProfile": true, "showStats": true, "showMetrics": true, "showContributions": true, "showActivity": true,
            "showRepositories": true, "showTopics": true, "showRepoDistribution": true, "showLanguages": true, "showLiveCommit": true,
            "showRadarChart": true, "showConnect": true })
    };
    Ok(json!({
        "profile": profile, "stats": stats, "streaks": { "current": current, "longest": longest },
        "contributions": contributions, "recentActivity": recent, "topRepos": top_repos, "languages": languages,
        "sections": sections, "activityDistribution": activity_distribution(&events),
    }))
}

// ── handler ────────────────────────────────────────────────────────────────────────────────────────────

fn respond(status: StatusCode, body: Value, headers: Vec<(&'static str, String)>, started: Instant) -> Response {
    let mut res = (status, Json(body)).into_response();
    let h = res.headers_mut();
    for (k, v) in headers.into_iter().chain([("x-response-time-ms", started.elapsed().as_millis().to_string())]) {
        if let Ok(v) = HeaderValue::from_str(&v) {
            h.insert(HeaderName::from_static(k), v);
        }
    }
    res
}

fn public(cache: &'static str) -> Vec<(&'static str, String)> {
    ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"].into_iter().map(|k| (k, cache.to_string())).collect()
}

pub async fn stats(State(state): State<AppState>, req: axum::extract::Request) -> Response {
    let started = Instant::now();
    let fail = |msg: String, extra: Vec<(&'static str, String)>| {
        tracing::error!(error = %msg, "failed to fetch GitHub stats");
        respond(StatusCode::INTERNAL_SERVER_ERROR, json!({ "success": false, "error": msg }), extra, started)
    };
    let config = match crate::pages::try_singleton(&state.db, "GitHub", false).await {
        Ok(c) => c,
        Err(e) => return fail(e.to_string(), vec![]),
    };
    let Some(username) = config["username"].as_str().filter(|u| !u.is_empty()).map(str::to_string) else {
        return respond(StatusCode::NOT_FOUND, json!({ "success": false, "error": "GitHub username not configured" }), vec![], started);
    };
    let key = format!("github:stats:{username}:{}", if truthy(&config["includePrivate"]) { "priv" } else { "pub" });
    let stale_key = format!("{key}:stale");
    let hit = |data: Value, cache: &'static str, k: &str, mode: &str, mut extra: Vec<(&'static str, String)>| {
        let mut h = public(cache);
        h.extend([("x-app-cache", mode.to_string()), ("x-app-cache-key", k.to_string()), ("x-github-cache-mode", mode.to_string())]);
        h.append(&mut extra);
        respond(StatusCode::OK, json!({ "success": true, "data": data }), h, started)
    };
    if let Some(data) = cache_get(&key) {
        return hit(data, PUBLIC_MEDIUM, &key, "memory-precheck", vec![]).tap_mode("hot");
    }

    let client = crate::limit::client_ip(&state, &req.into_parts().0);
    let (reservation, _slot) = crate::limit::reserve("public:github-stats", &client, SETTINGS.max_requests, SETTINGS.window, SETTINGS.max_concurrent);
    if !reservation.ok {
        if let Some(data) = cache_get(&stale_key) {
            return hit(data, PUBLIC_SHORT, &stale_key, "stale-overload", traffic_headers(&reservation));
        }
        let msg = if reservation.status == 429 {
            "Rate limit exceeded for GitHub stats. Please retry shortly."
        } else {
            "GitHub stats is temporarily overloaded. Please retry shortly."
        };
        let mut h = traffic_headers(&reservation);
        h.push(("cache-control", NO_STORE.to_string()));
        let status = StatusCode::from_u16(reservation.status).unwrap_or(StatusCode::SERVICE_UNAVAILABLE);
        return respond(status, json!({ "success": false, "error": msg }), h, started);
    }

    let trace: Trace = Mutex::new(vec![]);
    let (data, mode, used_key) = {
        let _refresh = REFRESH.lock().await;
        match cache_get(&key) {
            // Filled by the request that held the refresh lock.
            Some(d) => (d, "memory", key.clone()),
            None => match build(&state, &config, &username, &trace).await {
                Ok(d) => {
                    cache_set(&stale_key, &d, SETTINGS.stale_ttl);
                    cache_set(&key, &d, SETTINGS.cache_ttl);
                    (d, "miss", key.clone())
                }
                Err(msg) => match cache_get(&stale_key) {
                    Some(d) => (d, "stale-error", stale_key.clone()),
                    None => return fail(msg, traffic_headers(&reservation)),
                },
            },
        }
    };
    let timing = trace.lock().unwrap_or_else(|e| e.into_inner()).iter().map(|(l, d)| format!("{l};dur={d}")).collect::<Vec<_>>().join(", ");
    hit(data, PUBLIC_MEDIUM, &used_key, mode, vec![
        ("x-rate-limit-remaining", reservation.remaining.to_string()),
        ("x-route-active-requests", reservation.active.to_string()),
        ("x-github-breaker-state", breaker_state().to_string()),
        ("server-timing", timing),
    ])
}

/// The hot precheck reports `x-github-cache-mode: hot` while the debug source says `memory-precheck`.
trait TapMode {
    fn tap_mode(self, mode: &'static str) -> Self;
}

impl TapMode for Response {
    fn tap_mode(mut self, mode: &'static str) -> Self {
        self.headers_mut().insert("x-github-cache-mode", HeaderValue::from_static(mode));
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commit_count_follows_js_nullish_chain() {
        assert_eq!(push_commit_count(&json!({ "commits": [1, 2] })), Some(2));
        assert_eq!(push_commit_count(&json!({ "size": 3 })), Some(3));
        assert_eq!(push_commit_count(&json!({ "commits": null, "size": null, "distinct_size": null })), Some(0));
        assert_eq!(push_commit_count(&json!({ "before": "a" })), None);
    }

    #[test]
    fn event_series_covers_a_year() {
        let today = NaiveDate::from_ymd_opt(2026, 11, 24).unwrap();
        let (days, total) = series_from_events(&[json!({ "created_at": "2026-11-24T10:00:00Z" })], today);
        assert_eq!(days.first().unwrap()["date"], "2025-11-24");
        assert_eq!(days.last().unwrap()["count"], 1);
        assert_eq!(total, 1);
    }

    #[test]
    fn streak_counts_today_and_yesterday() {
        let now = "2026-11-24T12:00:00Z".parse::<chrono::DateTime<Utc>>().unwrap();
        let c = [json!({ "date": "2026-11-22", "count": 1 }), json!({ "date": "2026-11-23", "count": 2 }), json!({ "date": "2026-11-24", "count": 1 })];
        assert_eq!(streaks(&c, now), (2, 3));
    }
}
